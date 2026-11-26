import { manilaMonth, type CubeParams } from "./account-cube-model";

export const timeLevels = ["year", "quarter", "month"] as const;
export const breakdownLabels = { kind: "Content type", title: "Title", publisher: "Publisher", chapter: "Chapter" } as const;
export const kindLabels = { MANGA: "Manga", LIGHT_NOVEL: "Light novel" } as const;
export const measureLabels = {
  starts: "Reading starts",
  completions: "Reading completions",
  readers: "Distinct readers",
  rate: "Completion rate",
} as const;

type Level = (typeof timeLevels)[number];
type Breakdown = keyof typeof breakdownLabels;
type Kind = keyof typeof kindLabels;
type Measure = keyof typeof measureLabels;

export type EngagementView = {
  year: number;
  month: number | null;
  quarter: number | null;
  level: Level;
  breakdown: Breakdown;
  kind: Kind | null;
  publisherScope: string | null;
  work: string | null;
  measure: Measure;
  pivot: boolean;
  fromMonth: string;
  toMonth: string;
  focus: string | null;
  rangeError: string | null;
  showTotals: boolean;
  page: number;
};
export type DateWindow = { from: string; to: string; months: number };
export type Bucket = { bucket: string | null; available: boolean; oldest_cutoff: string | null };
export type Member = { member_id: string; label: string };
type CatalogChoice = { id: string; label: string };
export type EngagementCatalog = {
  publishers: CatalogChoice[];
  titles: (CatalogChoice & { kind: Kind; scopes: string[] })[];
};
export type Cell = { bucket: string | null; memberId: string | null; starts: number; completions: number; readers: number | null };
export type EngagementReport = {
  buckets: Bucket[];
  members: Member[];
  publisherLabel: string | null;
  titleLabel: string | null;
  memberCount: number;
  cells: Cell[];
};

function scalar(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function choice<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  return values.find(option => option === value) ?? fallback;
}

function integer(value: unknown, min: number, max: number, fallback: number): number {
  if (!/^\d{1,6}$/.test(scalar(value))) return fallback;
  const number = Number(value);
  return number >= min && number <= max ? number : fallback;
}

export function engagementView(params: CubeParams, now: Date): EngagementView {
  const [currentYear, currentMonth] = manilaMonth(now).split("-").map(Number);
  const year = integer(params.year, 1900, currentYear, currentYear);
  const month = integer(params.month, 1, year === currentYear ? currentMonth : 12, 0);
  const kind = scalar(params.kind);
  const oldPublisher = scalar(params.publisher);
  const scope = scalar(params.publisherScope) || (oldPublisher && `publisher:${oldPublisher}`);
  const publisherScope = scope === "unattributed" || /^publisher:[\s\S]{1,160}$/.test(scope) ? scope : null;
  const workId = scalar(params.work);
  const work = workId.length > 0 && workId.length <= 160 ? workId : null;
  const row = scalar(params.rows);
  const column = scalar(params.columns);
  const axes = row.startsWith("time:") && column.startsWith("content:") || row.startsWith("content:") && column.startsWith("time:");
  const pivot = axes ? row.startsWith("time:") : params.pivot === "yes";
  const level = choice(timeLevels, axes ? (pivot ? row : column).slice(5) : params.groupDates, "year");
  const quarter = integer(params.quarter, 1, year === currentYear ? Math.ceil(currentMonth / 3) : 4, 0);
  const fromMonth = scalar(params.fromMonth);
  const toMonth = scalar(params.toMonth);
  const latest = manilaMonth(now);
  const rangeError = (params.fromMonth !== undefined || params.toMonth !== undefined) &&
    (!validMonth(fromMonth) || !validMonth(toMonth) || fromMonth > toMonth || toMonth > latest || monthIndex(toMonth) - monthIndex(fromMonth) >= 12)
    ? "Choose a range of up to 12 months, ending no later than the current month." : null;
  const focus = scalar(params.focus);
  const validFocus = validMonth(focus) && (level === "quarter" && focus.endsWith("-01") || level === "month" && (Number(focus.slice(5)) - 1) % 3 === 0);
  return {
    year, month: month || null, quarter: !month && level === "month" ? quarter || null : null,
    kind: Object.hasOwn(kindLabels, kind) ? kind as Kind : null,
    level,
    breakdown: choice(Object.keys(breakdownLabels) as Breakdown[], axes ? (pivot ? column : row).slice(8) : params.breakdown,
      work ? "chapter" : publisherScope ? "title" : "publisher"),
    measure: choice(Object.keys(measureLabels) as Measure[], params.measure, "starts"),
    publisherScope, work,
    pivot, fromMonth, toMonth, focus: validFocus ? focus : null, rangeError,
    showTotals: params.layout === "yes" ? params.totals === "yes" : params.totals !== "no",
    page: integer(params.page, 1, 100000, 1),
  };
}

