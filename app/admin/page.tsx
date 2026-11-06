import { requireAdmin } from "@/lib/auth/authorization";
export default async function AdminPage() {
 await requireAdmin();
 return <main className="mn-blank"><small>Editorial</small><h1>Overview</h1><p>No modules added yet.</p></main>;
}
