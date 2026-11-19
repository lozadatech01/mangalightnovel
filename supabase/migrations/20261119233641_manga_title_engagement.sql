-- Private Manga mart. Source evidence and release dimensions are written only by a trusted loader.
create schema manga_analytics;
revoke all on schema manga_analytics from public, anon, authenticated;
grant usage on schema manga_analytics to service_role;

create table manga_analytics.dim_work (
  work_id text primary key check (length(work_id) between 1 and 160),
  title text not null check (length(btrim(title)) between 1 and 300),
  content_kind text not null check (content_kind in ('MANGA', 'LIGHT_NOVEL'))
);

create table manga_analytics.dim_edition (
  edition_id text primary key check (length(edition_id) between 1 and 160),
  work_id text not null references manga_analytics.dim_work,
  language_code text not null check (btrim(language_code) <> ''),
  format_code text not null check (btrim(format_code) <> '')
);

create table manga_analytics.dim_reading_unit (
  reading_unit_id text primary key check (length(reading_unit_id) between 1 and 160),
  edition_id text not null references manga_analytics.dim_edition,
  unit_position integer not null check (unit_position > 0),
  unique (edition_id, unit_position)
);

create table manga_analytics.dim_publisher (
  publisher_id text primary key check (length(publisher_id) between 1 and 160),
  display_name text not null check (length(btrim(display_name)) between 1 and 300)
);

create table manga_analytics.dim_release (
  release_version_id text primary key check (length(release_version_id) between 1 and 160),
  reading_unit_id text not null references manga_analytics.dim_reading_unit,
  publisher_id text references manga_analytics.dim_publisher,
  publisher_evidence_ref text check (btrim(publisher_evidence_ref) <> ''),
  check ((publisher_id is null) = (publisher_evidence_ref is null))
);

create table manga_analytics.dim_start_date (
  start_day date primary key,
  month_start date generated always as (date_trunc('month', start_day::timestamp)::date) stored,
  quarter_start date generated always as (date_trunc('quarter', start_day::timestamp)::date) stored,
  year_start date generated always as (date_trunc('year', start_day::timestamp)::date) stored
);

create table manga_analytics.dim_reader_scope (
  scope_code text primary key
);
insert into manga_analytics.dim_reader_scope values ('SIGNED_IN_ELIGIBLE_V1');

-- The flattened star dimension reuses the same keys as the normalized release hierarchy.
create view manga_analytics.dim_reading_unit_release with (security_invoker = true) as
select r.release_version_id, u.reading_unit_id, u.unit_position,
  e.edition_id, e.language_code, e.format_code, w.work_id, w.title, w.content_kind,
  p.publisher_id, p.display_name as publisher_name
from manga_analytics.dim_release r
join manga_analytics.dim_reading_unit u using (reading_unit_id)
join manga_analytics.dim_edition e using (edition_id)
join manga_analytics.dim_work w using (work_id)
left join manga_analytics.dim_publisher p using (publisher_id);

create table manga_analytics.reading_month_load (
  month_start date not null check (month_start = date_trunc('month', month_start::timestamp)::date),
  revision integer not null check (revision > 0),
  source_run_id text not null check (btrim(source_run_id) <> ''),
  source_cutoff timestamptz not null,
  approved_manifest_ref text not null check (btrim(approved_manifest_ref) <> ''),
  expected_count integer not null check (expected_count >= 0),
  payload_digest bytea not null,
  loaded_at timestamptz not null default statement_timestamp(),
  primary key (month_start, revision)
);

create table manga_analytics.fact_reading_attempt (
  attempt_id text primary key check (length(attempt_id) between 1 and 160),
  release_version_id text not null references manga_analytics.dim_release,
  start_day date not null references manga_analytics.dim_start_date,
  cohort_month date not null,
  load_revision integer not null,
  scope_code text not null default 'SIGNED_IN_ELIGIBLE_V1' references manga_analytics.dim_reader_scope,
  -- A stable account key from the authorized local source, never returned by the RPC.
  reader_key text not null check (length(btrim(reader_key)) between 1 and 160),
  started_at timestamptz not null,
  completed_at timestamptz,
  delivery_evidence_ref text not null check (btrim(delivery_evidence_ref) <> ''),
  completion_evidence_ref text check (btrim(completion_evidence_ref) <> ''),
  foreign key (cohort_month, load_revision) references manga_analytics.reading_month_load,
  check (scope_code = 'SIGNED_IN_ELIGIBLE_V1'),
  check (start_day = (started_at at time zone 'Asia/Manila')::date),
  check (cohort_month = date_trunc('month', start_day::timestamp)::date),
  check (completed_at is null or completed_at >= started_at),
  check ((completed_at is null) = (completion_evidence_ref is null))
);

