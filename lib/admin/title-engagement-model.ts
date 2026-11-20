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
  page: number;
};
export type DateWindow = { from: string; to: string; months: number };
export type Bucket = { bucket: string | null; available: boolean; oldest_cutoff: string | null };
export type Member = { member_id: string; label: string };
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
  const work = publisherScope && workId.length > 0 && workId.length <= 160 ? workId : null;
  const level = choice(timeLevels, params.groupDates, "year");
  const quarter = integer(params.quarter, 1, year === currentYear ? Math.ceil(currentMonth / 3) : 4, 0);
  return {
    year, month: month || null, quarter: !month && level === "month" ? quarter || null : null,
    kind: Object.hasOwn(kindLabels, kind) ? kind as Kind : null,
    level,
    breakdown: work ? "chapter" : publisherScope ? "title" : choice(["kind", "title", "publisher"] as const, params.breakdown, "publisher"),
    measure: choice(Object.keys(measureLabels) as Measure[], params.measure, "starts"),
    publisherScope, work,
    pivot: params.pivot === "yes",
    page: integer(params.page, 1, 100000, 1),
  };
}

function dateKey(year: number, month: number) {
  return String(year + Math.floor((month - 1) / 12)) + "-" + String((month - 1) % 12 + 1).padStart(2, "0") + "-01";
}

export function engagementWindow(view: EngagementView, now: Date): DateWindow {
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
  if (view.page > 1) fields.set("page", String(view.page));
  return "/admin/analytics?" + fields + "#engagement-cube";
}

export function engagementDrill(view: EngagementView, step: -1 | 1) {
  const next = timeLevels[timeLevels.indexOf(view.level) + step];
  return next ? engagementUrl({ ...view, level: next, quarter: null }) : null;
}

export function engagementDateMember(view: EngagementView, date: string) {
  if (view.level === "year") return engagementDrill(view, 1);
  if (view.level === "month") return null;
  return engagementUrl({ ...view, level: "month", quarter: view.month ? null : Math.ceil(Number(date.slice(5, 7)) / 3) });
}

export function engagementContentMember(view: EngagementView, id: string) {
  if (view.breakdown === "publisher") {
    return engagementUrl({ ...view, breakdown: "title", publisherScope: id, work: null, page: 1 });
  }
  if (view.breakdown === "title" && view.publisherScope) {
    return engagementUrl({ ...view, breakdown: "chapter", work: id, page: 1 });
  }
  return null;
}

export function unavailableEngagement(view: EngagementView, window: DateWindow): EngagementReport {
  const buckets = new Set<string>();
  const first = Number(window.from.slice(5, 7));
  for (let month = first; month < first + window.months; month++) {
    const start = view.level === "year" ? 1 : view.level === "quarter" ? Math.floor((month - 1) / 3) * 3 + 1 : month;
    buckets.add(dateKey(view.year, start));
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
