import Link from "next/link";
import InviteForm from "./invite-form";
import {inviteErrors} from "@/lib/supplier-invite";
export default async function InviteSupplierPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 return <main className="ink-directory">
  <Link className="ink-text-link" href="/admin/relations">← Back to Supplier Invitations &amp; Messages</Link>
  <header className="ink-heading" style={{marginTop:18}}><div>
   <span className="ink-kicker">MANGA & LIGHT NOVEL / EMAIL INVITATION</span>
   <h1>Invite a publisher</h1><p>Email a publisher an invitation and an opening message. Independent authors register on their own.</p>
  </div></header>
  {p.error&&<p className="ink-message" role="alert">{p.error==="profile"?inviteErrors.setup:inviteErrors.unavailable}</p>}
  <section className="ink-register admin-work-detail" style={{marginTop:22}}>
   <h2>Invitation details</h2><p>The recipient can reply privately before deciding whether to accept. They submit a separate supplier application after setting up their account.</p>
    <InviteForm/>
  </section>
 </main>;
}