create index on manga_analytics.dim_edition (work_id);
create index on manga_analytics.dim_release (reading_unit_id);
create index on manga_analytics.dim_release (publisher_id) where publisher_id is not null;
create index on manga_analytics.fact_reading_attempt (cohort_month, release_version_id);

-- Aggregate positions survive the raw-attempt retention window.
create table manga_analytics.reading_release_month (
  cohort_month date not null,
  load_revision integer not null,
  release_version_id text not null references manga_analytics.dim_release,
  starts bigint not null,
  completions bigint not null,
  primary key (cohort_month, release_version_id),
  foreign key (cohort_month, load_revision) references manga_analytics.reading_month_load,
  check (starts > 0 and completions between 0 and starts)
);

create table manga_analytics.reading_work_month (
  cohort_month date not null,
  load_revision integer not null,
  work_id text not null references manga_analytics.dim_work,
  starts bigint not null,
  completions bigint not null,
  readers bigint not null,
  primary key (cohort_month, work_id),
  foreign key (cohort_month, load_revision) references manga_analytics.reading_month_load,
  check (starts > 0 and completions between 0 and starts and readers between 1 and starts)
);

-- Only the trusted warehouse operator can attest a complete source snapshot and replace it.
-- Duplicate attempt keys, missing evidence, or a failed count check roll back the whole load.
create function manga_analytics.replace_reading_month(
  p_month date, p_revision integer, p_source_run_id text, p_source_cutoff timestamptz,
  p_approved_manifest_ref text, p_expected_count integer, p_attempts jsonb
) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  previous manga_analytics.reading_month_load;
  payload bytea;
  inserted_count integer;
begin
  if p_month is null or p_month <> date_trunc('month', p_month::timestamp)::date
    or p_revision is null or p_revision < 1 or p_source_cutoff is null
    or p_source_cutoff <= (p_month::timestamp at time zone 'Asia/Manila')
    or p_source_cutoff > statement_timestamp()
    or p_expected_count is null or p_expected_count < 0
    or jsonb_typeof(p_attempts) is distinct from 'array' then
    raise exception 'Invalid Manga reading snapshot';
  end if;
  if jsonb_array_length(p_attempts) <> p_expected_count then
    raise exception 'Manga snapshot does not match its approved source count';
  end if;
  payload := sha256(convert_to(p_attempts::text, 'UTF8'));
  perform pg_advisory_xact_lock(91924, p_month - date '2000-01-01');

  select * into previous from manga_analytics.reading_month_load
  where month_start = p_month order by revision desc limit 1;
  if found then
    if p_revision = previous.revision and p_source_run_id = previous.source_run_id
      and p_source_cutoff = previous.source_cutoff and p_approved_manifest_ref = previous.approved_manifest_ref
      and p_expected_count = previous.expected_count and payload = previous.payload_digest then
      return;
    end if;
    if p_revision <= previous.revision or p_source_cutoff < previous.source_cutoff then
      raise exception 'Stale or conflicting Manga snapshot';
    end if;
  end if;

  insert into manga_analytics.dim_start_date (start_day)
  select day::date from generate_series(p_month::timestamp, p_month + interval '1 month - 1 day', interval '1 day') day
  on conflict do nothing;

  insert into manga_analytics.reading_month_load
    (month_start, revision, source_run_id, source_cutoff, approved_manifest_ref, expected_count, payload_digest)
  values (p_month, p_revision, p_source_run_id, p_source_cutoff, p_approved_manifest_ref, p_expected_count, payload);

  delete from manga_analytics.fact_reading_attempt where cohort_month = p_month;
  insert into manga_analytics.fact_reading_attempt
    (attempt_id, release_version_id, start_day, cohort_month, load_revision, reader_key, started_at, completed_at,
     delivery_evidence_ref, completion_evidence_ref)
  select attempt_id, release_version_id, (started_at at time zone 'Asia/Manila')::date,
    p_month, p_revision, reader_key, started_at, completed_at, delivery_evidence_ref, completion_evidence_ref
  from jsonb_to_recordset(p_attempts) as a (
    attempt_id text, release_version_id text, reader_key text, started_at timestamptz,
    completed_at timestamptz, delivery_evidence_ref text, completion_evidence_ref text,
    scope_code text, source_class text
  )
  where started_at < p_source_cutoff and (completed_at is null or completed_at < p_source_cutoff)
    and started_at >= statement_timestamp() - interval '90 days'
    and scope_code = 'SIGNED_IN_ELIGIBLE_V1' and source_class = 'PRODUCTION';

  get diagnostics inserted_count = row_count;
  if inserted_count <> p_expected_count then
    raise exception 'Manga snapshot contains unverified or out-of-cutoff attempts';
  end if;

  delete from manga_analytics.reading_release_month where cohort_month = p_month;
  insert into manga_analytics.reading_release_month
  select p_month, p_revision, release_version_id, count(*), count(completed_at)
  from manga_analytics.fact_reading_attempt
  where cohort_month = p_month group by release_version_id;

  delete from manga_analytics.reading_work_month where cohort_month = p_month;
  insert into manga_analytics.reading_work_month
  select p_month, p_revision, r.work_id, count(*), count(f.completed_at), count(distinct f.reader_key)
  from manga_analytics.fact_reading_attempt f
  join manga_analytics.dim_reading_unit_release r using (release_version_id)
  where f.cohort_month = p_month group by r.work_id;
