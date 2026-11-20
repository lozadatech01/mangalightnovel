-- Drill publisher → work → edition-specific chapter on the same reading facts.
create function public.manga_title_engagement_hierarchy(
  p_from date, p_to date, p_level text, p_breakdown text, p_kind text, p_publisher_scope text, p_work text, p_page integer
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
    or p_breakdown is null or p_breakdown not in ('kind', 'title', 'publisher', 'chapter')
    or (p_kind is not null and p_kind not in ('MANGA', 'LIGHT_NOVEL'))
    or (p_publisher_scope is not null and p_publisher_scope <> 'unattributed'
      and (left(p_publisher_scope, 10) <> 'publisher:' or length(p_publisher_scope) not between 11 and 170))
    or (p_work is not null and length(p_work) not between 1 and 160)
    or (p_breakdown = 'chapter' and p_work is null)
    or p_page is null or p_page not between 1 and 100000 then
    raise exception 'Invalid Manga engagement cube filters';
  end if;

  return (
    with months as (
      select d::date as month_start, date_trunc(p_level, d)::date as bucket
      from generate_series(p_from::timestamp, p_to - interval '1 month', interval '1 month') d
    ), scoped_releases as (
      select r.*,
        coalesce('publisher:' || r.publisher_id, 'unattributed') as publisher_scope
      from manga_analytics.dim_reading_unit_release r
      where (p_kind is null or r.content_kind = p_kind)
        and (p_work is null or r.work_id = p_work)
        and (p_publisher_scope is null
          or coalesce('publisher:' || r.publisher_id, 'unattributed') = p_publisher_scope)
    ), coverage as (
      select m.*, c.revision, c.source_cutoff
      from months m
      left join manga_analytics.reading_month_coverage c on c.month_start = m.month_start
        and (m.month_start = current_month
          or c.source_cutoff >= ((m.month_start + interval '1 month') at time zone 'Asia/Manila'))
        and ((p_publisher_scope is null and p_work is null) or exists (select 1 from scoped_releases))
    ), buckets as (
      select bucket, count(source_cutoff) = count(*) as available, min(source_cutoff) as oldest_cutoff
      from coverage group by grouping sets ((bucket), ())
    ), release_members as (
      select r.release_version_id,
        case p_breakdown
          when 'publisher' then r.publisher_scope
          when 'title' then r.work_id
          when 'chapter' then r.reading_unit_id
          else r.content_kind end as member_id,
        case p_breakdown
          when 'publisher' then coalesce(r.publisher_name, 'No verified publisher')
          when 'title' then r.title
          when 'chapter' then 'Chapter ' || r.unit_position ||
            case when r.edition_count > 1
              then ' · ' || r.language_code || ' / ' || r.format_code else '' end
          else case r.content_kind when 'MANGA' then 'Manga' else 'Light novel' end end as label,
        case when p_breakdown = 'chapter' then r.unit_position else 0 end as sort_position
      from (
        select sr.*, c.edition_count
        from scoped_releases sr
        join (
          select unit_position, count(distinct reading_unit_id) as edition_count
          from scoped_releases group by unit_position
        ) c using (unit_position)
      ) r
    ), releases as (
      select c.bucket, f.cohort_month, f.release_version_id, f.starts, f.completions, r.member_id
      from coverage c
      join manga_analytics.reading_release_month f on f.cohort_month = c.month_start and f.load_revision = c.revision
      join release_members r using (release_version_id)
      where c.source_cutoff is not null
    ), members as (
      select distinct member_id, label, sort_position from release_members where p_breakdown <> 'kind'
      union all select v.id, v.label, 0
      from (values ('MANGA', 'Manga'), ('LIGHT_NOVEL', 'Light novel')) v(id, label)
      where p_breakdown = 'kind' and (p_kind is null or p_kind = v.id)
    ), visible_members as (
      select member_id, label, sort_position from members
      order by sort_position, label, member_id limit 12 offset (p_page - 1) * 12
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
      'members', coalesce((select jsonb_agg(to_jsonb(m) order by sort_position, label, member_id) from visible_members m), '[]'::jsonb),
      'memberCount', (select count(*) from members),
      'publisherLabel', (select coalesce(r.publisher_name, 'No verified publisher')
        from scoped_releases r where r.publisher_scope = p_publisher_scope limit 1),
      'titleLabel', (select r.title from scoped_releases r where r.work_id = p_work limit 1),
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
          and p_publisher_scope is null and wm.cohort_month = b.bucket and wm.work_id = m.member_id
        where b.available
      ), '[]'::jsonb)
    )
  );
end;
$$;
revoke all on function public.manga_title_engagement_hierarchy(date, date, text, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.manga_title_engagement_hierarchy(date, date, text, text, text, text, text, integer)
  to service_role;


-- The original flat report contract remains available during the app rollout.
create or replace function public.manga_title_engagement_cube(
  p_from date, p_to date, p_level text, p_breakdown text, p_kind text, p_publisher text, p_page integer
) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select public.manga_title_engagement_hierarchy(p_from, p_to, p_level, p_breakdown, p_kind,
    'publisher:' || p_publisher, null, p_page)
$$;
