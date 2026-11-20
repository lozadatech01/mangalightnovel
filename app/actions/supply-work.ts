"use server";

import { decodeRights, parseRights } from "@/lib/portal/creator-intake";
import { redirect } from "next/navigation";
import { requireAdmin, requirePortal } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { profiles } from "@/lib/portal/supply-profiles";
import { inputText, integer, optionalId, parseFields, supplyFieldsForStep, type SupplyDetail, type SupplyFormState } from "@/lib/portal/supply-model";

const failures: Record<string, string> = {
  invalid: "Check the fields, including the dates and quantities.",
  denied: "This record is unavailable to this account.",
  changed: "This record changed in another session. Open its latest version before making further edits.",
  duplicate: "This source identity, invitation, or source revision is already recorded. Open the existing record to continue.",
  identity: "The source identity is fixed after submission. Use the same source identifiers for a revision.",
  qualification: "Current supply qualification is required to submit.",
  invitation: "A current invitation for the exact approved brief is required.",
  application: "An eligible supplier application is required.",
};

export async function saveSupplyWork(state: SupplyFormState, form: FormData): Promise<SupplyFormState> {
  const { user, account } = await requirePortal();
  const profile = profiles[account.account_type];
  if (!profile) redirect("/portal");
  const step = account.account_type === "creator" ? form.get("titleStep") === "rights" ? "rights" : "details" : undefined;
  const editedFields = supplyFieldsForStep(profile.fields, step);
  const attempted = Object.fromEntries(["title", ...editedFields.map(field => field.key)].map(key => [key, inputText(form.get(key)).slice(0, 2000)]));
  if (step === "rights") attempted.creatorRights = inputText(form.get("creatorRights")).slice(0, 16000);
  const failure = (error: string) => ({ error, attempted, reset: (state.reset ?? 0) + 1 });
  const target = optionalId(form.get("item"));
  const expected = integer(form.get("expected"), 2147483646, 0);
  const intent = inputText(form.get("intent"));
  const invitation = optionalId(form.get("invitation"));
  if (!target || expected === null || !["draft", "submit"].includes(intent)) return failure(failures.invalid);
  if (step === "details" && intent === "submit") return failure("Open Rights for review to submit this title.");
  if (step === "rights" && expected === 0) return failure("Save the title details first.");
  const parsed = parseFields(step === "rights" ? editedFields.filter(field => field.key === "claim_evidence") : editedFields, form, intent === "submit");
  if (step === "rights" && attempted.creatorRights.length >= 16000) return failure("The contributor or rights holder list is too long.");
  const rights = step === "rights" ? decodeRights(attempted.creatorRights) : null;
  if (step === "rights" && !rights) return failure("Check the contributor and rights holder entries.");
  const structured = rights ? parseRights(rights, intent === "submit") : { values: {} };
  if (!structured.values) return failure(structured.error);
  if (!parsed.values) return failure(parsed.error);
  const db = createAdminClient();
  if (!db) return failure("Supplier work is temporarily unavailable.");
  let prior: SupplyDetail | null = null;
  if (step && expected > 0) {
    const { data, error } = await db.rpc("supplier_work_read", {
      p_actor: user.id, p_item: target, p_version: expected, p_page: 1,
    });
    if (error) return failure("The title could not be opened. Try again.");
    prior = data?.selected ?? null;
    if (!prior) return failure(failures.changed);
  }
  const title = step === "rights" ? prior?.title ?? "" : inputText(form.get("title"));
  if (title.length < 2 || title.length > 160) return failure("Enter a title between 2 and 160 characters.");
  const editedKeys = new Set(editedFields.map(field => field.key));
  const preserved = Object.entries(prior?.fields ?? {}).filter(([key, value]) =>
    !editedKeys.has(key) || (step === "rights" && key !== "claim_evidence" && typeof value === "string" && !Object.hasOwn(structured.values, key)));
  const values = {
    ...Object.fromEntries(preserved),
    ...parsed.values,
    ...structured.values,
  };
  if (step === "rights" && intent === "submit" && supplyFieldsForStep(profile.fields, "details").some(field =>
    values[field.key] === undefined || (field.choices && !Object.hasOwn(field.choices, String(values[field.key]))))) {
    return failure("Finish the title details before submitting for review.");
  }
  const { data, error } = await db.rpc("supplier_work_save", {
    p_actor: user.id, p_item: target, p_expected: expected, p_intent: intent, p_title: title,
    p_fields: values, p_invitation: invitation,
  });
  if (error || data !== "saved") return failure(failures[data] ?? "The record could not be saved. Try again.");
  const nextStep = step && intent === "draft" ? "&section=rights" : "";
  redirect(`/portal/supply?item=${target}&notice=${intent}${nextStep}`);
}

export async function qualifySupply(form: FormData) {
  const staff = await requireAdmin();
  const target = optionalId(form.get("application"));
  const revoke = optionalId(form.get("revoke"));
  const expected = inputText(form.get("applicationRevision"));
  const evidence = inputText(form.get("evidence"));
  const assessment = inputText(form.get("assessment"));
  const tab = "/admin/supply-work?view=qualification";
  if (!target || Number.isNaN(Date.parse(expected)) ||
      (!revoke && (form.get("confirmed") !== "yes" || evidence.length < 3 || evidence.length > 240 || assessment.length < 10 || assessment.length > 1500))) {
    redirect(tab + "&result=invalid");
  }
  const db = createAdminClient();
  if (!db) redirect(tab + "&result=unavailable");
  const { data, error } = await db.rpc("supplier_work_qualify", {
    p_staff: staff.id, p_application: target, p_expected: expected,
    p_evidence: evidence, p_assessment: assessment, p_revoke: revoke,
  });
  redirect(tab + "&result=" + (error || !["saved", "changed", "denied", "invalid"].includes(data) ? "unavailable" : data));
}


export async function requestSupplyClarification(form: FormData) {
  const staff = await requireAdmin();
  const item = optionalId(form.get("item"));
  const version = integer(form.get("version"), 2147483647);
  const message = inputText(form.get("feedback"));
  if (!item || !version) redirect("/admin/supply-work");
  const target = `/admin/supply-work?item=${item}&version=${version}`;
  if (message.length < 5 || message.length > 1500) redirect(target + "&result=feedback-invalid");
  const db = createAdminClient();
  if (!db) redirect(target + "&result=unavailable");
  const { data, error } = await db.rpc("supplier_work_request_clarification", {
    p_staff: staff.id, p_item: item, p_version: version, p_message: message,
  });
  redirect(target + "&result=" + (error ? "unavailable" : data === "saved" ? "feedback-saved" : "changed"));
}
