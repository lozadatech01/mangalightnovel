import Link from "next/link";
import Form from "next/form";
import SubmitButton from "@/app/admin/components/submit-button";
import {
  breakdownLabels, engagementDrill, engagementUrl, engagementValue, kindLabels, measureLabels, timeLevels,
  type Cell, type DateWindow, type EngagementReport, type EngagementView,
} from "@/lib/admin/title-engagement-model";
import { manilaMonth } from "@/lib/admin/account-cube-model";

const dateLabel = new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("en-PH", { month: "long", timeZone: "UTC" });
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

export default function TitleEngagementCube({ view, window, report, now, sourceAvailable }: {
  view: EngagementView; window: DateWindow; report: EngagementReport; now: Date; sourceAvailable: boolean;
}) {
  const [currentYear, currentMonth] = manilaMonth(now).split("-").map(Number);
  const years = [...new Set([currentYear, currentYear - 1, currentYear - 2, view.year])].sort((a, b) => b - a);
  const dates = report.buckets.filter(bucket => bucket.bucket !== null);
  const total = report.buckets.find(bucket => bucket.bucket === null);
  const rows = view.pivot
    ? report.members.map(member => ({ id: member.member_id, label: member.label }))
    : dates.map(({ bucket }) => ({ id: bucket, label: periodLabel(bucket, view.level) }));
  const columns = view.pivot
    ? dates.map(({ bucket }) => ({ id: bucket, label: periodLabel(bucket, view.level) }))
    : report.members.map(member => ({ id: member.member_id, label: member.label }));
  const cells = new Map(report.cells.map(cell => [JSON.stringify([cell.bucket, cell.memberId]), cell]));
  const down = engagementDrill(view, 1);
  const up = engagementDrill(view, -1);
  const lastDate = new Date(window.to + "T00:00:00Z");
  lastDate.setUTCDate(0);
  const windowLabel = [labelOfDate(window.from), dateLabel.format(lastDate)].filter((value, index, values) => values.indexOf(value) === index).join(" – ");
  const pageCount = Math.max(1, Math.ceil(report.memberCount / 12));
  const hasAvailablePeriod = dates.some(date => date.available);
  const availablePeriods = dates.filter(date => date.available).length;

  function renderValue(row: string | null, col: string | null) {
    const cell: Cell | undefined = cells.get(JSON.stringify(view.pivot ? [col, row] : [row, col]));
    const value = engagementValue(cell, view.measure);
    if (value === null) return <span aria-label={cell && view.measure === "rate" ? "Not applicable" : "Data unavailable"}>—</span>;
    return view.measure === "rate" ? percentLabel.format(value) : countLabel.format(value);
  }

  return (
    <section id="engagement-cube" className="sr-shell ac-inline" aria-labelledby="engagement-heading">
      <div className="sr-card ac-panel">
        <h2 id="engagement-heading">Title Engagement</h2>
        <p>Analyze eligible signed-in reading by Manila start date, content type, title, or verified publisher.</p>
        <Form action="/admin/analytics#engagement-cube" className="ac-form" key={engagementUrl(view)}>
          <input type="hidden" name="report" value="title-engagement" />
          {view.pivot ? <input type="hidden" name="pivot" value="yes" /> : null}
          <div className="ac-fields">
            <label>Start year
              <select name="year" defaultValue={view.year}>{years.map(year => <option key={year}>{year}</option>)}</select>
            </label>
            <label>Start month
              <select name="month" defaultValue={view.month ?? ""}>
                <option value="">All months</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                  <option key={month} value={month}>{monthLabel.format(new Date(Date.UTC(2020, month - 1, 1)))}</option>
                ))}
              </select>
            </label>
            <label>Content type
              <select name="kind" defaultValue={view.kind ?? ""}>
                <option value="">All content types</option>
                {Object.entries(kindLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            {report.publishers.length || view.publisher ? <label>Publisher
              <select name="publisher" defaultValue={view.publisher ?? ""}>
                <option value="">All sources</option>
                {view.publisher && !report.publishers.some(publisher => publisher.id === view.publisher)
                  ? <option value={view.publisher}>Publisher unavailable</option> : null}
                {report.publishers.map(publisher => <option key={publisher.id} value={publisher.id}>{publisher.label}</option>)}
              </select>
            </label> : null}
            <label>Group dates by
              <select name="groupDates" defaultValue={view.level}>
                {timeLevels.map(level => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}
              </select>
            </label>
            <label>Breakdown
              <select name="breakdown" defaultValue={view.breakdown}>
                {Object.entries(breakdownLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label>Measure
              <select name="measure" defaultValue={view.measure}>
                {Object.entries(measureLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="ac-report-actions"><SubmitButton label="Apply filters" pendingLabel="Updating report…" /></div>
        </Form>
        <div className="ac-drills" role="group" aria-label="Cube layout">
          {up ? <Link className="ac-control" href={up} prefetch={false}>Drill up</Link> : null}
          {down ? <Link className="ac-control" href={down} prefetch={false}>Drill down</Link> : null}
          <Link className="ac-control" href={engagementUrl({ ...view, pivot: !view.pivot })} prefetch={false}>Pivot rows and columns</Link>
        </div>
        <p className="sr-note"><strong>{measureLabels[view.measure]}</strong> · {windowLabel} · {view.level} × {breakdownLabels[view.breakdown].toLowerCase()}</p>
        {!sourceAvailable ? <p className="sr-alert">The report source is unavailable.</p>
          : !hasAvailablePeriod ? <p className="sr-alert">Data unavailable. This period has no verified reading snapshot.</p>
          : !total?.available ? <p className="sr-alert">Verified data covers {availablePeriods} of {dates.length} displayed periods. Totals require coverage for the full selection.</p> : null}
        <div className="sa-table-wrap" tabIndex={0} role="region" aria-label="Title Engagement results">
          <table className="sa-table ac-table" aria-label={measureLabels[view.measure]}>
            <thead><tr>
              <th scope="col">{view.pivot ? breakdownLabels[view.breakdown] : "Start period"}</th>
              {columns.map(column => <th scope="col" key={column.id}>{column.label}</th>)}
              <th scope="col">Total</th>
            </tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}>
              <th scope="row">{row.label}</th>
              {columns.map(column => <td key={column.id}>{renderValue(row.id, column.id)}</td>)}
              <td>{renderValue(row.id, null)}</td>
            </tr>)}</tbody>
            <tfoot><tr>
              <th scope="row">Total</th>
              {columns.map(column => <td key={column.id}>{renderValue(null, column.id)}</td>)}
              <td>{renderValue(null, null)}</td>
            </tr></tfoot>
          </table>
        </div>
        {pageCount > 1 || view.page > 1 ? <nav className="ac-drills" aria-label="Breakdown pages">
          {view.page > 1 ? <Link className="ac-control" href={engagementUrl({ ...view, page: view.page - 1 })}>Previous</Link> : null}
          <span>Page {view.page} of {pageCount} · Totals cover all pages</span>
          {view.page < pageCount ? <Link className="ac-control" href={engagementUrl({ ...view, page: view.page + 1 })}>Next</Link> : null}
        </nav> : null}
        <p className="sr-note">Completions stay with the month the read started. Distinct-reader subtotals require retained evidence. A dash means unavailable, or not applicable for a completion rate with zero starts.</p>
        {view.year === currentYear && (view.month === null || view.month === currentMonth)
          ? <p className="sr-note">The current month covers eligible activity through the verified source cutoff.</p> : null}
        {total?.available && total.oldest_cutoff ? <p className="sr-note">Oldest source cutoff in this selection · {cutoffLabel.format(new Date(total.oldest_cutoff))} PHT</p> : null}
      </div>
    </section>
  );
}