end;
$$;

-- Run from the authorized loader's scheduled retention workflow, with holds
-- handled in the source evidence store. The report also excludes expired raw rows.
create function manga_analytics.expire_reading_attempts() returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from manga_analytics.fact_reading_attempt where started_at < statement_timestamp() - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create view manga_analytics.reading_month_coverage with (security_invoker = true) as
select distinct on (month_start) month_start, revision, source_cutoff
from manga_analytics.reading_month_load
order by month_start, revision desc;

-- Work × Manila start month × scope, as defined in R2. Absent rows in covered months
-- can be read as zero. An absent coverage row never authorizes zero.
create view manga_analytics.manga_title_engagement_monthly with (security_invoker = true) as
select f.work_id as manga_work_id, f.cohort_month as calendar_month, 'SIGNED_IN_ELIGIBLE_V1'::text as reader_scope,
  f.starts as read_starts, f.completions as read_completions, f.readers as title_distinct_readers,
  f.completions::numeric / f.starts as completion_rate
from manga_analytics.reading_work_month f
join manga_analytics.reading_month_coverage c on c.month_start = f.cohort_month and c.revision = f.load_revision
where c.source_cutoff >= ((c.month_start + interval '1 month') at time zone 'Asia/Manila')
   or c.month_start = date_trunc('month', statement_timestamp() at time zone 'Asia/Manila')::date;

