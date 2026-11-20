"use client";

import { useState } from "react";
import { blankPerson, contributorRoles, creatorTextLimit, maxPeople, territories, type RightsInput } from "@/lib/portal/creator-intake";

export default function CreatorRightsFields({ initial, saved }: { initial: RightsInput; saved: RightsInput }) {
  const [draft, setDraft] = useState(initial);
  return <>
    <input type="hidden" name="creatorRights" value={JSON.stringify(draft)} />
    <label>Creator and rights holders
      <select value={draft.mode} onChange={event => setDraft({ ...draft, mode: event.target.value })}>
        <option value="">Choose one</option>
        <option value="solo">I’m the sole creator and rights holder</option>
        <option value="shared">Other contributors or rights holders are involved</option>
      </select>
    </label>
    {draft.mode === "shared" ? (["contributors", "claimants"] as const).map(key => {
      const name = key === "contributors" ? "contributor" : "rights holder";
      const update = (rows: RightsInput[typeof key]) => setDraft({ ...draft, [key]: rows });
      return <fieldset key={key}>
        <legend>{key === "contributors" ? "Contributors" : "Rights holders"}</legend>
        {draft[key].map((row, index) => <fieldset className="mt-3 space-y-2" key={index}>
          <legend>{key === "contributors" ? "Contributor" : "Rights holder"} {index + 1}</legend>
          <label>First or single name<input maxLength={Math.max(creatorTextLimit, saved[key][index]?.first.length ?? 0)} value={row.first} onChange={event => update(
            draft[key].map((person, i) => i === index ? { ...person, first: event.target.value } : person))} /></label>
          <label>Last name (optional)<input maxLength={Math.max(creatorTextLimit, saved[key][index]?.last.length ?? 0)} value={row.last} onChange={event => update(
            draft[key].map((person, i) => i === index ? { ...person, last: event.target.value } : person))} /></label>
          {key === "contributors" ? <label>Role<select value={row.role} onChange={event => update(
            draft[key].map((person, i) => i === index ? { ...person, role: event.target.value } : person))}>
            <option value="">Choose a role</option>
            {Object.entries(contributorRoles).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select></label> : null}
          <button type="button" onClick={() => update(draft[key].filter((_, i) => i !== index))}>Remove {name} {index + 1}</button>
        </fieldset>)}
        {draft[key].length < maxPeople ? <button className="mt-3" type="button" onClick={() => update([...draft[key], blankPerson])}>Add {name}</button> : null}
      </fieldset>;
    }) : null}
    <label>Where may Loxada publish this edition?
      <select value={draft.territory} onChange={event => setDraft({ ...draft, territory: event.target.value })}>
        <option value="">Choose a territory</option>
        {Object.entries(territories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </label>
    <details open={Boolean(draft.from || draft.until)}>
      <summary>Set publication dates (optional)</summary>
      <div className="mt-3 space-y-2">
        <label>Proposed start<input type="date" value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /></label>
        <label>Proposed end<input type="date" value={draft.until} onChange={event => setDraft({ ...draft, until: event.target.value })} /></label>
      </div>
    </details>
  </>;
}
