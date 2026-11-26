import Link from "next/link";
import Form from "next/form";
import SubmitButton from "@/app/admin/components/submit-button";
import styles from "./title-engagement.module.css";
import EngagementAxes from "./engagement-axes";
import EngagementContentFilters from "./engagement-content-filters";
import {
  breakdownLabels, engagementBaseWindow, engagementContentMember, engagementDateMember, engagementDrill, engagementUrl, engagementValue, measureLabels,
  type Cell, type DateWindow, type EngagementCatalog, type EngagementReport, type EngagementView,
} from "@/lib/admin/title-engagement-model";
import { manilaMonth } from "@/lib/admin/account-cube-model";

const dateLabel = new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric", timeZone: "UTC" });
const cutoffLabel = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
const countLabel = new Intl.NumberFormat("en-PH");
const percentLabel = new Intl.NumberFormat("en-PH", { style: "percent", maximumFractionDigits: 1 });
const labelOfDate = (day: string) => dateLabel.format(new Date(day + "T00:00:00Z"));

function periodLabel(bucket: string | null, level: EngagementView["level"]) {
  if (bucket === null) return "Total";
  if (level === "year") return bucket.slice(0, 4);
  if (level === "quarter") {
    const quarter = Math.floor((Number(bucket.slice(5, 7)) - 1) / 3) + 1;
    return "Q" + quarter + " " + bucket.slice(0, 4);
  }
  return labelOfDate(bucket);
}

