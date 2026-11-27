-- Keep a known exclusion effective for retained source evidence after account deletion.
alter table customer_catalog.excluded_readers drop constraint excluded_readers_reader_id_fkey;
alter table customer_catalog.excluded_readers add column reason text not null default 'internal' check(reason in ('test','bot','internal','ineligible'));
create index reading_attempts_reader_start on customer_catalog.reading_attempts(reader_id,started_at);

create or replace function manga_analytics.refresh_delivery_month(p_month date) returns boolean
language plpgsql security invoker set search_path = '' set timezone = 'UTC' as $$
declare
  month_begin timestamptz := p_month::timestamp at time zone 'Asia/Manila';
  month_end timestamptz := (p_month + interval '1 month') at time zone 'Asia/Manila';
  cutoff timestamptz := statement_timestamp();
  approval text;
  prior manga_analytics.reading_month_load;
  attempts jsonb;
  expected integer;
begin
  if month_begin > cutoff or month_begin < cutoff - interval '90 days' then
    return false;
  end if;
  select approval_ref into approval from manga_analytics.reading_source_coverage
  where month_start = p_month and enabled for share;
  if not found then return false; end if;
  perform pg_advisory_xact_lock(91924, p_month - date '2000-01-01');
  select * into prior from manga_analytics.reading_month_load where month_start = p_month
    order by revision desc limit 1;
  if found and prior.source_run_id not like 'local-delivery/%' then
    raise exception 'Existing month has a different source. Reconcile before switching.';
  end if;
  select count(*), coalesce(jsonb_agg(jsonb_build_object(
    'attempt_id', a.attempt_id, 'release_version_id', a.release_version_id,
    'reader_key', a.reader_id, 'started_at', a.started_at,
    'completed_at', case when a.completed_at < cutoff then a.completed_at end,
    'delivery_evidence_ref', 'delivery:' || a.attempt_id,
    'completion_evidence_ref', case when a.completed_at < cutoff then 'end:' || a.attempt_id end,
    'scope_code', 'SIGNED_IN_ELIGIBLE_V1', 'source_class', 'PRODUCTION'
  ) order by a.attempt_id), '[]'::jsonb)
  into expected, attempts from customer_catalog.reading_attempts a
  where a.started_at >= month_begin and a.started_at < least(cutoff, month_end)
    and not exists(select 1 from customer_catalog.excluded_readers x where x.reader_id=a.reader_id);
  if prior.source_cutoff >= month_end and prior.approved_manifest_ref = approval
     and prior.payload_digest = sha256(convert_to(attempts::text, 'UTF8')) then
    return false;
  end if;
  perform manga_analytics.replace_reading_month(p_month, coalesce(prior.revision, 0) + 1,
    'local-delivery/' || p_month || '/' || cutoff, cutoff, approval, expected, attempts);
  return true;
end;
$$;
-- PA06-R2 departmental preparation. A candidate has no publication authority.
create or replace function manga_analytics.engagement_export_candidate(p_month date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with manifest as (
    select revision, source_cutoff, expected_count, source_run_id, approved_manifest_ref
    from manga_analytics.reading_month_load
    where month_start = p_month
    order by revision desc limit 1
  ), partition_totals as (
    select coalesce(sum(w.starts), 0) as starts,
           bool_or(w.readers < 10) as needs_suppression,
           bool_and(w.load_revision = m.revision) as revisions_match
    from manga_analytics.reading_work_month w cross join manifest m
    where w.cohort_month = p_month
  )
  select jsonb_build_object(
    'dataset', 'manga_title_engagement_monthly', 'version', 1,
    'month', to_char(p_month,'YYYY-MM-DD'), 'revision', m.revision,
    'through_time', to_char(m.source_cutoff at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'coverage', case when t.needs_suppression then 'withheld'
                     when t.starts = 0 then 'no_data' else 'released' end,
    'rows', case when t.needs_suppression or t.starts = 0 then '[]'::jsonb
                 else (select jsonb_agg(jsonb_build_object(
                         'work_id', work_id, 'read_starts', starts,
                         'read_completions', completions, 'title_distinct_readers', readers
                       ) order by work_id collate "C")
                       from manga_analytics.reading_work_month where cohort_month = p_month) end)
  from manifest m cross join partition_totals t
  where (m.source_run_id not like 'local-delivery/%' or exists(select 1 from manga_analytics.reading_source_coverage c where c.month_start=p_month and c.enabled and c.approval_ref=m.approved_manifest_ref))
    and t.starts = m.expected_count and coalesce(t.revisions_match, true)
    and m.source_cutoff >= ((p_month + interval '1 month') at time zone 'Asia/Manila')
    and p_month >= (date_trunc('month', statement_timestamp() at time zone 'Asia/Manila') - interval '23 months')::date;
$$;
revoke all on function manga_analytics.engagement_export_candidate(date) from public, anon, authenticated;

create function manga_analytics.reconcile_excluded_reader() returns trigger
language plpgsql security invoker set search_path='' as $$
declare cohort date;
begin
  for cohort in select distinct date_trunc('month',a.started_at at time zone 'Asia/Manila')::date
    from customer_catalog.reading_attempts a where a.reader_id=new.reader_id order by 1
  loop
    if exists(select 1 from manga_analytics.reading_month_load
      where month_start=cohort and source_run_id like 'local-delivery/%') then
      if (cohort::timestamp at time zone 'Asia/Manila') >= statement_timestamp()-interval '90 days' then
        perform manga_analytics.refresh_delivery_month(cohort);
      else
        -- A partial raw cohort cannot reconstruct the verified distinct count.
        update manga_analytics.reading_source_coverage set enabled=false where month_start=cohort;
      end if;
    end if;
  end loop;
  return null;
end $$;
revoke all on function manga_analytics.reconcile_excluded_reader() from public,anon,authenticated,service_role;
create trigger reconcile_exclusion after insert on customer_catalog.excluded_readers
for each row execute function manga_analytics.reconcile_excluded_reader();
