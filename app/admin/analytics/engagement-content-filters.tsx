"use client";

import { useState } from "react";
import { kindLabels, type EngagementCatalog, type EngagementView } from "@/lib/admin/title-engagement-model";

export default function EngagementContentFilters({ catalog, view }: {
  catalog: EngagementCatalog | null;
  view: EngagementView;
}) {
  const [publisher, setPublisher] = useState(view.publisherScope ?? "");
  const [title, setTitle] = useState(view.work ?? "");
  const [kind, setKind] = useState<string>(view.kind ?? "");
  const availableTitles = (catalog?.titles ?? []).filter(item =>
    (!publisher || item.scopes.includes(publisher)) && (!kind || kind === item.kind));
  const titleValue = availableTitles.some(item => item.id === title) ? title : "";

  return (
    <>
      <label>Content level
        <select name="breakdown" defaultValue={view.breakdown}>
          <option value="publisher">Publishers</option>
          <option value="title">Titles</option>
          <option value="chapter">Chapters</option>
          {view.breakdown === "kind" ? <option value="kind">Content types</option> : null}
        </select>
      </label>
      <label>Publisher
        <select name="publisherScope" value={publisher} disabled={!catalog?.publishers.length}
          onChange={event => setPublisher(event.target.value)}>
          <option value="">{catalog?.publishers.length ? "All publishers" : "No publishers available"}</option>
          {publisher && !catalog?.publishers.some(item => item.id === publisher) ? <option value={publisher}>Publisher unavailable</option> : null}
          {catalog?.publishers.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label>Title
        <select name="work" value={titleValue} disabled={!availableTitles.length} onChange={event => setTitle(event.target.value)}>
          <option value="">{availableTitles.length ? "All titles" : "No titles available"}</option>
          {availableTitles.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label>Content type
        <select name="kind" value={kind} onChange={event => setKind(event.target.value)}>
          <option value="">All content types</option>
          {Object.entries(kindLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
    </>
  );
}
