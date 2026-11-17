import Link from "next/link";
import {requireAdmin} from "@/lib/auth/authorization";
export default async function AdminHome(){
 await requireAdmin();
 return <main className="ink-directory"><header className="ink-heading"><div><span className="ink-kicker">LOXADA INK / EDITORIAL</span><h1>Editorial home</h1><p>Manage the people who read our work and the authors and publishers who supply it.</p></div></header>
 <section className="ink-register" style={{marginTop:26}}><h2>Account Access</h2><p>Find readers, independent authors, and publishers. Manage sign-in, suspensions, and password recovery.</p><Link className="ink-text-link" href="/admin/accounts">Manage account access →</Link></section>
 <section className="ink-register" style={{marginTop:16}}><h2>Supplier Invitations &amp; Messages</h2><p>Send invitations, check whether suppliers accepted, and open private conversations.</p><Link className="ink-text-link" href="/admin/relations">Open invitations and messages →</Link></section>
 <section className="ink-register" style={{marginTop:16}}><h2>Supplier Applications</h2><p>Review submitted supplier information and record a verification decision.</p><Link className="ink-text-link" href="/admin/onboarding">Review supplier applications →</Link></section>
 <section className="ink-register" style={{marginTop:18}}><h2>Supplier Activity</h2><p>See which invitations need follow-up, which applications are waiting, and which accounts are suspended.</p><Link className="ink-text-link" href="/admin/supplier-activity">Open supplier activity report →</Link></section>
 </main>;
}
