import Form from "next/form";
import Link from "next/link";
import {loadDirectory,directoryUrl} from "@/lib/admin/directory";

const notices:Record<string,string>={invited:"Publisher invitation sent. They must accept it to create their account.",reviewed:"Application decision saved."};
const errors:Record<string,string>={invalid:"Review the entered details.",configuration:"Invitations are not configured.",invite:"Invitation could not be sent.",profile:"Invitation sent, but account setup needs attention.",database:"Could not save the decision.",protected:"Staff accounts are managed separately.",missing:"Account not found."};
export default async function EditorialAccounts({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const d=await loadDirectory(p);
 const tabs=[["all","Everyone"],["reader","Readers"],["creator","Independent authors"],["publisher","Publishers"]];
 return <main className="ink-directory">
  <header className="ink-heading">
   <div><span className="ink-kicker">INK / EDITORIAL DESK</span><h1>Readers &amp; publishing partners</h1>
    <p>Find readers, independent authors, and publishers. Manage account access and password help.</p></div>
   <div className="ink-folio">ACCOUNT REGISTER <b>{d.total} {d.role==="all"?"shown":"matched"}</b></div>
  </header>
  {d.error&&<p className="ink-message" role="alert">{d.error}</p>}
  {p.error&&<p className="ink-message" role="alert">{errors[p.error]??"This change could not be completed."}</p>}
  {p.notice&&<p className="ink-message" role="status">{notices[p.notice]??""}</p>}
  <nav className="ink-tabs" aria-label="Account groups">
   {tabs.map(([key,label])=><Link key={key} href={directoryUrl({...d,role:key},1)} aria-current={d.role===key?"page":undefined}>{label}</Link>)}
  </nav>
  <div className="ink-columns ink-account-only">
   <section className="ink-register">
    <div className="ink-section-top"><h2>Account register</h2><span>Page {d.page} of {d.pages}</span></div>
    <Form className="ink-filters" action="/admin/accounts">
     <input type="hidden" name="role" value={d.role}/>
     <label>Find a name<input name="q" type="search" defaultValue={d.q} placeholder="Search readers and partners" maxLength={60}/></label>
     <label>Access<select name="status" defaultValue={d.status}>
      <option value="all">All accounts</option><option value="active">Can sign in</option><option value="suspended">Access suspended</option>
     </select></label>
     <button type="submit">Find</button>
    </Form>
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
   
  </div>
 </main>;
}
