import { signIn } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PasswordField from "./password-field";
const messages:Record<string,string>={invalid:"Incorrect email or password.",unauthorized:"This account is not approved for Manga & Light Novel.",configuration:"Login is not configured."};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const params = await searchParams;
  if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient(); const {data:{user}} = await supabase.auth.getUser();
    if(user?.email_confirmed_at){const {data:staff}=await supabase.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();if(staff?.role==="dept_admin")redirect("/admin");}
  }
  const error=params.error?messages[params.error]??messages.invalid:null;
  return <main className="mn-login">
    <section className="mn-login-sheet"><div className="mn-login-heading"><span>LOXADA</span><b>INK.</b></div><h1>Manga &<br/>Light Novel</h1><p className="mn-subtitle">Staff sign in</p>
      {error&&<p role="alert" className="mn-error">{error}</p>}
      <form action={signIn}><label htmlFor="mn-email">Email or username</label><input id="mn-email" name="email" type="text" autoComplete="username" required/><label htmlFor="mn-password">Password</label><PasswordField/><button className="mn-submit" type="submit">Sign in →</button></form>
    </section>
  </main>;
}
