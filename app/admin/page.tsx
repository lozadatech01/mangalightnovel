import Link from "next/link";
import {requireAdmin} from "@/lib/auth/authorization";
export default async function AdminHome(){
 await requireAdmin();
 return <main className="ink-directory"><header className="ink-heading"><div><span className="ink-kicker">LOXADA INK / EDITORIAL</span><h1>Editorial home</h1><p>Manage the people who read our work and the authors and publishers who supply it.</p></div></header>
 <section className="ink-register" style={{marginTop:26}}><span className="ink-kicker">READERS &amp; PUBLISHING PARTNERS</span><h2>Account register</h2><p>Find reader accounts, invite publishers and review author applications. Title approvals and publishing rights are separate workflows.</p><Link className="ink-text-link" href="/admin/accounts">Open reader and partner accounts →</Link></section></main>;
}