revoke all on all tables in schema manga_analytics from public, anon, authenticated, service_role;
grant select on all tables in schema manga_analytics to service_role;
revoke all on function manga_analytics.replace_reading_month(date, integer, text, timestamptz, text, integer, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function manga_analytics.expire_reading_attempts()
  from public, anon, authenticated, service_role;

-- Grouping sets compute exact distinct accounts at each subtotal and the grand total.
-- The UI can transpose these result cells without running a different aggregation.
create function public.manga_title_engagement_cube(
  p_from date, p_to date, p_level text, p_breakdown text, p_kind text, p_publisher text, p_page integer
) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  current_month date := date_trunc('month', statement_timestamp() at time zone 'Asia/Manila')::date;
begin
  if p_from is null or p_to is null
    or p_from <> date_trunc('month', p_from::timestamp)::date
    or p_to <> date_trunc('month', p_to::timestamp)::date
    or p_from >= p_to or p_to > p_from + interval '1 year' or p_to > current_month + interval '1 month'
    or p_level is null or p_level not in ('year', 'quarter', 'month')
    or p_breakdown is null or p_breakdown not in ('kind', 'title', 'publisher')
    or (p_kind is not null and p_kind not in ('MANGA', 'LIGHT_NOVEL'))
    or length(p_publisher) > 160 or p_page is null or p_page not between 1 and 100000 then
    raise exception 'Invalid Manga engagement cube filters';
  end if;

  return (
    with months as (
      select d::date as month_start, date_trunc(p_level, d)::date as bucket
      from generate_series(p_from::timestamp, p_to - interval '1 month', interval '1 month') d
    ), coverage as (
      select m.*, c.revision, c.source_cutoff
      from months m
      left join manga_analytics.reading_month_coverage c on c.month_start = m.month_start
        and (m.month_start = current_month
          or c.source_cutoff >= ((m.month_start + interval '1 month') at time zone 'Asia/Manila'))
        and (p_publisher is null or exists (
          select 1 from manga_analytics.dim_release r where r.publisher_id = p_publisher
        ))
    ), buckets as (
      select bucket, count(source_cutoff) = count(*) as available, min(source_cutoff) as oldest_cutoff
      from coverage group by grouping sets ((bucket), ())
    ), releases as (
      select c.bucket, f.cohort_month, f.release_version_id, f.starts, f.completions,
        case p_breakdown when 'title' then r.work_id
          when 'publisher' then coalesce('publisher:' || r.publisher_id, 'unattributed')
          else r.content_kind end as member_id,
        case p_breakdown when 'title' then r.title
          when 'publisher' then coalesce(r.publisher_name, 'No verified publisher')
          when 'kind' then case r.content_kind when 'MANGA' then 'Manga' else 'Light novel' end end as label
      from coverage c
      join manga_analytics.reading_release_month f on f.cohort_month = c.month_start and f.load_revision = c.revision
      join manga_analytics.dim_reading_unit_release r using (release_version_id)
      where c.source_cutoff is not null
        and (p_kind is null or r.content_kind = p_kind)
        and (p_publisher is null or r.publisher_id = p_publisher)
    ), members as (
      select distinct member_id, label from releases where p_breakdown <> 'kind'
      union all select v.id, v.label
      from (values ('MANGA', 'Manga'), ('LIGHT_NOVEL', 'Light novel')) v(id, label)
      where p_breakdown = 'kind' and (p_kind is null or p_kind = v.id)
    ), visible_members as (
      select member_id, label from members order by label, member_id limit 12 offset (p_page - 1) * 12
    ), counts as (
      select bucket, member_id, sum(starts) as starts, sum(completions) as completions
      from releases group by grouping sets ((bucket, member_id), (bucket), (member_id), ())
    ), reader_counts as (
      select r.bucket, r.member_id, count(*) as raw_starts, count(distinct f.reader_key) as readers
      from releases r
      join manga_analytics.fact_reading_attempt f using (cohort_month, release_version_id)
      where f.started_at >= statement_timestamp() - interval '90 days'
      group by grouping sets ((r.bucket, r.member_id), (r.bucket), (r.member_id), ())
    )
    select jsonb_build_object(
      'buckets', (select jsonb_agg(to_jsonb(b) order by bucket nulls last) from buckets b),
      'members', coalesce((select jsonb_agg(to_jsonb(m) order by label, member_id) from visible_members m), '[]'::jsonb),
      'memberCount', (select count(*) from members),
      'publishers', coalesce((
        select jsonb_agg(jsonb_build_object('id', p.publisher_id, 'label', p.display_name) order by p.display_name, p.publisher_id)
        from manga_analytics.dim_publisher p
        where exists (select 1 from manga_analytics.dim_release r where r.publisher_id = p.publisher_id)
      ), '[]'::jsonb),
      'cells', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket', b.bucket, 'memberId', m.member_id, 'starts', coalesce(n.starts, 0),
          'completions', coalesce(n.completions, 0),
          'readers', case
            when coalesce(n.starts, 0) = coalesce(rc.raw_starts, 0) then coalesce(rc.readers, 0)
            else wm.readers end
        ))
        from buckets b cross join (select member_id from visible_members union all select null) m
        left join counts n on n.bucket is not distinct from b.bucket and n.member_id is not distinct from m.member_id
        left join reader_counts rc on rc.bucket is not distinct from b.bucket and rc.member_id is not distinct from m.member_id
        left join manga_analytics.reading_work_month wm on p_level = 'month' and p_breakdown = 'title'
          and p_publisher is null and wm.cohort_month = b.bucket and wm.work_id = m.member_id
        where b.available
      ), '[]'::jsonb)
    )
  );
end;
$$;
revoke all on function public.manga_title_engagement_cube(date, date, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.manga_title_engagement_cube(date, date, text, text, text, text, integer)
  to service_role;
