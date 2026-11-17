import SubmitButton from "@/app/admin/components/submit-button";
import Form from "next/form";
import Link from "next/link";
import AccountAnalysis from "@/app/admin/components/account-analysis";
import {accountCubeFields,accountRoute,inlineCubeUrl,parseInlineCubeView,type CubeParams} from "@/lib/admin/account-cube-model";
import {loadAccountCube} from "@/lib/admin/account-cube";
import {accountLabels,customerType,supplierTypes} from "@/lib/portal/config";
import {loadDirectory,directoryUrl} from "@/lib/admin/directory";

const notices:Record<string,string>={invited:"Publisher invitation sent. They must accept it to create their account.",reviewed:"Application decision saved."};
const errors:Record<string,string>={invalid:"Review the entered details.",configuration:"Invitations are not configured.",invite:"Invitation could not be sent.",profile:"Invitation sent, but account setup needs attention.",database:"Could not save the decision.",protected:"Staff accounts are managed separately.",missing:"Account not found."};
export default async function EditorialAccounts({searchParams}:{searchParams:Promise<CubeParams>}){
 const params=await searchParams;
 const p=Object.fromEntries(Object.entries(params).filter((entry):entry is [string,string]=>typeof entry[1]==="string"));
 const view=parseInlineCubeView(params,[customerType,...supplierTypes]);
 const [d,cells]=await Promise.all([loadDirectory(p),loadAccountCube()]);
 const recordUrl=(data:Parameters<typeof directoryUrl>[0],page:number)=>inlineCubeUrl(view,directoryUrl(data,page),"account-records");
 const listUrl=directoryUrl(d,d.page);
 const listFilters=[d.q&&("Name: "+d.q),d.role!=="all"?(accountLabels[d.role]??d.role):d.roles.map(role=>accountLabels[role]??role).join(", "),d.period&&("Registered "+d.period),d.status==="active"?"Not suspended":d.status==="suspended"?"Suspended":""].filter(Boolean);
 const tabs=[["all","Everyone"],["reader","Readers"],["creator","Independent authors"],["publisher","Publishers"]];
 return <main className="ink-directory">
  <header className="ink-heading">
   <div><span className="ink-kicker">INK / EDITORIAL DESK</span><h1>Account Access</h1>
    <p>Find readers, independent authors, and publishers. Manage sign-in access and password recovery.</p></div>
   <div className="ink-folio">ACCOUNT REGISTER <b>{d.total} {listFilters.length?"matched":"total"}</b></div>
  </header>
  <AccountAnalysis view={view} cells={cells} listUrl={listUrl}/>
  <div id="account-records" tabIndex={-1}>
  {listFilters.length?<div className="ac-account-filter"><span>Account list filters: {listFilters.join(" · ")}</span>
   <Link className="sr-link" href={recordUrl({q:"",role:"all",roles:[],period:"",status:"all"},1)}>Clear list filters</Link></div>:null}
  {d.error&&<p className="ink-message" role="alert">{d.error}</p>}
  {p.error&&<p className="ink-message" role="alert">{errors[p.error]??"This change could not be completed."}</p>}
  {p.notice&&<p className="ink-message" role="status">{notices[p.notice]??""}</p>}
  <nav className="ink-tabs" aria-label="Account groups">
   {tabs.map(([key,label])=><Link key={key} href={recordUrl({...d,role:key,roles:[]},1)} aria-current={d.role===key&&!d.roles.length?"page":undefined}>{label}</Link>)}
  </nav>
  <div className="ink-columns ink-account-only">
   <section className="ink-register">
    <div className="ink-section-top"><h2>Accounts</h2><span>Page {d.page} of {d.pages}</span></div>
    <Form className="ink-filters" action={accountRoute+"#account-records"} key={listUrl}>
     {Array.from(accountCubeFields(view),([name,value])=><input type="hidden" key={name} name={name} value={value}/>)}
     <input type="hidden" name="role" value={d.role}/>
     {d.roles.length?<input type="hidden" name="roles" value={d.roles.join(",")}/>:null}
     {d.period?<input type="hidden" name="period" value={d.period}/>:null}
     <label>Find a name<input name="q" type="search" defaultValue={d.q} placeholder="Search accounts by name" maxLength={60}/></label>
     <label>Access<select name="status" defaultValue={d.status}>
      <option value="all">All accounts</option><option value="active">Can sign in</option><option value="suspended">Access suspended</option>
     </select></label>
     <SubmitButton label="Find" pendingLabel="Searching..."/>
    </Form>
    <div className="ink-table-wrap"><table className="ink-people-table">
     <thead><tr><th>Name</th><th>Account type</th><th>Access</th><th></th></tr></thead>
     <tbody>{d.people.map(person=><tr key={person.user_id}>
      <td><strong>{person.display_name}</strong><small>Joined {new Date(person.created_at).toLocaleDateString("en-PH",{timeZone:"Asia/Manila"})}</small></td>
      <td>{{reader:"Reader",creator:"Independent author",publisher:"Publisher"}[person.account_type]??person.account_type}</td>
      <td><span className={"ink-state "+(person.status==="active"?"is-active":"is-locked")}>{person.status==="active"?"Can sign in":"Suspended"}</span></td>
      <td><Link href={"/admin/accounts/"+person.user_id} className="ink-text-link">Manage account</Link></td>
     </tr>)}</tbody>
    </table></div>
    {!d.people.length&&!d.error&&<p className="ink-empty">No accounts match this search.</p>}
    <div className="ink-pagination">
     {d.page>1?<Link href={recordUrl(d,d.page-1)}>Previous page</Link>:<span/>}
     <span>{d.page} / {d.pages}</span>
     {d.page<d.pages?<Link href={recordUrl(d,d.page+1)}>Next page</Link>:<span/>}
    </div>
   </section>
   
  </div>
  </div>
 </main>;
}
