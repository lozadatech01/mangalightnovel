import SupplierPanel from "@/app/components/supplier-panel";
import {signOut} from "@/app/actions/auth";
import {requirePortal} from "@/lib/auth/authorization";
import {isSupplier} from "@/lib/portal/config";

export default async function DepartmentPortal({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}){
 const identity=await requirePortal();
 const {user,account}=identity;
 const kind=account.account_type;
 if(isSupplier(kind)){
  const p=await searchParams;
  return <SupplierPanel identity={identity} description={kind==="creator"?"Work with the editorial team on your author application and publishing questions.":"Work with the editorial team on your publisher application and catalog rights questions."}
   submitted={p.notice==="submitted"} failed={!!p.error}/>;
 }
 return <main className="ink-portal"><div className="ink-portal-layout">
  <aside className="ink-portal-aside"><span className="ink-kicker">LOXADA / INK</span>
   <div><h2>{account.display_name}</h2><p>Reader</p><p>{user.email}</p></div>
   <form action={signOut}><button type="submit">Sign out</button></form>
  </aside>
  <div className="ink-portal-main">
   <span className="ink-kicker">READER ACCOUNT</span>
   <h1>Your reading space</h1>
   <p>Your reader account is ready. Free reading will be available here when authorized titles and reading features are launched.</p>
   <section className="ink-paper-section"><h2>Account information</h2>
    <dl className="ink-facts"><div><dt>Account type</dt><dd>Reader</dd></div><div><dt>Access</dt><dd>Can sign in</dd></div></dl>
    <p className="ink-subtext">This account is for reading, not a paid book subscription or checkout.</p>
   </section>
  </div>
 </div></main>;
}
