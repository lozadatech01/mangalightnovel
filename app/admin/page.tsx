import { signOut } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth/authorization";

export default async function AdminPage() {
  const user = await requireAdmin();
  return (<div className="mn-admin"><header><strong className="mn-logo">LOXADA / INK</strong><form action={signOut}><button type="submit" className="mn-exit">CLOSE SESSION ↗</button></form></header><section><span className="mn-label">CHAPTER 002 / ADMIN ACCESS CONFIRMED</span><h1>The editorial<br/>desk.</h1><div className="mn-box"><strong>Welcome, editor.</strong><p>Authorized as Manga & Light Novel administrator. Signed in as {user.email}.</p><p>This workspace is reserved for future editorial and publishing tools.</p></div></section></div>);
}
