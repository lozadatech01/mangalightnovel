-- Exact, catalog-authorized releases. Protected objects may only be uploaded by trusted ingestion.
insert into storage.buckets(id,name,public) values('reading-pages','reading-pages',false);
create table customer_catalog.chapter_pages(
 listing_id uuid not null references customer_catalog.listings,
 release_version_id text not null references manga_analytics.dim_release,
 page_no integer not null check(page_no>0),
 page_count integer not null check(page_count>=page_no),
 body text check(length(btrim(body)) between 1 and 50000),
 image_key text check(image_key ~ '^[a-zA-Z0-9_/-]+\.(png|jpg|webp)$'),
 primary key(listing_id,page_no),
 check(num_nonnulls(body,image_key)=1)
);
create table customer_catalog.excluded_readers(reader_id uuid primary key references auth.users on delete cascade);
create table customer_catalog.reading_attempts(
 attempt_id uuid primary key, reader_id uuid not null, release_version_id text not null references manga_analytics.dim_release,
 started_at timestamptz not null default statement_timestamp(), completed_at timestamptz,
 last_page integer not null, retain_until timestamptz,
 check(completed_at is null or completed_at >= started_at)
);
create index on customer_catalog.reading_attempts(started_at);
alter table customer_catalog.chapter_pages enable row level security;
alter table customer_catalog.excluded_readers enable row level security;
alter table customer_catalog.reading_attempts enable row level security;
revoke all on customer_catalog.chapter_pages, customer_catalog.excluded_readers, customer_catalog.reading_attempts from public,anon,authenticated,service_role;
grant select on customer_catalog.chapter_pages,customer_catalog.excluded_readers,customer_catalog.reading_attempts to service_role;
grant insert,update on customer_catalog.reading_attempts to service_role;

create function public.reader_page(p_actor uuid,p_listing uuid,p_page integer)
returns table(release_id text,body text,image_key text,page_count integer)
language sql stable security invoker set search_path='' as $$
 select p.release_version_id,p.body,p.image_key,p.page_count
 from customer_catalog.chapter_pages p
 join customer_catalog.listings l on l.id=p.listing_id and l.source_key=p.release_version_id
 join manga_analytics.dim_reading_unit_release r on r.release_version_id=p.release_version_id
 where l.id=p_listing and p.page_no=p_page and l.work_key=r.work_id and l.unit_position=r.unit_position
 and l.visible_from<=now() and (l.visible_until is null or l.visible_until>now()) and (l.withdrawn_at is null or l.withdrawn_at>now())
 and exists(select 1 from public.portal_accounts a where a.user_id=p_actor and a.account_type='reader' and a.status='active')
 and not exists(select 1 from public.staff_roles s where s.user_id=p_actor)
 and (select count(*) from customer_catalog.chapter_pages x where x.listing_id=l.id and x.release_version_id=p.release_version_id and x.page_count=p.page_count) = p.page_count
$$;
-- Invoked only after the server verifies a receipt issued with a delivered page.
create function public.reader_ack(p_actor uuid,p_listing uuid,p_attempt uuid,p_page integer,p_release text,p_end boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare total integer;
begin
 select page_count into total from public.reader_page(p_actor,p_listing,p_page) where release_id=p_release;
 if total is null or (p_end and p_page<>total) then return false; end if;
 if exists(select 1 from customer_catalog.excluded_readers where reader_id=p_actor) then return true; end if;
 if p_page=1 then
 insert into customer_catalog.reading_attempts(attempt_id,reader_id,release_version_id,last_page)
 values(p_attempt,p_actor,p_release,1) on conflict do nothing;
 end if;
 update customer_catalog.reading_attempts set last_page=greatest(last_page,p_page),
 completed_at=case when p_end then coalesce(completed_at,statement_timestamp()) else completed_at end
 where attempt_id=p_attempt and reader_id=p_actor and release_version_id=p_release and last_page>=p_page-1;
 return found;
end $$;
revoke all on function public.reader_page(uuid,uuid,integer), public.reader_ack(uuid,uuid,uuid,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.reader_page(uuid,uuid,integer), public.reader_ack(uuid,uuid,uuid,integer,text,boolean) to service_role;
