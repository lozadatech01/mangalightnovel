"use server";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { redirect } from "next/navigation";
import { requirePortal } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { optionalId } from "@/lib/portal/supply-model";
export async function stagePage(form:FormData) {
  const {user}=await requirePortal();
  const item=optionalId(form.get("item"));
  const delivery=optionalId(form.get("delivery"));
  const page=Number(form.get("page"));
  const db=createAdminClient();
  if(!item || !delivery || !db) redirect("/portal/supply");
  const back="/portal/supply?item="+item;
  const {data}=await db.rpc("supplier_chapter_deliveries",{p_actor:user.id,p_item:item});
  const permit=data?.find((p:{id:string})=>p.id===delivery);
  if(!permit || !Number.isInteger(page) || page<1 || page>permit.page_count || permit.received.includes(page)) redirect(back+"&asset=invalid");
  let body:string|null=null;
  let image:string|null=null;
  let bytes:Buffer;
  if(permit.kind==="MANGA"){
    const file=form.get("image");
    if(!(file instanceof File) || file.size===0 || file.size>768*1024) redirect(back+"&asset=invalid");
    try {
      const input=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:16000000,failOn:"warning"});
      const meta=await input.metadata();
      if(!["png","jpeg","webp"].includes(meta.format??"") || (meta.pages??1)>1) throw Error();
      bytes=await input.rotate().webp().toBuffer();
    } catch { redirect(back+"&asset=invalid"); }
    if(bytes.length>8*1024*1024) redirect(back+"&asset=invalid");
    image=delivery+"/"+randomUUID()+".webp";
    const stored=await db.storage.from("reading-pages").upload(image,bytes,{contentType:"image/webp",upsert:false});
    if(stored.error) redirect(back+"&asset=invalid");
  } else {
    const value=form.get("body");
    if(typeof value!=="string" || !value.trim() || value.length>50000) redirect(back+"&asset=invalid");
    body=value.trim(); bytes=Buffer.from(body);
  }
  const {data:ok,error}=await db.rpc("supplier_stage_page",{p_actor:user.id,p_item:item,p_delivery:delivery,p_page:page,p_body:body,p_image:image,p_checksum:createHash("sha256").update(bytes).digest("hex")});
  if(ok===false && image && !error) await db.storage.from("reading-pages").remove([image]);
  redirect(back+"&asset="+(ok===true?"saved":"invalid"));
}
