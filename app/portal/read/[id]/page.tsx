import Link from "next/link";
import { requirePortal } from "@/lib/auth/authorization";
import Reader from "./reader";
export default async function Chapter({params}:{params:Promise<{id:string}>}) {
  await requirePortal();
  return <main className="sr-shell sp-panel"><Link href="/portal">Back to catalog</Link><h1>Read chapter</h1><Reader listing={(await params).id}/></main>;
}
