-- An independently verified delivery permission references the exact submitted edition revision
-- and a release identity assigned by the publication authority. Only that authority can open it.
create table supply_work.chapter_deliveries(
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null, revision integer not null,
 foreign key(item_id,revision) references supply_work.revisions,
 release_version_id text not null unique references manga_analytics.dim_release,
 submission_permission_ref text not null check(length(trim(submission_permission_ref))>0),
 expires_at timestamptz not null, revoked_at timestamptz,
 page_count integer not null check(page_count between 1 and 1000),
 listing_id uuid unique references customer_catalog.listings
);
create table supply_work.chapter_assets(
 delivery_id uuid not null references supply_work.chapter_deliveries,
 page_no integer not null check(page_no>0),
 body text check(length(trim(body)) between 1 and 50000),
 image_key text unique, checksum text not null check(checksum ~ '^[0-9a-f]{64}$'),
 primary key(delivery_id,page_no), check(num_nonnulls(body,image_key)=1)
);
alter table supply_work.chapter_deliveries enable row level security;
alter table supply_work.chapter_assets enable row level security;
revoke all on supply_work.chapter_deliveries,supply_work.chapter_assets from public,anon,authenticated,service_role;
grant select on supply_work.chapter_deliveries,supply_work.chapter_assets to service_role;
grant insert on supply_work.chapter_assets to service_role;

create function public.supplier_chapter_deliveries(p_actor uuid,p_item uuid)
returns table(id uuid, unit_position integer, kind text, page_count integer, received integer[])
language sql stable security invoker set search_path='' as $$
 select d.id,r.unit_position,r.content_kind,d.page_count,array(select a.page_no from supply_work.chapter_assets a where a.delivery_id=d.id order by a.page_no)
 from supply_work.chapter_deliveries d join supply_work.items i on i.id=d.item_id and i.head=d.revision
 join supply_work.revisions v on v.item_id=i.id and v.revision=i.head and v.state='submitted'
 join manga_analytics.dim_reading_unit_release r on r.release_version_id=d.release_version_id
 where i.owner_id=p_actor and i.supplier_role=supply_work.active_role(p_actor) and i.id=p_item
 and d.expires_at>now() and d.revoked_at is null and d.listing_id is null order by r.unit_position
$$;
create function public.supplier_stage_page(p_actor uuid,p_item uuid,p_delivery uuid,p_page integer,p_body text,p_image text,p_checksum text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare permit record;
begin
 if p_delivery is null or p_page is null or p_checksum is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_delivery::text,0));
 select * into permit from public.supplier_chapter_deliveries(p_actor,p_item) where id=p_delivery;
 if not found or p_page not between 1 and permit.page_count then return false; end if;
 if permit.kind='MANGA' and (p_image is null or p_image !~ ('^'||p_delivery||'/[a-f0-9-]{36}\.webp$')) then return false; end if;
 if permit.kind='LIGHT_NOVEL' and (p_body is null or p_checksum<>encode(sha256(convert_to(p_body,'UTF8')),'hex')) then return false; end if;
 insert into supply_work.chapter_assets values(p_delivery,p_page,p_body,p_image,p_checksum) on conflict(delivery_id,page_no) do nothing;
 return exists(select 1 from supply_work.chapter_assets where delivery_id=p_delivery and page_no=p_page and checksum=p_checksum and image_key is not distinct from p_image and body is not distinct from p_body);
end $$;
revoke all on function public.supplier_chapter_deliveries(uuid,uuid),public.supplier_stage_page(uuid,uuid,uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.supplier_chapter_deliveries(uuid,uuid),public.supplier_stage_page(uuid,uuid,uuid,integer,text,text,text) to service_role;

create view supply_work.chapter_manifests with(security_invoker=true) as
 select delivery_id,count(*) as pages,encode(sha256(convert_to(string_agg(page_no::text || ':' || checksum,E'\n' order by page_no),'UTF8')),'hex') as digest
 from supply_work.chapter_assets group by delivery_id;
-- Trusted handoff for a verified worldwide web publication. A restricted territory needs a separate verified delivery policy.
create function supply_work.publish_worldwide_chapter(p_delivery uuid,p_digest text,p_grant text,p_editorial text,p_publication text,p_from timestamptz,p_until timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare d supply_work.chapter_deliveries; r record; listing customer_catalog.listings;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_delivery::text,0));
 select * into strict d from supply_work.chapter_deliveries where id=p_delivery for update;
 if d.revoked_at is not null or d.expires_at<=now() then raise exception 'Delivery permission expired'; end if;
 select * into strict r from manga_analytics.dim_reading_unit_release where release_version_id=d.release_version_id;
 if not exists(select 1 from supply_work.chapter_manifests where delivery_id=d.id and pages=d.page_count and digest=p_digest)
 then raise exception 'Verified manifest does not match'; end if;
 if d.listing_id is not null then
 select * into strict listing from customer_catalog.listings where id=d.listing_id;
 if (listing.grant_ref,listing.editorial_ref,listing.publication_ref,listing.visible_from,listing.visible_until)
 is distinct from (p_grant,p_editorial,p_publication,p_from,p_until) then raise exception 'Conflicting publication'; end if;
 return d.listing_id;
 end if;
 if p_until is null or p_until<=now() or p_from is null or p_from>=p_until then raise exception 'Invalid grant window'; end if;
 perform 1 from supply_work.items i join supply_work.revisions v on i.id=v.item_id and i.head=v.revision
 where i.id=d.item_id and i.head=d.revision and v.state='submitted' and i.supplier_role=supply_work.active_role(i.owner_id)
 for share of i;
 if not found then raise exception 'Submitted version is no longer current'; end if;
 insert into customer_catalog.listings(source_key,title,work_key,content_kind,edition_language,unit_position,grant_ref,editorial_ref,publication_ref,visible_from,visible_until)
 values(r.release_version_id,r.title,r.work_id,case r.content_kind when 'MANGA' then 'Manga' else 'Light novel' end,r.language_code,r.unit_position,p_grant,p_editorial,p_publication,p_from,p_until) returning * into listing;
 insert into customer_catalog.chapter_pages select listing.id,r.release_version_id,a.page_no,d.page_count,a.body,a.image_key
 from supply_work.chapter_assets a where a.delivery_id=d.id;
 update supply_work.chapter_deliveries set listing_id=listing.id where id=d.id;
 return listing.id;
end $$;
revoke all on function supply_work.publish_worldwide_chapter(uuid,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated,service_role;
