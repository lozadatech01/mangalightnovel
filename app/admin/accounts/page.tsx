import Link from "next/link";
import {loadDirectory,directoryUrl} from "@/lib/admin/directory";
import {inviteSupplier,reviewSupplier} from "@/app/actions/admin-accounts";

const notices:Record<string,string>={invited:"Publisher invitation sent. They must accept it to create their account.",reviewed:"Application decision saved."};
const errors:Record<string,string>={invalid:"Review the entered details.",configuration:"Invitations are not configured.",invite:"Invitation could not be sent.",profile:"Invitation sent, but account setup needs attention.",database:"Could not save the decision.",protected:"Staff accounts are managed separately.",missing:"Account not found."};
const decisions=[["verified","Verify applicant"],["needs_info","Request details"],["rejected","Decline application"],["suspended","Suspend application"]];
const applicationStatus:Record<string,string>={pending:"Waiting for review",needs_info:"More details requested",verified:"Applicant verified",rejected:"Declined",suspended:"Application suspended"};
export default async function EditorialAccounts({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const d=await loadDirectory(p);
 const tabs=[["all","Everyone"],["reader","Readers"],["creator","Independent authors"],["publisher","Publishers"]];
 return <main className="ink-directory">
  <header className="ink-heading">
   <div><span className="ink-kicker">INK / EDITORIAL DESK</span><h1>Readers &amp; publishing partners</h1>
    <p>Manage people who read our releases and partners who submit or license stories.</p></div>
   <div className="ink-folio">ACCOUNT REGISTER <b>{d.total} {d.role==="all"?"shown":"matched"}</b></div>
  </header>
  {d.error&&<p className="ink-message" role="alert">{d.error}</p>}
  {p.error&&<p className="ink-message" role="alert">{errors[p.error]??"This change could not be completed."}</p>}
  {p.notice&&<p className="ink-message" role="status">{notices[p.notice]??""}</p>}
  <nav className="ink-tabs" aria-label="Account groups">
   {tabs.map(([key,label])=><Link key={key} href={directoryUrl({...d,role:key},1)} aria-current={d.role===key?"page":undefined}>{label}</Link>)}
  </nav>
  <div className="ink-columns">
   <section className="ink-register">
    <div className="ink-section-top"><h2>Account register</h2><span>Page {d.page} of {d.pages}</span></div>
    <form className="ink-filters" method="get" action="/admin/accounts">
     <input type="hidden" name="role" value={d.role}/>
     <label>Find a name<input name="q" type="search" defaultValue={d.q} placeholder="Search readers and partners" maxLength={60}/></label>
     <label>Access<select name="status" defaultValue={d.status}>
      <option value="all">All accounts</option><option value="active">Can sign in</option><option value="suspended">Access suspended</option>
     </select></label>
     <button type="submit">Find</button>
    </form>
    <div className="ink-table-wrap"><table className="ink-people-table">
     <thead><tr><th>Name</th><th>Account type</th><th>Access</th><th></th></tr></thead>
     <tbody>{d.people.map(person=><tr key={person.user_id}>
      <td><strong>{person.display_name}</strong><small>Joined {new Date(person.created_at).toLocaleDateString("en-PH")}</small></td>
      <td>{{reader:"Reader",creator:"Independent author",publisher:"Publisher"}[person.account_type]??person.account_type}</td>
      <td><span className={"ink-state "+(person.status==="active"?"is-active":"is-locked")}>{person.status==="active"?"Can sign in":"Suspended"}</span></td>
      <td><Link href={"/admin/accounts/"+person.user_id} className="ink-text-link">Open record</Link></td>
     </tr>)}</tbody>
    </table></div>
    {!d.people.length&&!d.error&&<p className="ink-empty">No accounts match this search.</p>}
    <div className="ink-pagination">
     {d.page>1?<Link href={directoryUrl(d,d.page-1)}>Previous page</Link>:<span/>}
     <span>{d.page} / {d.pages}</span>
     {d.page<d.pages?<Link href={directoryUrl(d,d.page+1)}>Next page</Link>:<span/>}
    </div>
   </section>
   <aside className="ink-sidebar">
    <section className="ink-side-panel">
     <span className="ink-side-num">01 / PARTNERSHIPS</span><h2>Invite a publisher</h2>
     <p>Publishers are invited by our editorial team, not through public registration.</p>
     <details><summary>Send publisher invitation</summary>
      <form action={inviteSupplier} className="ink-invite-form">
       <input type="hidden" name="account_type" value="publisher"/>
       <label>Contact name<input name="display_name" minLength={2} maxLength={80} required/></label>
       <label>Contact email<input name="email" type="email" maxLength={254} required/></label>
       <button type="submit">Send invitation</button>
      </form>
     </details>
    </section>
    <section className="ink-side-panel">
     <span className="ink-side-num">02 / APPLICATIONS</span><h2>Author &amp; publisher applications</h2>
     <p>{d.pending} of the latest {d.requests.length} applications need a decision or more information.</p>
     {!d.requests.length&&<p className="ink-empty">No applications submitted yet.</p>}
     {d.requests.map(req=><details className="ink-request" key={req.id}>
      <summary><span><strong>{req.legal_name}</strong><small>{applicationStatus[req.status]??req.status}</small></span><span aria-hidden="true">+</span></summary>
      <p>{req.organization_name??"Independent applicant"} · {req.contact_email}</p>
      <p className="ink-statement">{req.capability_statement}</p>
      {req.reviewer_feedback&&<p><strong>Previous feedback:</strong> {req.reviewer_feedback}</p>}
      <Link href={"/admin/accounts/"+req.user_id} className="ink-text-link">View account</Link>
      <form action={reviewSupplier} className="ink-review-form">
       <input type="hidden" name="application_id" value={req.id}/>
       <label>Decision<select name="status" defaultValue="" required><option value="" disabled>Choose a decision</option>{decisions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
       <label>Message to applicant<input name="reviewer_feedback" maxLength={1000} placeholder="Required unless verified"/></label>
       <button type="submit">Save decision</button>
      </form>
     </details>)}
    </section>
   </aside>
  </div>
 </main>;
}
