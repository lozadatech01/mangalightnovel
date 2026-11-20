"use client";

import CreatorRightsFields from "./creator-rights-fields";
import { creatorTextLimit, decodeRights, readRights } from "@/lib/portal/creator-intake";
import { useActionState, useId } from "react";
import { saveSupplyWork } from "@/app/actions/supply-work";
import { displayValue, supplyFieldsForStep, type CreatorTitleStep, type SupplyProfile, type Values } from "@/lib/portal/supply-model";

export default function SupplyForm({ profile, item, invitation, revision, title, values, canSubmit, titleStep }: {
  profile: SupplyProfile;
  item: string;
  invitation: string | null;
  revision: number;
  title: string;
  values: Values;
  canSubmit: boolean;
  titleStep?: CreatorTitleStep;
}) {
  const [result, action, saving] = useActionState(saveSupplyWork, { error: "" });
  const helpId = useId();
  const savedRights = readRights(values);
  const titleLimit = titleStep ? Math.max(creatorTextLimit, title.length) : 160;

  return <form className="sp-form" action={action} key={result.reset}>
    <input type="hidden" name="item" value={item} />
    <input type="hidden" name="invitation" value={invitation ?? ""} />
    <input type="hidden" name="expected" value={revision} />
    {titleStep ? <input type="hidden" name="titleStep" value={titleStep} /> : null}
    {result.error ? <p role="alert" className="sr-alert">{result.error}</p> : null}
    {titleStep !== "rights" ? <label>{titleStep ? "Title (up to 10 characters for new titles)" : "Title"}<input name="title" required minLength={2} maxLength={titleLimit}
      defaultValue={result.attempted?.title ?? title} /></label> : null}
    {titleStep === "rights" ? <CreatorRightsFields initial={decodeRights(result.attempted?.creatorRights ?? "") ?? savedRights} saved={savedRights} /> : null}
    {titleStep === "rights" && typeof values.contributors === "string" ? <p className="sr-note">Earlier versions contain the original notes. Add the people and territory here to use the structured form.</p> : null}
    {supplyFieldsForStep(profile.fields, titleStep).filter(field => titleStep !== "rights" || field.key === "claim_evidence").map(field => {
      const value = result.attempted?.[field.key] ?? displayValue(field, values[field.key]);
      const description = field.help ? `${helpId}-${field.key}` : undefined;
      const legacyChoice = field.choices && value && !Object.hasOwn(field.choices, value);
      const input = { name: field.key, defaultValue: value, "aria-describedby": description };
      const control = <>
        <label>{field.label}
          {field.type === "choice"
            ? <select {...input}><option value="">Select</option>
                {legacyChoice ? <option value={value} disabled>{value} (previous value)</option> : null}
                {Object.entries(field.choices ?? {}).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            : field.type === "long"
              ? <textarea {...input} maxLength={field.maxLength} rows={3} />
              : field.type === "money" || field.type === "integer"
                ? <input {...input} type="number" min={field.type === "money" ? 0 : 1}
                    max={field.type === "money" ? "9999999999.99" : 999999999} step={field.type === "money" ? "0.01" : "1"} />
                : <input {...input} type={field.type === "date" ? "date" : "text"} maxLength={field.maxLength} />}
        </label>
        {field.help ? <p className="sr-note" id={description}>{field.help}</p> : null}
      </>;
      return titleStep === "rights" && !field.required
        ? <details key={field.key} open={Boolean(value)}>
            <summary>Add supporting references (optional)</summary>
            <div className="mt-3">{control}</div>
          </details>
        : <div key={field.key}>{control}</div>;
    })}
    <div className="sr-actions">
      <button name="intent" value="draft" disabled={saving}>{saving ? "Saving…" : titleStep === "details" ? "Save and continue" : "Save draft"}</button>
      {canSubmit && titleStep !== "details" ? <button name="intent" value="submit" disabled={saving}>Submit for review</button> : null}
    </div>
  </form>;
}
