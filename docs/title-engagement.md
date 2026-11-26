# Manga & Light Novel Title Engagement

Open **Analytics → Title Engagement** in the department admin workspace. The cube answers which titles, content types and verified publishers had eligible reading in a period. It uses the Asia/Manila start date and the `SIGNED_IN_ELIGIBLE_V1` cohort. [V1.0 report contract](https://github.com/hilocarloarmenion03/loxadaentertainmentscompany/blob/main/knowledge/specification/v1.0.md#L34168)

In **Table setup**, choose **List by**, **Compare across**, and **Reading measure**. Under **Filter reading activity**, set the inclusive Manila month range. The cube supports one date axis and one content axis, with up to 12 months per selection. Choose a publisher or title to filter the results and select **Apply view**. The summary uses the same verified totals as the table. **Include table totals** controls the table margins.

Open a publisher or title heading to drill into its content. Open a year or quarter to drill into that period. The date toolbar rolls up or drills across the selected range, and **Swap axes** transposes the table. Reading starts count eligible chapter attempts after authorized delivery.

| Measure | Calculation |
| --- | --- |
| Read starts | One per canonical attempt after authorized delivery of the exact release. |
| Read completions | At most one per attempt, after the actual end of the same release. A late completion belongs to the original start month. |
| Distinct readers | Count eligible source account keys once within each selected cell. The count is recomputed for subtotals. The canonical work-month distinct count survives raw expiry. Other distinct counts become unavailable when the retained evidence cannot reconstruct them. |
| Completion rate | Completions divided by starts at the displayed grain. A zero-start rate is not applicable. |

## Model

- **Fact grain** is one eligible reading attempt in `manga_analytics.fact_reading_attempt`.
- **Star view** joins the fact to the start-date, reader-scope and flattened `dim_reading_unit_release` dimensions. Release-month rollups supply additive counts and work-month rollups preserve the canonical count of distinct readers.
- **Snowflake** stores work, edition, chapter and exact release separately. Publisher attribution requires verified evidence for that exact release. A title can appear under more than one verified publisher when its releases differ. Chapters use their edition-specific reading-unit IDs, so multiple release versions of one chapter roll up together. Unattributed releases remain visible as such.
- **Galaxy** depends on a second independently sourced fact. The Ad Settlements tab needs reconciled ad statements and approved creator allocations before it can participate.

## Source handoff

1. Supplier and editorial workflows must create approved work, edition, ordered reading unit and exact release records, with distinct stable IDs and verified publisher evidence when applicable.
2. Reader delivery must issue a stable attempt ID tied to an eligible local account and exact release only after authorized delivery. Completion records must reference that same attempt and prove the end of the same release was reached.
3. A trusted operator populates the private dimensions and calls `manga_analytics.replace_reading_month` with the original Manila start month, increasing revision, source run ID, exclusive timestamp cutoff, approval reference, expected count and complete snapshot. Each attempt supplies `attempt_id`, `release_version_id`, `reader_key`, `started_at`, optional `completed_at`, `delivery_evidence_ref`, optional `completion_evidence_ref`, `scope_code` and `source_class`. The loader must verify the source and eligibility before calling the function. The mart validates consistency and reconciles the count in one transaction.
4. An approved empty manifest permits a zero. Historical periods require full month coverage. The current month is as of the verified cutoff. Empty or incomplete sources display Unavailable. The department admin app requests aggregate cells through a server-side service-role RPC.
5. Before enabling ingestion, schedule the owner-only `expire_reading_attempts` function under `ACTIVITY_90`, document holds in the source system, and establish the `REPORTS_24M` aggregate and manifest review from the end of the source period. Report queries already exclude expired raw rows. A complete raw replacement is rejected if it would restore expired evidence. Older corrections require approved, surviving evidence and a separate correction path. [V1.0 privacy and retention rules](https://github.com/hilocarloarmenion03/loxadaentertainmentscompany/blob/main/knowledge/specification/v1.0.md#L34560)

The cube requires verified release and delivery evidence for live values.

### Scheduled local delivery loads

The database refreshes eligible local delivery months every six hours. The warehouse owner registers each verified Manila start month and its coverage evidence in `manga_analytics.reading_source_coverage`. Register a month only when capture covered the period from its first day, including verifiable inactivity before launch. Unregistered months stay unavailable. Set `enabled = false` to pause future loads. No coverage approvals are seeded.

The job builds a stable, ordered snapshot of the same-release delivery attempts and reconciles its count through the transactional month loader. Late completions update their original start month. A previously loaded external source requires operator reconciliation before takeover. Once the first day is outside the 90-day raw window, historical corrections require separate review using surviving authorized evidence. Daily expiry removes expired raw mart rows. Monitor both named jobs in `cron.job_run_details`.

### Publishing chapter pages

The trusted release handoff uses the exact release ID as the catalog source key. In one transaction, create the verified work, edition, chapter and release dimensions, the authorized catalog listing, and its ordered chapter_pages records. Page numbers run from one through the common page count. Use plain text for a light novel page or a private reading-pages bucket object key for a Manga image (PNG, JPEG, WebP, up to 8 MiB). Treat published page content and objects as immutable and mint a fresh release version for corrections. Set withdrawn_at on a listing to stop delivery. Register known test or internal reader IDs in customer_catalog.excluded_readers before use. Record a documented source hold in retain_until when applicable.

A signed-in reader opens a released chapter from the catalog. The reader loads one page at a time. The server issues a signed page receipt bound to the account, attempt, exact release and page. Acknowledgement after delivery records one start. Finishing the final page records at most one completion after all preceding pages were acknowledged.

### Supplier chapter delivery

For an existing verified edition and exact release, the trusted intake operator opens a chapter_deliveries row with the submitted item ID, revision, exact release ID, expected page count, current submission permission reference and deadline. The supplier opens that submitted title in the supply panel and sends each numbered page. The application validates and re-encodes raster images as private WebP objects, normalizes submitted text and hashes the delivered bytes. Page submissions are immutable. A corrected set needs a fresh release and permit.

After independently checking the manifest and evidence, the trusted publisher calls supply_work.publish_worldwide_chapter with the delivery ID, verified manifest digest, scoped grant, editorial and publication evidence references and effective time window. This handoff supports verified worldwide website grants. The function checks the complete manifest, applicant status and exact current submitted revision and atomically publishes the catalog entry and ordered pages. Only the trusted database workflow owner can publish. Record a withdrawal in customer_catalog.listings.withdrawn_at immediately when publication authority changes. The separate submission permission deadline controls the supplier upload window.
