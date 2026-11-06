import { signIn } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
const messages: Record<string,string>={invalid:"Invalid account or password.",unauthorized:"Your account is not approved for the editorial desk.",configuration:"Login is not yet configured."};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const params=await searchParams;
 if(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(user?.email_confirmed_at){const {data:r}=await supabase.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();if(r?.role==="dept_admin")redirect("/admin")}
 }
 const error=params.error?messages[params.error]??messages.invalid:null;
 return <main className="mn-book"><aside className="mn-spine">LOXADA INK <span>VOL.01</span></aside><div className="mn-pages"><header className="mn-mast"><small>MANGA & LIGHT NOVEL</small><b>LOXADA<span>.</span>INK</b><small>EDITORIAL ISSUE 001</small></header><div className="mn-cover"><div className="mn-number"><span>CHAPTER</span><strong>01</strong><small>BEGINNING</small></div><div className="mn-art"><div className="mn-rays"/><small>THE STORIES START HERE</small><h1>OPEN<br/>THE<br/><em>PAGE.</em></h1><span className="mn-star">✦</span></div></div><div className="mn-strip">STAFF EDITION / PRIVATE READING ROOM <span>PAGE 01</span></div><section className="mn-editor"><div className="mn-note"><small>✎ A NOTE FROM THE EDITOR</small><h2>Every page has<br/>a beginning.</h2><p>This chapter is reserved for approved Manga and Light Novel administrators.</p></div><div className="mn-bubble"><h3>Sign in ↘</h3>{error && <p className="mn-error" role="alert">{error}</p>}<form action={signIn}><label htmlFor="identity">01 · EMAIL OR USERNAME</label><input name="email" id="identity" type="text" required autoComplete="username" placeholder="admin"/><label htmlFor="pass">02 · PASSWORD</label><input name="password" id="pass" type="password" required autoComplete="current-password"/><button type="submit">TURN THE PAGE →</button></form></div></section><footer className="mn-foot">LOXADA EDITORIAL <span>VOL.01 / STAFF</span></footer></div></main>;
}