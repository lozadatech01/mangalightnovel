-- Customer projections receive only approved department evidence through a trusted source.
create schema customer_catalog;
revoke all on schema customer_catalog from public, anon, authenticated;
grant usage on schema customer_catalog to service_role;

create table customer_catalog.listings (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique check (length(btrim(source_key)) between 1 and 160),
  title text not null check (length(btrim(title)) between 1 and 180),
  work_key text not null check (length(btrim(work_key)) between 1 and 160),
  content_kind text not null check (content_kind in ('Manga','Light novel')),
  edition_language text not null check (length(btrim(edition_language)) between 1 and 48),
  unit_position integer not null check (unit_position > 0),
  grant_ref text not null check (btrim(grant_ref) <> ''),
  editorial_ref text not null check (btrim(editorial_ref) <> ''),
  publication_ref text not null check (btrim(publication_ref) <> ''),
  visible_from timestamptz not null,
  visible_until timestamptz,
  withdrawn_at timestamptz,
  check (visible_until is null or visible_until > visible_from)
);
alter table customer_catalog.listings enable row level security;

revoke all on all tables in schema customer_catalog from public, anon, authenticated, service_role;
grant select on all tables in schema customer_catalog to service_role;

create function public.department_customer_catalog(p_actor uuid, p_query text, p_page integer) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'label', content_kind || ' · ' || edition_language || ' · Chapter ' || unit_position) order by title, id)
    from (
      select * from customer_catalog.listings
      where visible_from <= statement_timestamp()
        and (visible_until is null or visible_until > statement_timestamp())
        and (withdrawn_at is null or withdrawn_at > statement_timestamp())

        and (coalesce(btrim(p_query),'') = '' or strpos(lower(title),lower(btrim(p_query))) > 0)
      order by title,id limit 25 offset ((p_page - 1) * 24)
    ) page
  ), '[]'::jsonb), 'access', 'null'::jsonb)
  where p_page between 1 and 100000 and length(coalesce(p_query,'')) <= 100
    and exists (select 1 from public.portal_accounts a where a.user_id = p_actor
      and a.account_type = 'reader' and a.status = 'active')
    and not exists (select 1 from public.staff_roles s where s.user_id = p_actor)
$$;
revoke all on function public.department_customer_catalog(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.department_customer_catalog(uuid,text,integer) to service_role;
