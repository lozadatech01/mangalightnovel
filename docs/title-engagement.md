# Manga & Light Novel Title Engagement

Open **Analytics → Title Engagement** in the department admin workspace. The cube answers which titles, content types and verified publishers had eligible reading in a period. It uses the Asia/Manila start date and the `SIGNED_IN_ELIGIBLE_V1` cohort. [V1.0 report contract](https://github.com/hilocarloarmenion03/loxadaentertainmentscompany/blob/main/knowledge/specification/v1.0.md#L34168)

| Measure | Calculation |
| --- | --- |
| Read starts | One per canonical attempt after authorized delivery of the exact release. |
| Read completions | At most one per attempt, after the actual end of the same release. A late completion belongs to the original start month. |
| Distinct readers | Count eligible source account keys once within each selected cell. The count is recomputed for subtotals. The canonical work-month distinct count survives raw expiry. Other distinct counts become unavailable when the retained evidence cannot reconstruct them. |
| Completion rate | Completions divided by starts at the displayed grain. A zero-start rate is not applicable. |

## Model

- **Fact grain** is one eligible reading attempt in `manga_analytics.fact_reading_attempt`.
- **Star view** joins the fact to the start-date, reader-scope and flattened `dim_reading_unit_release` dimensions. Release-month rollups supply additive counts and work-month rollups preserve the canonical count of distinct readers.
- **Snowflake** stores work, edition, reading unit and exact release separately. Publisher attribution requires verified evidence for that exact release. Unattributed releases remain visible as such.
- **Galaxy** depends on a second independently sourced fact. The Ad Settlements tab needs reconciled ad statements and approved creator allocations before it can participate.

## Source handoff

1. Supplier and editorial workflows must create approved work, edition, ordered reading unit and exact release records, with distinct stable IDs and verified publisher evidence when applicable.
2. Reader delivery must issue a stable attempt ID tied to an eligible local account and exact release only after authorized delivery. Completion records must reference that same attempt and prove the end of the same release was reached.
3. A trusted operator populates the private dimensions and calls `manga_analytics.replace_reading_month` with the original Manila start month, increasing revision, source run ID, exclusive timestamp cutoff, approval reference, expected count and complete snapshot. Each attempt supplies `attempt_id`, `release_version_id`, `reader_key`, `started_at`, optional `completed_at`, `delivery_evidence_ref`, optional `completion_evidence_ref`, `scope_code` and `source_class`. The loader must verify the source and eligibility before calling the function. The mart validates consistency and reconciles the count in one transaction.
4. An approved empty manifest permits a zero. Historical periods require full month coverage. The current month is as of the verified cutoff. Empty or incomplete sources display Unavailable. The department admin app requests aggregate cells through a server-side service-role RPC.
5. Before enabling ingestion, schedule the owner-only `expire_reading_attempts` function under `ACTIVITY_90`, document holds in the source system, and establish the `REPORTS_24M` aggregate and manifest review from the end of the source period. Report queries already exclude expired raw rows. A complete raw replacement is rejected if it would restore expired evidence. Older corrections require approved, surviving evidence and a separate correction path. [V1.0 privacy and retention rules](https://github.com/hilocarloarmenion03/loxadaentertainmentscompany/blob/main/knowledge/specification/v1.0.md#L34560)

The current Manga database supplies account and supplier workflow data. The verified release, reading capture and scheduled loader are prerequisites for live values. The cube currently ships without seed records.