function dateKey(year: number, month: number) {
  return String(year + Math.floor((month - 1) / 12)) + "-" + String((month - 1) % 12 + 1).padStart(2, "0") + "-01";
}

function validMonth(value: string) {
  return /^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(value);
}

function monthIndex(value: string) {
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
}

function dateOfMonth(index: number) {
  return dateKey(Math.floor(index / 12), index % 12 + 1);
}

export function engagementBaseWindow(view: EngagementView, now: Date): DateWindow {
  return engagementWindow({ ...view, focus: null }, now);
}

export function engagementWindow(view: EngagementView, now: Date): DateWindow {
  if (view.fromMonth && view.toMonth && !view.rangeError) {
    let first = monthIndex(view.fromMonth);
    let last = monthIndex(view.toMonth);
    if (view.focus) {
      const focalStart = monthIndex(view.focus);
      const focalEnd = focalStart + (view.level === "quarter" ? 11 : 2);
      if (focalStart <= last && focalEnd >= first) {
        first = Math.max(first, focalStart);
        last = Math.min(last, focalEnd);
      }
    }
    return { from: dateOfMonth(first), to: dateOfMonth(last + 1), months: last - first + 1 };
  }
  const [year, month] = manilaMonth(now).split("-").map(Number);
  const start = view.month ?? (view.quarter ? (view.quarter - 1) * 3 + 1 : 1);
  const endOfYear = view.year === year ? month : 12;
  const end = view.month ?? (view.quarter ? Math.min(view.quarter * 3, endOfYear) : endOfYear);
  return { from: dateKey(view.year, start), to: dateKey(view.year, end + 1), months: end - start + 1 };
}

export function engagementUrl(view: EngagementView) {
  const fields = new URLSearchParams({
    report: "title-engagement", year: String(view.year), groupDates: view.level,
    breakdown: view.breakdown, measure: view.measure,
  });
  if (view.month) fields.set("month", String(view.month));
  if (view.quarter) fields.set("quarter", String(view.quarter));
  if (view.kind) fields.set("kind", view.kind);
  if (view.publisherScope) fields.set("publisherScope", view.publisherScope);
  if (view.work) fields.set("work", view.work);
  if (view.pivot) fields.set("pivot", "yes");
  if (view.fromMonth || view.toMonth || view.rangeError) {
    fields.set("fromMonth", view.fromMonth);
    fields.set("toMonth", view.toMonth);
  }
  if (view.focus) fields.set("focus", view.focus);
  if (!view.showTotals) fields.set("totals", "no");
  if (view.page > 1) fields.set("page", String(view.page));
  return "/admin/analytics?" + fields + "#engagement-cube";
}

export function engagementDrill(view: EngagementView, step: -1 | 1) {
  const next = timeLevels[timeLevels.indexOf(view.level) + step];
  const focus = step === -1 && next === "quarter" && view.focus ? view.focus.slice(0, 4) + "-01" : null;
  return next ? engagementUrl({ ...view, level: next, quarter: null, focus }) : null;
}

export function engagementDateMember(view: EngagementView, date: string) {
  if (view.fromMonth && view.level !== "month") {
    return engagementUrl({ ...view, focus: date.slice(0, 7), level: view.level === "year" ? "quarter" : "month" });
  }
  if (view.level === "year") return engagementDrill(view, 1);
  if (view.level === "month") return null;
  return engagementUrl({ ...view, level: "month", quarter: view.month ? null : Math.ceil(Number(date.slice(5, 7)) / 3) });
}

export function engagementContentMember(view: EngagementView, id: string) {
  if (view.breakdown === "publisher") {
    return engagementUrl({ ...view, breakdown: "title", publisherScope: id, page: 1 });
  }
  if (view.breakdown === "title") {
    return engagementUrl({ ...view, breakdown: "chapter", work: id, page: 1 });
  }
  return null;
}

export function unavailableEngagement(view: EngagementView, window: DateWindow): EngagementReport {
  const buckets = new Set<string>();
  const first = monthIndex(window.from);
  for (let month = first; month < first + window.months; month++) {
    const start = view.level === "year" ? month - month % 12 : view.level === "quarter" ? month - month % 3 : month;
    buckets.add(dateOfMonth(start));
  }
  const members = view.breakdown === "kind"
    ? Object.entries(kindLabels).filter(([kind]) => !view.kind || view.kind === kind)
      .map(([member_id, label]) => ({ member_id, label })).sort((a, b) => a.label.localeCompare(b.label))
    : [];
  return {
    buckets: [...buckets, null].map(bucket => ({ bucket, available: false, oldest_cutoff: null })),
    members, memberCount: members.length, publisherLabel: null, titleLabel: null, cells: [],
  };
}

export function engagementValue(cell: Cell | undefined, measure: Measure): number | null {
  if (!cell) return null;
  if (measure === "rate") return cell.starts === 0 ? null : cell.completions / cell.starts;
  return cell[measure];
}
