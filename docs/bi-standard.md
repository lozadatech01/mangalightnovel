# Loxada BI standard

The [Loxada OLAP reporting standard](https://github.com/hilocarloarmenion03/admin/blob/main/loxada/olap-reporting.md) applies across all repositories and systems. Apply this checklist to department and management **analytics reports**, including accounts and later product reporting. Keep analytical controls and results separate from operational forms, even when they share a screen.

- Start with the decision, source, fact grain, measure definitions, access rules and refresh cadence. State when a value is current, historical, or unavailable.
- Provide a useful initial view and a multidimensional table wherever the data supports it. Use readable names, units, and local time.
- **Slice** by one dimension. **Dice** by combining dimensions and, where useful, selecting multiple members. **Pivot** the same measures between row and column dimensions.
- **Drill down and up** on real hierarchies, such as year → month or account group → account type. Keep filters when switching levels.
- **Drill through** a count to the authorized, matching detail records. Carry all filters, and keep them on pagination or search. Never substitute a differently scoped list.
- Validate subtotal and grand-total reconciliation, filter boundaries, access permissions and the distinction between zero, missing and unavailable. Do not expose record identifiers in aggregate payloads.
- Don't force a meaningless hierarchy. If an operation does not fit the data, document why.

## Account Analysis

**Account Analysis** is a separate view under Account Access at `/admin/accounts?view=analysis#account-analysis`. Account Access opens to Manage accounts by default. Slice by account group, access status, or date range. Dice by combining those filters or selecting multiple specific account types. Choose year, quarter, or month directly, or use the drill controls and selectable year or quarter headings. Drill up to a broader grouping while keeping the applied date range. Pivot with the same counts and filters, or choose the dimensions from Table layout. Dates use Asia/Manila calendar boundaries.

The measure is current account count, grouped by portal registration date or department admin role assignment date. Current access status is separate from account date and is not a historical suspension snapshot. Staff sign-in status is not tracked by this report. Staff counts are aggregate-only and cannot open individual staff records. The user/supplier directory still excludes staff. A supplier record can exist before invitation setup or verification is complete.

The department's service-only database function supplies user and supplier aggregates. After the admin check, the server also aggregates only the department admin role timestamps. Positive portal-only cells and subtotals open their matching account records with exact quarter/month bounds. Mixed staff and portal totals are not linked. The report shows when the source was checked and distinguishes unavailable counts from zero. Report and directory filters are independent. This uses current department data, with no warehouse, fake history, or cross-department totals.

Verify with `node --test tests/account-cube.test.mjs` and compare linked counts with the filtered account list totals.

[Project-wide BI and data design](https://github.com/hilocarloarmenion03/admin/tree/main/loxadawide)

## Reading and advertising reports

Under **Account Access → Account Analysis**, choose **View reader accounts** to explore real reader registrations and current access status. Slice by date or status, combine those filters to dice, drill through year, quarter, and month, and pivot registration period and status. Linked counts open the matching reader accounts.

The separate **Analytics** panel has **Title Engagement** and **Ad Settlements** tabs. In Title Engagement, drill Publisher → Title → Chapter and Year → Quarter → Month independently. Slice by Manila start date, dice by combining date, publisher and content type, and pivot the same results. Choose starts, completions, distinct readers or completion rate. The cube distinguishes covered zero from unavailable dates. Ad Settlements waits for reconciled ad statements and approved creator allocations. [V1.0 Title Engagement and Ad Settlements definitions](https://github.com/hilocarloarmenion03/loxadaentertainmentscompany/blob/main/knowledge/specification/v1.0.md#L34168)

See [the Title Engagement data contract](title-engagement.md) for the operational sources, retention and verification rules.
