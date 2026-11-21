import SupplierPanel from "@/app/components/supplier-panel";
import CustomerCatalog from "@/app/components/customer-catalog";
import {requirePortal} from "@/lib/auth/authorization";
import {isSupplier} from "@/lib/portal/config";

export default async function DepartmentPortal({searchParams}:{searchParams:Promise<{error?:string;notice?:string;q?:string;page?:string}>}){
 const identity=await requirePortal();
 const {user,account}=identity;
 const kind=account.account_type;
 if(isSupplier(kind)){
  const p=await searchParams;
  return <SupplierPanel identity={identity} description={kind==="creator"?"Work with the editorial team on your author application and publishing questions.":"Work with the editorial team on your publisher application and catalog rights questions."}
   submitted={p.notice==="submitted"} failed={!!p.error}/>;
 }
 const params=await searchParams;
 return <CustomerCatalog id={user.id} displayName={account.display_name} query={params.q} page={params.page} />;
}
