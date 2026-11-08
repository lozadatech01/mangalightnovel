import Link from "next/link";
import {accountLabels,invitationTypes} from "@/lib/portal/config";
import {inviteSupplier} from "@/app/actions/admin-accounts";
import SubmitButton from "@/app/admin/components/submit-button";
const errors:Record<string,string>={invalid:"Check the contact details and choose an eligible partner type.",configuration:"Email invitations are not configured.",invite:"The invitation failed. This address may already have an account.",profile:"Invitation was sent but account setup needs attention."};
export default async function InvitePartner({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 return <main className="ink-directory">
  <Link className="ink-text-link" href="/admin/onboarding">← Back to applications</Link>
  <header className="ink-heading" style={{marginTop:18}}><div>
   <span className="ink-kicker">MANGA & LIGHT NOVEL / NEW PARTNER</span>
   <h1>Invite a publisher</h1><p>Publishers receive an invitation to join the editorial partner portal. Independent authors register directly.</p>
  </div></header>
  {p.error&&<p className="ink-message" role="alert">{errors[p.error]??"Invitation could not be completed."}</p>}
  <section className="ink-register admin-work-detail" style={{marginTop:22}}>
   <h2>Invitation details</h2><p>The publisher receives an email to set up their own account and complete their application.</p>
   <form action={inviteSupplier} className="admin-work-review">
    <label>Contact name<input name="display_name" minLength={2} maxLength={80} required/></label>
    <label>Contact email<input name="email" type="email" maxLength={254} required/></label>
    <label>Partner category<select name="account_type" required defaultValue="">
     <option value="" disabled>Choose a category</option>
     {invitationTypes.map(t=><option key={t} value={t}>{accountLabels[t]??t}</option>)}
    </select></label>
    <SubmitButton label="Send invitation" pendingLabel="Sending invitation..."/>
   </form>
  </section>
 </main>;
}
