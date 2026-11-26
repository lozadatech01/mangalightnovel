-- PA06-R2 departmental preparation. A candidate has no publication authority.
create function manga_analytics.engagement_export_candidate(p_month date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with manifest as (
    select revision, source_cutoff, expected_count
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
  where t.starts = m.expected_count and coalesce(t.revisions_match, true)
    and m.source_cutoff >= ((p_month + interval '1 month') at time zone 'Asia/Manila')
    and p_month >= (date_trunc('month', statement_timestamp() at time zone 'Asia/Manila') - interval '23 months')::date;
$$;
revoke all on function manga_analytics.engagement_export_candidate(date) from public, anon, authenticated;
