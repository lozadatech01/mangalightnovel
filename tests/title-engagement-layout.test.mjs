import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";

const hook = registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === "./account-cube-model" ? specifier + ".ts" : specifier, context);
  },
});
const { engagementView, engagementWindow, engagementDateMember, engagementDrill, unavailableEngagement } =
  await import("../lib/admin/title-engagement-model.ts");
hook.deregister();

const now = new Date("2026-11-26T04:00:00Z");
const params = { rows: "time:year", columns: "content:publisher", fromMonth: "2025-11", toMonth: "2026-03", layout: "yes" };

function follow(url) {
  return engagementView(Object.fromEntries(new URL(url, "https://example.com").searchParams), now);
}

test("chooses rows, columns and the inclusive month range independently of totals", () => {
  const view = engagementView(params, now);
  assert.equal(view.pivot, true);
  assert.equal(view.breakdown, "publisher");
  assert.equal(view.showTotals, false);
  const window = engagementWindow(view, now);
  assert.deepEqual(window, { from: "2025-11-01", to: "2026-04-01", months: 5 });
  assert.deepEqual(unavailableEngagement(view, window).buckets.map(row => row.bucket), ["2025-01-01", "2026-01-01", null]);
});

test("drills into a specific year and quarter and rolls back up through the same year", () => {
  const year = engagementView(params, now);
  const quarter = follow(engagementDateMember(year, "2025-01-01"));
  const month = follow(engagementDateMember(quarter, "2025-10-01"));
  assert.deepEqual(engagementWindow(month, now), { from: "2025-11-01", to: "2026-01-01", months: 2 });
  assert.equal(follow(engagementDrill(month, -1)).focus, "2025-01");
  assert.equal(follow(engagementDrill(quarter, -1)).focus, null);
});

test("rejects a reversed, future, or wider than supported range", () => {
  for (const toMonth of ["2025-10", "2026-12", "2026-11"]) assert.ok(engagementView({ ...params, toMonth }, now).rangeError);
});
