"use server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requirePortal } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
function receipt(reader: string, listing: string, attempt: string, page: number, release: string, issued: number) {
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY!).update(JSON.stringify(["chapter-page-v1",reader,listing,attempt,page,release,issued])).digest("hex");
}
export async function deliver(listing: string, attempt: string, page: number) {
  const {user} = await requirePortal();
  if (!uuid.test(listing) || !uuid.test(attempt) || !Number.isSafeInteger(page) || page<1) return null;
  const db=createAdminClient();
  if (!db) return null;
  const {data,error}=await db.rpc("reader_page",{p_actor:user.id,p_listing:listing,p_page:page}).maybeSingle<{release_id:string;body:string|null;image_key:string|null;page_count:number}>();
  if (!data || error) return null;
  let image:string|null=null;
  if (data.image_key) {
    const result=await db.storage.from("reading-pages").download(data.image_key);
    if (!result.data || result.error || result.data.size>8*1024*1024) return null;
    const type=data.image_key.endsWith(".png")?"png":data.image_key.endsWith(".webp")?"webp":"jpeg";
    image="data:image/"+type+";base64,"+Buffer.from(await result.data.arrayBuffer()).toString("base64");
  }
  const issued=Date.now();
  return {issued,body:data.body,image,total:data.page_count,release:data.release_id,token:receipt(user.id,listing,attempt,page,data.release_id,issued)};
}
export async function acknowledge(listing:string,attempt:string,page:number,release:string,token:string,issued:number,end:boolean) {
  const {user}=await requirePortal();
  const db=createAdminClient();
  if (!db || !Number.isSafeInteger(issued) || issued>Date.now() || Date.now()-issued>86400000 || !/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token),Buffer.from(receipt(user.id,listing,attempt,page,release,issued)))) return false;
  const {data,error}=await db.rpc("reader_ack",{p_actor:user.id,p_listing:listing,p_attempt:attempt,p_page:page,p_release:release,p_end:end});
  return data===true && !error;
}
