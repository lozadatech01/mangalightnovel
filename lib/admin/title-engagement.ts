import "server-only";
import { requireAdmin } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DateWindow, EngagementCatalog, EngagementReport, EngagementView } from "./title-engagement-model";

async function loadReport(db: NonNullable<ReturnType<typeof createAdminClient>>, view: EngagementView, window: DateWindow): Promise<EngagementReport | null> {
  if (view.rangeError) return null;
  if (view.breakdown === "chapter" && !view.work) return null;
  const { data, error } = await db.rpc("manga_title_engagement_hierarchy", {
    p_from: window.from, p_to: window.to, p_level: view.level, p_breakdown: view.breakdown,
    p_kind: view.kind, p_publisher_scope: view.publisherScope, p_work: view.work, p_page: view.page,
  });
  if (error || !data || !Array.isArray(data.buckets) || !Array.isArray(data.members) ||
      !Array.isArray(data.cells) || !Number.isSafeInteger(data.memberCount)) return null;
  return data as EngagementReport;
}

async function loadCatalog(db: NonNullable<ReturnType<typeof createAdminClient>>): Promise<EngagementCatalog | null> {
  const { data, error } = await db.rpc("manga_title_engagement_catalog");
  if (error || !data || !Array.isArray(data.publishers) || !Array.isArray(data.titles)) return null;
  return data as EngagementCatalog;
}

export async function loadTitleEngagement(view: EngagementView, window: DateWindow) {
  await requireAdmin();
  const db = createAdminClient();
  if (!db) return { results: null, catalog: null };
  const [results, catalog] = await Promise.all([loadReport(db, view, window), loadCatalog(db)]);
  return { results, catalog };
}
