import Link from "next/link";
import InviteForm from "./invite-form";
import {inviteErrors} from "@/lib/supplier-invite";
export default async function InvitePartner({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 return <main className="ink-directory">
  <Link className="ink-text-link" href="/admin/onboarding">← Back to applications</Link>
  <header className="ink-heading" style={{marginTop:18}}><div>
   <span className="ink-kicker">MANGA & LIGHT NOVEL / NEW PARTNER</span>
   <h1>Invite a publisher</h1><p>Publishers receive an invitation to join the editorial partner portal. Independent authors register directly.</p>
  </div></header>
  {p.error&&<p className="ink-message" role="alert">{p.error==="profile"?inviteErrors.setup:inviteErrors.unavailable}</p>}
  <section className="ink-register admin-work-detail" style={{marginTop:22}}>
   <h2>Invitation details</h2><p>The publisher receives an email to set up their own account and complete their application.</p>
    <InviteForm/>
  </section>
 </main>;
}
