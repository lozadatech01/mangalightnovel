import Link from "next/link";
import {requireAdmin} from "@/lib/auth/authorization";
export default async function AdminHome(){
 await requireAdmin();
 return <main className="ink-directory"><header className="ink-heading"><div><span className="ink-kicker">LOXADA INK / EDITORIAL</span><h1>Editorial home</h1><p>Manage the people who read our work and the authors and publishers who supply it.</p></div></header>
 <section className="ink-register" style={{marginTop:26}}><h2>Account Access</h2><p>Find readers, independent authors, and publishers. Manage sign-in, suspensions, and password recovery.</p><Link className="ink-text-link" href="/admin/accounts">Manage account access →</Link></section>
 <section className="ink-register" style={{marginTop:18}}><h2>Suppliers</h2><p>Send invitations, review applications, and check supplier activity.</p><Link className="ink-text-link" href="/admin/relations">Open Suppliers →</Link></section>
 <section className="ink-register" style={{marginTop:18}}><h2>Analytics</h2><p>Review title engagement and advertising settlements.</p><Link className="ink-text-link" href="/admin/analytics">Open analytics →</Link></section>
 </main>;
}
