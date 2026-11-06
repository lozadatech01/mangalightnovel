import { signIn } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const messages: Record<string, string> = {
 invalid: "The email or password could not be verified.",
 unauthorized: "This account does not have permission to enter the admin area.",
 configuration: "Sign-in is not configured for this environment.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{error?: string}> }) {
  const params = await searchParams;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: record } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (record?.role === "dept_admin" && user.email_confirmed_at) redirect("/admin");
    }
  }
  const error = params.error ? messages[params.error] ?? messages.invalid : null;
  return (<div className="mn-shell"><header className="mn-header"><strong className="mn-logo">LOXADA / INK</strong><span className="mn-label">MANGA & LIGHT NOVEL</span></header><div className="mn-layout"><section className="mn-feature"><span className="mn-chapter">CHAPTER 001 / STAFF</span><div><h2>Every<br/>story<br/>starts<br/>here.</h2><p>A quiet corner for the people bringing pages to life.</p></div><div className="mn-graphic" aria-hidden="true" /></section><section className="mn-right"><div className="mn-form"><span className="mn-label">EDITORIAL WORKSPACE</span><h1>Turn the page.</h1><p>Staff sign-in. Only approved Manga & Light Novel administrators can access the workspace.</p>{error && <div className="mn-alert" role="alert">{error}</div>}<form action={signIn}><label htmlFor="email">Email address</label><input name="email" id="email" type="email" autoComplete="username" required placeholder="editor@example.com"/><label htmlFor="password">Password</label><input id="password" type="password" name="password" autoComplete="current-password" required/><button type="submit">OPEN STAFF DESK →</button></form></div></section></div></div>);
}