export default function TitleEngagementCube({ view, window, report, catalog, now, sourceAvailable }: {
  view: EngagementView; window: DateWindow; report: EngagementReport; catalog: EngagementCatalog | null;
  now: Date; sourceAvailable: boolean;
}) {
  const latestMonth = manilaMonth(now);
  const base = engagementBaseWindow(view, now);
  const lastBase = new Date(base.to + "T00:00:00Z");
  lastBase.setUTCDate(0);
  const from = view.fromMonth || base.from.slice(0, 7);
  const to = view.toMonth || lastBase.toISOString().slice(0, 7);
  const dates = report.buckets.filter(bucket => bucket.bucket !== null);
  const total = report.buckets.find(bucket => bucket.bucket === null);
  const contentHeaders = report.members.map(({ member_id, label }) => ({
    id: member_id, label, href: engagementContentMember(view, member_id),
  }));
  const dateHeaders = dates.flatMap(({ bucket }) => bucket === null ? [] : [{
    id: bucket, label: periodLabel(bucket, view.level), href: engagementDateMember(view, bucket),
  }]);
  const rows = view.pivot ? dateHeaders : contentHeaders;
  const columns = view.pivot ? contentHeaders : dateHeaders;
  const cells = new Map(report.cells.map(cell => [JSON.stringify([cell.bucket, cell.memberId]), cell]));
  const grand = cells.get(JSON.stringify([null, null]));
  const down = engagementDrill(view, 1);
  const up = engagementDrill(view, -1);
  const lastDate = new Date(window.to + "T00:00:00Z");
  lastDate.setUTCDate(0);
  const windowLabel = [labelOfDate(window.from), dateLabel.format(lastDate)].filter((value, index, values) => values.indexOf(value) === index).join(" – ");
  const pageCount = Math.max(1, Math.ceil(report.memberCount / 12));
  const hasAvailablePeriod = dates.some(date => date.available);
  const availablePeriods = dates.filter(date => date.available).length;
  const publishers = engagementUrl({ ...view, breakdown: "publisher", publisherScope: null, work: null, page: 1 });
  const titles = engagementUrl({ ...view, breakdown: "title", work: null, page: 1 });
  const needsTitle = view.breakdown === "chapter" && !view.work;
  const catalogEmpty = catalog?.titles.length === 0;
  const publisherLabel = catalog?.publishers.find(item => item.id === view.publisherScope)?.label ?? report.publisherLabel;
  const titleLabel = catalog?.titles.find(item => item.id === view.work)?.label ?? report.titleLabel;

  function formatValue(cell: Cell | undefined, measure: EngagementView["measure"]) {
    const value = engagementValue(cell, measure);
    if (value === null) return <span aria-label={cell && measure === "rate" ? "Not applicable" : "Data unavailable"}>—</span>;
    return measure === "rate" ? percentLabel.format(value) : countLabel.format(value);
  }

  function renderValue(row: string | null, col: string | null) {
    return formatValue(cells.get(JSON.stringify(view.pivot ? [row, col] : [col, row])), view.measure);
  }

  return (
    <section id="engagement-cube" className="sr-shell ac-inline" aria-labelledby="engagement-heading">
      <div className="sr-card ac-panel">
        <h2 id="engagement-heading">Title Engagement</h2>
        <div className={styles.workspace}>
          <Form action="/admin/analytics#engagement-cube" className={styles.settings} key={engagementUrl(view)} noValidate>
            <input type="hidden" name="report" value="title-engagement" />
            <input type="hidden" name="layout" value="yes" />
            <fieldset className={styles.layout}>
              <legend>Table setup</legend>
              <EngagementAxes view={view} />
              <label>Reading measure
                <select name="measure" defaultValue={view.measure}>
                  {Object.entries(measureLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <label className={styles.totals}><input type="checkbox" name="totals" value="yes" defaultChecked={view.showTotals} /> Include table totals</label>
            </fieldset>
            <details className={styles.filters} open={Boolean(view.rangeError || view.publisherScope || view.work || view.kind)}>
              <summary>Filter reading activity</summary>
              <div className={styles.filterFields}>
                <label>First month<input type="month" name="fromMonth" defaultValue={from} max={latestMonth} required /></label>
                <label>Last month<input type="month" name="toMonth" defaultValue={to} max={latestMonth} required /></label>
                <p className="sr-note">Up to 12 months, Manila time.</p>
                <EngagementContentFilters catalog={catalog} view={view} />
              </div>
            </details>
            <SubmitButton label="Apply view" pendingLabel="Updating activity…" />
          </Form>
          <div className={styles.results}>
            <header className={styles.resultHeader}>
              <div>
                <h3>{measureLabels[view.measure]}</h3>
                <p>{windowLabel}</p>
              </div>
              {!view.rangeError ? <nav className={styles.drill} aria-label="Reading table controls">
                {up ? <Link href={up} prefetch={false}>Broader dates</Link> : null}
                {down ? <Link href={down} prefetch={false}>Finer dates</Link> : null}
                <Link href={engagementUrl({ ...view, pivot: !view.pivot })} prefetch={false}>Swap axes</Link>
              </nav> : null}
            </header>
            {view.breakdown !== "publisher" || view.publisherScope || view.work ? <nav className="ac-drills" aria-label="Content hierarchy">
              <Link href={publishers} className="sr-link" prefetch={false}>All publishers</Link>
              {view.publisherScope ? <><span aria-hidden="true">›</span>{view.work
                ? <Link href={titles} className="sr-link" prefetch={false}>{publisherLabel ?? "Publisher"}</Link>
                : <span aria-current="location">{publisherLabel ?? "Publisher"}</span>}</> : null}
              {view.work && !view.publisherScope ? <><span aria-hidden="true">›</span>
                <Link href={titles} className="sr-link" prefetch={false}>All titles</Link></> : null}
              {view.work ? <><span aria-hidden="true">›</span><span aria-current="location">{titleLabel ?? "Title"}</span></> : null}
            </nav> : null}
            {catalog === null ? <p className="sr-alert">The publisher and title catalog could not be loaded.</p> : null}
            {view.rangeError ? <p className="sr-alert" role="alert">{view.rangeError}</p> : catalogEmpty ? <p className="sr-alert">No approved titles have been loaded into Analytics. Reading results are unavailable.</p>
              : needsTitle ? <p className="sr-alert">Select a title in the filters to see its chapters.</p>
              : !sourceAvailable ? <p className="sr-alert">The report source is unavailable.</p>
              : !hasAvailablePeriod ? <p className="sr-alert">Data unavailable. No displayed period has full verified coverage.{view.level !== "month" ? " Choose month on the date axis to check individual months." : ""}</p>
              : !total?.available ? <p className="sr-alert">Verified data covers {availablePeriods} of {dates.length} displayed periods. Totals require coverage for the full selection.</p> : null}
            {!view.rangeError ? <>
            <div className="sa-table-wrap" tabIndex={0} role="region" aria-label="Title Engagement results">
              <table className="sa-table ac-table" aria-label={measureLabels[view.measure]}>
                <thead><tr>
                  <th scope="col">{view.pivot ? "Start period" : breakdownLabels[view.breakdown]}</th>
                  {columns.map(column => <th scope="col" key={column.id}>{column.href
                    ? <Link href={column.href} className="sr-link" prefetch={false}>{column.label}</Link> : column.label}</th>)}
                  {view.showTotals ? <th scope="col">Total</th> : null}
                </tr></thead>
                <tbody>{rows.map(row => <tr key={row.id}>
                  <th scope="row">{row.href ? <Link href={row.href} className="sr-link" prefetch={false}>{row.label}</Link> : row.label}</th>
                  {columns.map(column => <td key={column.id}>{renderValue(row.id, column.id)}</td>)}
                  {view.showTotals ? <td>{renderValue(row.id, null)}</td> : null}
                </tr>)}</tbody>
                {view.showTotals ? <tfoot><tr>
                  <th scope="row">Total</th>
                  {columns.map(column => <td key={column.id}>{renderValue(null, column.id)}</td>)}
                  <td>{renderValue(null, null)}</td>
                </tr></tfoot> : null}
              </table>
            </div>
            <dl className={styles.readingTotals} aria-label="Totals for the filtered selection">
              {(["starts", "completions", "readers", "rate"] as const).map(measure => <div key={measure}>
                <dt>{measureLabels[measure]}</dt><dd>{formatValue(grand, measure)}</dd>
              </div>)}
            </dl>
            {pageCount > 1 || view.page > 1 ? <nav className="ac-drills" aria-label="Breakdown pages">
              {view.page > 1 ? <Link className="ac-control" href={engagementUrl({ ...view, page: view.page - 1 })}>Previous</Link> : null}
              <span>Page {view.page} of {pageCount} · Totals cover all pages</span>
              {view.page < pageCount ? <Link className="ac-control" href={engagementUrl({ ...view, page: view.page + 1 })}>Next</Link> : null}
            </nav> : null}
            <p className="sr-note">Completions stay with the month the read started. Distinct-reader subtotals require retained evidence. A dash means unavailable, or not applicable for a completion rate with zero starts.</p>
            {window.to.slice(0, 7) > latestMonth
              ? <p className="sr-note">The current month covers eligible activity through the verified source cutoff.</p> : null}
            {total?.available && total.oldest_cutoff ? <p className="sr-note">Oldest source cutoff in this selection · {cutoffLabel.format(new Date(total.oldest_cutoff))} PHT</p> : null}
            </> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
