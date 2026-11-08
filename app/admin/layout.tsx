import SectionLinks from "@/app/admin/components/section-links";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth/authorization";
export default async function EditorialLayout({children}:{children:React.ReactNode}) {
 const user=await requireAdmin();
 const username=user.email?.split("@")[0]??"Staff";
 return <div className="mn-workspace">
   <aside className="mn-sidebar">
     <div className="mn-logo">LOXADA <strong>INK.</strong></div>
     <nav aria-label="Editorial navigation"><SectionLinks items={[{href:"/admin",label:"Editorial home"},{href:"/admin/accounts",label:"Reader & partner accounts"},{href:"/admin/onboarding",label:"Publishing applications"},{href:"/admin/relations",label:"Publishing relations"}]}/></nav>
     <section className="mn-profile"><div className="mn-profile-label">Account</div><b title={user.email}>{username}</b><small>Department Admin</small><form action={signOut}><button type="submit">Log out ↗</button></form></section>
   </aside>
   <div className="mn-workspace-content">{children}</div>
 </div>;
}
