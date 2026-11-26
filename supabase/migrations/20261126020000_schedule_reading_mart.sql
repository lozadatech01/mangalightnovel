-- Owner-recorded evidence that the local delivery source covers this whole
-- Manila cohort from its first day. Revocation stops subsequent refreshes.
create table manga_analytics.reading_source_coverage (
  month_start date primary key check (month_start = date_trunc('month', month_start::timestamp)::date),
  approval_ref text not null check (btrim(approval_ref) <> ''),
  enabled boolean not null default true
);
revoke all on manga_analytics.reading_source_coverage from public, anon, authenticated, service_role;

create function manga_analytics.refresh_delivery_month(p_month date) returns boolean
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
  where a.started_at >= month_begin and a.started_at < least(cutoff, month_end);
  if prior.source_cutoff >= month_end and prior.approved_manifest_ref = approval
     and prior.payload_digest = sha256(convert_to(attempts::text, 'UTF8')) then
    return false;
  end if;
  perform manga_analytics.replace_reading_month(p_month, coalesce(prior.revision, 0) + 1,
    'local-delivery/' || p_month || '/' || cutoff, cutoff, approval, expected, attempts);
  return true;
end;
$$;
revoke all on function manga_analytics.refresh_delivery_month(date) from public, anon, authenticated, service_role;

create function manga_analytics.expire_delivery_activity() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  perform manga_analytics.expire_reading_attempts();
  delete from customer_catalog.reading_attempts
  where started_at < statement_timestamp() - interval '90 days'
    and (retain_until is null or retain_until < statement_timestamp());
end;
$$;
revoke all on function manga_analytics.expire_delivery_activity() from public, anon, authenticated, service_role;

create extension if not exists pg_cron;
select cron.schedule('manga-reading-mart', '13 */6 * * *',
  $job$select manga_analytics.refresh_delivery_month(month_start)
       from manga_analytics.reading_source_coverage
       where enabled and month_start between
         ((statement_timestamp() - interval '90 days') at time zone 'Asia/Manila')::date
         and (statement_timestamp() at time zone 'Asia/Manila')::date
       order by month_start$job$);
select cron.schedule('manga-reading-raw-expiry', '44 17 * * *',
  $job$select manga_analytics.expire_delivery_activity()$job$);
