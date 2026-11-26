"use client";

import { useState } from "react";
import { breakdownLabels, timeLevels, type EngagementView } from "@/lib/admin/title-engagement-model";

const axes = [
  ...timeLevels.map(level => ({ value: "time:" + level, label: level[0].toUpperCase() + level.slice(1) })),
  ...Object.entries(breakdownLabels).map(([level, label]) => ({ value: "content:" + level, label })),
];

export default function EngagementAxes({ view }: { view: EngagementView }) {
  const time = "time:" + view.level;
  const content = "content:" + view.breakdown;
  const [rows, setRows] = useState(view.pivot ? time : content);
  const [columns, setColumns] = useState(view.pivot ? content : time);

  function choose(value: string, axis: "rows" | "columns") {
    const current = axis === "rows" ? rows : columns;
    const other = axis === "rows" ? columns : rows;
    const conflicts = value.split(":")[0] === other.split(":")[0];
    if (axis === "rows") {
      setRows(value);
      if (conflicts) setColumns(current);
    } else {
      setColumns(value);
      if (conflicts) setRows(current);
    }
  }

  return <>
    <label>Rows<select name="rows" value={rows} onChange={event => choose(event.target.value, "rows")}>
      {axes.map(axis => <option key={axis.value} value={axis.value}>{axis.label}</option>)}
    </select></label>
    <label>Columns<select name="columns" value={columns} onChange={event => choose(event.target.value, "columns")}>
      {axes.map(axis => <option key={axis.value} value={axis.value}>{axis.label}</option>)}
    </select></label>
  </>;
}
