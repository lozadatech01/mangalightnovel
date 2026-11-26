import { stagePage } from "./actions";
import { createAdminClient } from "@/lib/supabase/admin";
type Permit={id:string;unit_position:number;kind:string;page_count:number;received:number[]};
export default async function ChapterForms({reader,item}:{reader:string;item:string}) {
 const db=createAdminClient();
 const result=await db?.rpc("supplier_chapter_deliveries",{p_actor:reader,p_item:item});
 if(result?.error) return <p>Chapter delivery permissions are unavailable.</p>;
 return (result?.data as Permit[]??[]).map(p=>{
   const missing=Array.from({length:p.page_count},(_,i)=>i+1).filter(n=>!p.received.includes(n));
   return <section key={p.id} className="sr-card"><h3>Chapter {p.unit_position} pages</h3>
   <p>{p.received.length} of {p.page_count} received</p>
   {missing.length>0 && <form action={stagePage} className="sr-form">
   <input type="hidden" name="item" value={item}/><input type="hidden" name="delivery" value={p.id}/>
   <label>Page number<select name="page">{missing.map(n=><option key={n}>{n}</option>)}</select></label>
   {p.kind==="MANGA"?<label>Page image (PNG, JPEG or WebP, up to 768 KiB)<input type="file" name="image" required accept="image/png,image/jpeg,image/webp"/></label>:<label>Page text<textarea name="body" maxLength={50000} required/></label>}
   <button type="submit">Submit page</button></form>}</section>;
 });
}
