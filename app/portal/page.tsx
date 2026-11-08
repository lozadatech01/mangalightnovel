import Link from "next/link";
import {signOut} from "@/app/actions/auth";
import {submitSupplierApplication} from "@/app/actions/onboarding";
import {requirePortal} from "@/lib/auth/authorization";
import {isSupplier} from "@/lib/portal/config";

const statusCopy:Record<string,string>={pending:"Submitted for review",needs_info:"More information needed",verified:"Applicant verified",rejected:"Application declined",suspended:"Application suspended"};
const errors:Record<string,string>={unauthorized:"This account cannot submit an author or publisher application.",invalid:"Please check the information and confirmation.",database:"The application could not be saved.",locked:"Your application is already being reviewed."};
export default async function InkPortal({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}){
 const {user,account,db}=await requirePortal();
 const p=await searchParams;
 const supplier=isSupplier(account.account_type);
 const {data:app,error:appError}=supplier
  ? await db.from("supplier_applications").select("status,legal_name,organization_name,contact_email,capability_statement,reviewer_feedback").eq("user_id",user.id).maybeSingle()
  : {data:null,error:null};
 const editable=supplier&&(!app||app.status==="needs_info");
 const kind=account.account_type;
 const role=kind==="creator"?"Independent author":kind==="publisher"?"Publisher":"Reader";
 return <main className="ink-portal"><div className="ink-portal-layout">
  <aside className="ink-portal-aside"><span className="ink-kicker">LOXADA / INK</span>
   <div><h2>{account.display_name}</h2><p>{role}</p><p>{user.email}</p></div>
   <form action={signOut}><button type="submit">Sign out</button></form>
  </aside>
  <div className="ink-portal-main">
   {supplier&&<Link className="sr-portal-message-link" href="/portal/messages">Messages with the editorial team</Link>}
   <span className="ink-kicker">{supplier?"PUBLISHING PARTNER DESK":"READER ACCOUNT"}</span>
   <h1>{supplier?"Your publishing application":"Your reading space"}</h1>
   <p>{supplier
    ?"Tell our editorial team about yourself or your publishing organization. Verification of an applicant is not permission to publish a title."
    :"Your reader account is ready. Free reading will be available here when authorized titles and reading features are launched."}</p>
   {p.error&&<p className="ink-message" role="alert">{errors[p.error]??"Unable to complete the request."}</p>}
   {p.notice==="submitted"&&<p className="ink-message" role="status">Application sent. The editorial team will review it.</p>}
   {appError&&<p className="ink-message" role="alert">Could not load the application.</p>}
   {!supplier
    ? <section className="ink-paper-section"><h2>Account information</h2>
       <dl className="ink-facts"><div><dt>Account type</dt><dd>Reader</dd></div><div><dt>Access</dt><dd>Can sign in</dd></div></dl>
       <p className="ink-subtext">This account is for reading—not a paid book subscription or checkout.</p>
      </section>
    : <section className="ink-paper-section"><h2>{kind==="creator"?"Author application":"Publisher application"}</h2>
       {app&&<p><strong>Status:</strong> {statusCopy[app.status]??app.status}</p>}
       {app?.reviewer_feedback&&<p><strong>Editorial feedback:</strong> {app.reviewer_feedback}</p>}
       {editable
        ? <form className="ink-record-form" action={submitSupplierApplication}>
           <label>{kind==="creator"?"Your legal name":"Authorized representative"}
            <input name="legal_name" minLength={2} maxLength={160} defaultValue={app?.legal_name??""} required/></label>
           <label>{kind==="creator"?"Organization (optional)":"Publishing company (optional)"}
            <input name="organization_name" minLength={2} maxLength={160} defaultValue={app?.organization_name??""}/></label>
           <label>Contact email
            <input name="contact_email" type="email" maxLength={254} defaultValue={app?.contact_email??user.email??""} required/></label>
           <label>{kind==="creator"?"Tell us about your writing and work":"Tell us about the catalog and rights you represent"}
            <textarea name="capability_statement" rows={5} minLength={20} maxLength={3000} defaultValue={app?.capability_statement??""} required/></label>
           <label className="ink-confirm"><input type="checkbox" name="affirmed" required/> I confirm these details are accurate and understand that proof of identity and rights may be requested.</label>
           <button type="submit">{app?"Resubmit details":"Send application for review"}</button>
          </form>
        : <p className="ink-subtext">Your application cannot be edited while it is under review or after a final decision. Ask the editorial team if you need a change.</p>}
       <p className="ink-subtext">Author identity, publisher verification, and permission for individual titles are separate checks.</p>
      </section>}
  </div>
 </div></main>;
}
