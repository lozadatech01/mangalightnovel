import Link from "next/link";
import AccountAnalysis from "@/app/admin/components/account-analysis";
import { loadAccountCube } from "@/lib/admin/account-cube";
import { parseReaderCubeView, type CubeParams } from "@/lib/admin/account-cube-model";
import { customerType } from "@/lib/portal/config";

export const metadata = { title: "Manga analytics" };

export default async function MangaAnalytics({ searchParams }: { searchParams: Promise<CubeParams> }) {
  const [params, cells] = await Promise.all([searchParams, loadAccountCube("readers")]);
  const view = parseReaderCubeView(params, customerType);

  return (
    <main className="ink-directory">
      <header className="ink-heading">
        <div>
          <h1>Manga &amp; Light Novel Analytics</h1>
          <p>Explore reader accounts by registration period and current access status.</p>
        </div>
      </header>
      <div className="mt-6">
        <AccountAnalysis readerOnly view={view} cells={cells} checkedAt={cells === null ? null : new Date().toISOString()} />
      </div>
      <section className="ink-register mt-4" aria-labelledby="title-engagement-heading">
        <h2 id="title-engagement-heading">Title engagement</h2>
        <p>Unavailable. Reading starts and completions will appear after the reader records authorized chapter delivery and completion.</p>
      </section>
      <p className="mt-4">
        <Link className="ink-text-link" href="/admin/supplier-activity">View Supplier Activity →</Link>
      </p>
    </main>
  );
}
