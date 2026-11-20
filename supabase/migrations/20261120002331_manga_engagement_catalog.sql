-- Catalog filters come from verified release dimensions, independently of the date window and reading data.
create function public.manga_title_engagement_catalog() returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with published_works as (
    select distinct w.work_id, w.title, w.content_kind,
      coalesce('publisher:' || w.publisher_id, 'unattributed') as scope,
      coalesce(w.publisher_name, 'No verified publisher') as publisher_name
    from manga_analytics.dim_reading_unit_release w
  ), publishers as (
    select distinct scope as id, publisher_name as label from published_works
  ), titles as (
    select work_id as id, title as label, content_kind as kind,
      array_agg(scope order by scope) as scopes
    from published_works
    group by work_id, title, content_kind
  )
  select jsonb_build_object(
    'publishers', coalesce((select jsonb_agg(to_jsonb(p) order by p.label, p.id) from publishers p), '[]'::jsonb),
    'titles', coalesce((select jsonb_agg(to_jsonb(t) order by t.label, t.id) from titles t), '[]'::jsonb)
  )
$$;

revoke all on function public.manga_title_engagement_catalog() from public, anon, authenticated;
grant execute on function public.manga_title_engagement_catalog() to service_role;
