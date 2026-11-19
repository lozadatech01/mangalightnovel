import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/admin/components/workspace-tabs.module.css";
import { inlineCubeUrl, parseReaderCubeView, type CubeParams } from "@/lib/admin/account-cube-model";
import { customerType, departmentId } from "@/lib/portal/config";

export const metadata = { title: "Manga & Light Novel Analytics" };

const reports = [
  {
    id: "title-engagement",
    label: "Title Engagement",
    description: "See how many signed-in readers started or finished a title during a selected period.",
    source: "Waiting for the reader to record authorized chapter starts and completions.",
    href: "/admin/analytics",
  },
  {
    id: "ad-settlements",
    label: "Ad Settlements",
    description: "See verified advertising income, earned creator shares, and retained income by settlement month.",
    source: "Waiting for reconciled ad statements and approved creator allocations.",
    href: "/admin/analytics?report=ad-settlements",
  },
] as const;

const legacyFilters = ["row", "col", "timeLevel", "cubeGroup", "cubeStatus", "cubePeriod", "cubeFocus"];

export default async function MangaAnalytics({ searchParams }: { searchParams: Promise<CubeParams> }) {
  const params = await searchParams;
  if (params.report === undefined && legacyFilters.some(key => typeof params[key] === "string")) {
    redirect(inlineCubeUrl(parseReaderCubeView(params, customerType), undefined, "account-analysis", "readers"));
  }

  const report = reports.find(item => item.id === params.report) ?? reports[0];

  return (
    <main className="ink-directory">
      <header className="ink-heading">
        <div><h1>Manga &amp; Light Novel Analytics</h1></div>
      </header>
      <nav className={`${styles.tabs} mt-4`} data-dept={departmentId} aria-label="Analytics reports">
        {reports.map(item => (
          <Link key={item.id} href={item.href} aria-current={item === report ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <section className="ink-register" aria-labelledby="analytics-report-heading">
        <h2 id="analytics-report-heading">{report.label}</h2>
        <p>{report.description}</p>
        <p className="mt-3"><strong>Data unavailable.</strong> {report.source}</p>
      </section>
    </main>
  );
}
