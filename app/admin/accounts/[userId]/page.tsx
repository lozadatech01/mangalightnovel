import Link from "next/link";
import {loadAccount} from "@/lib/admin/account-detail";
import {renameAccount,setAccountStatus,sendRecoveryEmail} from "@/app/actions/admin-account-controls";

const notices:Record<string,string>={renamed:"The display name was updated.",unchanged:"There were no changes to save.",suspended:"Account access suspended.",reactivated:"Account access restored.",recovery:"A password recovery email was requested.",recovery_unlogged:"Email requested but its activity note could not be saved."};
const errors:Record<string,string>={invalid:"Please check the name.",changed:"Account details changed. Review the record and try again.",reason:"Enter a reason of at least 8 characters and confirm.",configuration:"Password email settings are unavailable.",database:"Could not save.",email:"Could not send recovery email.",cooldown:"A recovery email was recently requested."};
const state:Record<string,string>={pending:"Waiting for review",needs_info:"More information needed",verified:"Applicant verified",rejected:"Application declined",suspended:"Application suspended"};
export default async function EditorialRecord({params,searchParams}:{params:Promise<{userId:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {userId}=await params;
 const {account,authUser,history,application}=await loadAccount(userId);
 const p=await searchParams;
 const role=({reader:"Reader",creator:"Independent author",publisher:"Publisher"} as Record<string,string>)[account.account_type]??account.account_type;
 return <main className="ink-record">
  <Link className="ink-text-link" href="/admin/accounts">← Back to account register</Link>
  <div className="ink-record-head"><div><span className="ink-kicker">EDITORIAL / ACCOUNT RECORD</span><h1>{account.display_name}</h1><p>{role} · {authUser?.email??"Email unavailable"}</p></div>
   <span className={"ink-state "+(account.status==="active"?"is-active":"is-locked")}>{account.status==="active"?"Can sign in":"Suspended"}</span></div>
  {p.notice&&<p className="ink-message" role="status">{notices[p.notice]??""}</p>}
  {p.error&&<p className="ink-message" role="alert">{errors[p.error]??"Could not complete that action."}</p>}
  <div className="ink-record-grid">
   <div className="ink-record-main">
    <section className="ink-paper-section"><h2>Account details</h2>
     <dl className="ink-facts"><div><dt>Joined</dt><dd>{new Date(account.created_at).toLocaleDateString("en-PH")}</dd></div>
      <div><dt>Email</dt><dd>{authUser?.email_confirmed_at?"Verified":"Not verified"}</dd></div>
      <div><dt>Last sign-in</dt><dd>{authUser?.last_sign_in_at?new Date(authUser.last_sign_in_at).toLocaleDateString("en-PH"):"Not recorded"}</dd></div>
     </dl>
     <form action={renameAccount} className="ink-record-form"><input type="hidden" name="user_id" value={userId}/>
      <label>Display name<input name="display_name" defaultValue={account.display_name} minLength={2} maxLength={80} required/></label><button type="submit">Save name</button></form>
    </section>
    {application&&<section className="ink-paper-section"><h2>Publishing partner application</h2>
     <p><strong>{application.legal_name}</strong> · {state[application.status]??application.status}</p>
     {application.reviewer_feedback&&<p>Reviewer feedback: {application.reviewer_feedback}</p>}
     <p className="ink-subtext">Verifying a partner is not the same as approving a title or giving publishing rights.</p>
     <Link href="/admin/onboarding" className="ink-text-link">Review applications</Link></section>}
    <section className="ink-paper-section"><h2>Record of changes</h2>
     {!history.length&&<p>No account changes recorded.</p>}
     <ol className="ink-history">{history.map(h=><li key={h.id}><strong>{({account_suspended:"Access suspended",account_reactivated:"Access restored",display_name_changed:"Name changed",recovery_email_sent:"Password email requested"} as Record<string,string>)[String(h.action)]??String(h.action)}</strong>
      <small>{new Date(h.created_at).toLocaleString("en-PH")}</small>{h.note&&<p>{h.note}</p>}</li>)}</ol>
    </section>
   </div>
   <aside className="ink-record-aside"><section className="ink-side-panel">
    <span className="ink-side-num">ACCOUNT ACCESS</span><h2>{account.status==="active"?"Suspend sign-in":"Restore sign-in"}</h2>
    {account.status==="suspended"&&<p>Reason: {account.suspension_reason}</p>}
    <p>Account access is separate from publishing agreements and title permissions.</p>
    <form action={setAccountStatus}>
     <input type="hidden" name="user_id" value={userId}/><input type="hidden" name="expected_status" value={account.status}/>
     {account.status==="active"?<><input type="hidden" name="status" value="suspended"/>
      <label>Reason<textarea name="reason" rows={3} minLength={8} maxLength={500} required/></label>
      <label className="ink-confirm"><input type="checkbox" name="confirm" required/> Suspend this account's access</label>
      <button className="ink-danger" type="submit">Suspend sign-in</button></>:
      <><input type="hidden" name="status" value="active"/><button type="submit">Restore access</button></>}
    </form>
   </section>
   <section className="ink-side-panel"><span className="ink-side-num">ACCOUNT RECOVERY</span><h2>Password help</h2>
    <p>Send the person an email to choose a new password. Admins cannot see passwords.</p>
    <form action={sendRecoveryEmail}><input type="hidden" name="user_id" value={userId}/>
     <button type="submit" disabled={!authUser?.email}>Send reset email</button></form>
   </section></aside>
  </div>
 </main>;
}
