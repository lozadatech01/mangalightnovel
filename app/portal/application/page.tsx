import {redirect} from "next/navigation";
import SupplierPanelHeader from "@/app/components/supplier-panel-header";
import SubmitButton from "@/app/admin/components/submit-button";
import {submitSupplierApplication} from "@/app/actions/onboarding";
import {requirePortal} from "@/lib/auth/authorization";
import {departmentId,isSupplier} from "@/lib/portal/config";
import {readSupplierConversation} from "@/lib/portal/supplier-panel";
import {applicationStep} from "@/lib/portal/supplier-panel-state";

export const metadata={title:"Supplier application"};
const errors:Record<string,string>={
 invalid:"Check your application details and confirmation before submitting.",
 database:"The application could not be saved. Please try again.",
 locked:"The application can no longer be edited at its current review stage.",
};
export default async function SupplierApplicationPage({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}){
 const identity=await requirePortal();
 const {user,account,db}=identity;
 const kind=account.account_type;
 if(!isSupplier(kind))redirect("/portal");
 const [p,result,conversation]=await Promise.all([
  searchParams,db.from("supplier_applications").select("status,legal_name,organization_name,contact_email,capability_statement,reviewer_feedback").eq("user_id",user.id).maybeSingle(),
  readSupplierConversation(identity)
 ]);
 const app=result.data;
 const step=applicationStep(app?.status??null,!!result.error);
 return <main className="sr-shell sp-panel" data-dept={departmentId}>
  <SupplierPanelHeader current="application" displayName={account.display_name} accountType={kind}
   canMessage={!!conversation.data} title={kind==="creator"?"Author application":"Publisher application"} description={kind==="creator"?"Share your writing background and work for the editorial team to review.":"Tell the editorial team about your publisher and the catalog rights you represent."}/>
  {p.error?<p className="sr-alert" role="alert">{Object.hasOwn(errors,p.error)?errors[p.error]:"The application could not be updated."}</p>:null}
  {p.notice==="submitted"?<p className="sr-alert" role="status">Application submitted. The department will review it.</p>:null}
  <section className="sr-card">
   <h2>Application status</h2>
   <span className="sr-chip">{step.label}</span>
   <p>{step.next}</p>
   {result.error?<p className="sr-alert" role="alert">Your application could not be loaded. Reload the page before trying again.</p>:null}
   {app?.reviewer_feedback?<div className="sr-alert sp-feedback"><strong>Editorial feedback</strong><p className="sp-statement">{app.reviewer_feedback}</p></div>:null}
   {step.editable?<form className="sp-form" action={submitSupplierApplication}>
           <label>{kind==="creator"?"Your legal name":"Authorized representative"}
            <input name="legal_name" minLength={2} maxLength={160} defaultValue={app?.legal_name??""} required/></label>
           <label>{kind==="creator"?"Organization (optional)":"Publishing company (optional)"}
            <input name="organization_name" minLength={2} maxLength={160} defaultValue={app?.organization_name??""}/></label>
           <label>Contact email
            <input name="contact_email" type="email" maxLength={254} defaultValue={app?.contact_email??user.email??""} required/></label>
           <label>{kind==="creator"?"Tell us about your writing and work":"Tell us about the catalog and rights you represent"}
            <textarea name="capability_statement" rows={5} minLength={20} maxLength={3000} defaultValue={app?.capability_statement??""} required/></label>
           <label className="sp-check"><input type="checkbox" name="affirmed" required/> I confirm these details are accurate and understand that proof of identity and rights may be requested.</label>
           <SubmitButton label={app?"Resubmit updated details":"Submit application for review"} pendingLabel="Submitting…"/>
          </form>:app?<>
    <h2 className="sp-statement">Submitted details</h2>
    <dl className="sr-facts"><div><dt>Applicant name</dt><dd>{app.legal_name}</dd></div>
     <div><dt>Organization</dt><dd>{app.organization_name??"Not provided"}</dd></div>
     <div><dt>Contact email</dt><dd>{app.contact_email}</dd></div></dl>
    <h3 className="sp-statement">What you submitted</h3>
    <p className="sp-statement">{app.capability_statement}</p>
   </>:null}
   <p className="sr-note">Application verification does not authorize individual titles or grant publishing rights.</p>
  </section>
 </main>;
}
