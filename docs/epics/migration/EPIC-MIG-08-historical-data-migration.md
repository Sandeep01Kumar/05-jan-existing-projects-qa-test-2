# EPIC-MIG-08: Historical Data Migration

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-MIG-08` |
| Theme | `Migration` |
| Phase | `Phase 4 — Data Reconciliation` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-MIG-06, EPIC-MIG-07 (predecessors); EPIC-MIG-09 (successor)` |
| Last Updated | `n/a` |

## Description

This epic migrates historical crash data from the legacy Fabric organization to the corresponding Firebase project via the Firebase migration page, ensuring that crash history accumulated under the legacy SDK is preserved and addressable inside the new Firebase Crashlytics surface after the cutover. Historical data continuity is essential for trend analysis, regression detection, and audit/compliance use cases that span the Fabric → Firebase cutover boundary — without it, every dashboard, report, and incident retrospective that references pre-cutover crash data would lose its data source on the legacy Fabric SDK sunset date. The epic also reconciles pre-cutover Fabric issue counts against post-migration Firebase issue counts so that the cutover validation team (owned by `EPIC-MIG-09`) can compare crash-volume parity in dual-running validation against a known historical baseline rather than against an unverified zero. Per the canonical Firebase migration model, a Firebase project is analogous to a Fabric organization, so the historical data migration is conceptually a 1-to-1 mapping of organizational data that overlays cleanly on the project-to-organization mapping established in `EPIC-MIG-02`. After this epic completes, historical Crashlytics issues — including their original capture timestamps, device distributions, and stack trace fingerprints — are accessible in the Firebase Console alongside the new post-cutover data, and the reconciliation report unblocks `EPIC-MIG-09` validation sign-off.

## Business Value

Historical data continuity allows data analysts and SREs to compare crash trends across the Fabric → Firebase cutover boundary without manual data joins or external spreadsheet reconciliation, which is critical for long-window stability analyses (multi-month regression hunts, seasonal pattern reviews, release-cohort comparisons) that begin before the cutover and end after it. Pre- and post-cutover issue count reconciliation is a hard prerequisite for the parity comparison performed in `EPIC-MIG-09` — without a reconciled baseline, the dual-running validation in that successor epic cannot interpret whether observed volume differences reflect a real stability regression, a translation error in the migration, or merely the new SDK's documented improved capture rate. Audit and compliance teams require continuous crash records, especially when investigating long-lived issues that span the cutover (for example, a user-reported intermittent failure first observed three months before cutover and still occurring after), and the migrated historical data prevents these investigations from stalling on missing pre-cutover context. Product teams can use the migrated data to evaluate whether the cutover itself introduced any change in user-facing stability — for example, whether crash-free-users rates shift detectably after the SDK swap, which is a routine release-quality signal that depends on continuous historical comparison. Roles that benefit include data analysts (continuous trend analysis), SREs (long-window regression detection), audit/compliance reviewers (uninterrupted crash records), product managers (continuous crash-free-users analysis), and the migration program lead (a concrete data-reconciliation gate that unblocks `EPIC-MIG-09` cutover sign-off).

## In Scope

The following items are included in this epic:

- Use the Firebase migration page to migrate historical Crashlytics data from each in-scope Fabric organization to the corresponding Firebase project, executing the migration once per organization on a 1-to-1 mapping with the project provisioning established in `EPIC-MIG-02`.
- Verify that migrated historical issues appear in the Firebase Console Crashlytics dashboard with their original capture timestamps, device distributions, and stack trace fingerprints preserved — fingerprint preservation is critical because Firebase Crashlytics groups crashes by stack trace fingerprint, so any fingerprint mismatch would cause historical issues to appear as net-new post-cutover issues and silently break trend analysis.
- Reconcile pre-cutover Fabric issue counts against post-migration Firebase issue counts for an agreed comparison window (illustratively, the trailing 30 days before cutover, with the actual window agreed during `EPIC-MIG-01` inventory based on the app's traffic and seasonality profile).
- Document the migration page workflow for each Fabric organization being migrated, including any platform-specific or organization-specific eligibility checks, prerequisites, or migration-page error conditions encountered, so the workflow is reproducible for late-arriving organizations and so audit reviewers can trace any post-migration data back to a recorded migration step.
- Capture any data that does not migrate cleanly (for example, unsupported event types, deprecated attribute fields, or eligibility gaps) and document each gap in a "Known Gaps" register that becomes an authoritative input to stakeholder sign-off; every gap must be either resolved by re-migration or explicitly accepted as a known risk.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- The Firebase project provisioning itself — owned by `EPIC-MIG-02`. This epic CONSUMES the configured Firebase project as the destination of the historical data migration but does not create it; readiness gaps in project provisioning are referred back to `EPIC-MIG-02` before migration begins for that organization.
- The platform SDK migrations that generate post-cutover crash data — owned by `EPIC-MIG-03` (Android), `EPIC-MIG-04` (iOS), and `EPIC-MIG-05` (Flutter, Unity, React Native). The historical data migration covered here addresses pre-cutover data only; post-cutover data is generated by the SDK migrations owned by those sibling epics.
- BigQuery export of historical data — owned by the pipeline theme (`../pipeline/EPIC-PA-06`). If BigQuery export is not yet enabled when this epic runs, historical data is still accessible via the Firebase Console UI for trend analysis; BigQuery-backed analyses are unblocked once `../pipeline/EPIC-PA-06` completes.
- Real-time crash collection from the new SDK — owned by the pipeline theme (`../pipeline/`). This epic moves history; it does not collect new crashes.
- The legacy Fabric SDK removal from client codebases — owned by `EPIC-MIG-10` (Fabric SDK decommission). Historical data migration runs while the legacy SDK may still be present in non-production builds; the decommission of the legacy SDK is a downstream activity.

## User Stories

This epic contains 3 user stories. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings (Rule AR-1). Stories live INSIDE their parent epic file to keep each epic self-contained and eliminate broken cross-file links during refactors. This epic is intentionally compact at 3 stories because the migration page workflow itself is largely self-service via the Firebase Console; the engineering complexity sits in the reconciliation report and the "Known Gaps" documentation rather than in the migration page action itself.

### STORY-MIG-08-S01: Migrate historical Crashlytics data via the Firebase migration page

**As a** migration program lead, **I want** historical Crashlytics data migrated from the Fabric organization to the corresponding Firebase project via the Firebase migration page, **so that** trend analysis and regression detection remain continuous across the cutover boundary and no audit-relevant crash history is lost on the legacy Fabric SDK sunset date.

#### Acceptance Criteria

- **Given** a Firebase project that has been provisioned by `EPIC-MIG-02` and linked to the corresponding Fabric organization, **When** the program lead navigates to the Firebase migration page for that project, **Then** the migration page lists the Fabric organization's apps with their bundle identifiers visible and offers a historical data migration action for each app.
- **Given** the migration page action has been initiated for an app, **When** the migration completes successfully, **Then** the Firebase Console Crashlytics dashboard for that app shows historical crash issues, each dated to its original Fabric capture timestamp rather than to the migration run time, and each preserving its original stack trace fingerprint so issue grouping remains continuous across the cutover.
- **Given** the migration page reports any errors, warnings, or partial migrations for an app or dataset, **When** the program lead reviews the migration log, **Then** every non-migrated dataset or partially migrated dataset is documented in a "Known Gaps" section of the migration program documentation with the affected app, the affected data range, the reported error, and a remediation decision (re-migrate, accept as known risk, or escalate).
- **Given** multiple Fabric organizations are in scope for the migration program, **When** each is migrated 1-to-1 to its corresponding Firebase project, **Then** each corresponding Firebase project shows only its own organization's historical data and no cross-organization data leakage is observed in any of the migrated Firebase Console dashboards.

#### Notes

- Per the canonical Firebase migration guidance, a Firebase project is analogous to a Fabric organization, so the migration page is structured around this 1-to-1 mapping. For cross-platform apps, the Firebase-recommended pattern is a single Firebase project containing both the Android and iOS versions; ensure the organizational mapping established during `EPIC-MIG-02` reflects this pattern before running the migration page action.
- The Firebase migration page may have eligibility requirements (for example, the Fabric organization must still be active, or specific app bundle identifiers must be linked before migration is offered). Verify eligibility during `EPIC-MIG-01` inventory so the migration page does not fail unexpectedly when it is run here.

---

### STORY-MIG-08-S02: Reconcile pre- and post-cutover issue counts

**As a** data analyst, **I want** pre-cutover Fabric issue counts reconciled against post-migration Firebase issue counts, **so that** I can confirm no historical data was lost during the migration and so that downstream parity comparisons in `EPIC-MIG-09` dual-running validation are interpretable against a known baseline.

#### Acceptance Criteria

- **Given** pre-cutover Fabric issue counts for a defined comparison window (illustratively, the trailing 30 days before cutover; the actual window is agreed during `EPIC-MIG-01` inventory based on the app's traffic profile and seasonality), **When** the data analyst queries the same window in the Firebase Console post-migration, **Then** the issue count difference is within an agreed tolerance (illustratively ±5%, agreed during readiness; the analyst documents the observed delta even when it is within tolerance).
- **Given** any issue present in Fabric for the pre-cutover window but absent from Firebase post-migration, **When** the data analyst investigates the absence, **Then** the missing issue is either documented in the "Known Gaps" register with a root-cause classification (for example, "unsupported event type", "eligibility gap", "fingerprint divergence") OR a re-migration is performed to recover the issue and the reconciliation is re-run against the post-recovery dataset.
- **Given** any issue present in Firebase for the pre-cutover window but absent from Fabric (an unexpected direction of discrepancy), **When** the data analyst investigates, **Then** the discrepancy is explained against canonical Firebase guidance (for example, the new SDK's documented improved Android capture, attribution to a fingerprint-merging change, or a timestamp-boundary edge case) and the explanation is recorded in the reconciliation report rather than left unaddressed.
- **Given** the reconciliation is complete for every in-scope app and Fabric organization, **When** the analyst publishes the reconciliation report, **Then** the report is committed to the migration program documentation, linked from the migration theme `README.md`, and explicitly referenced from the entry criteria of `EPIC-MIG-09` so the successor epic consumes a known reconciliation baseline rather than an implicit one.

#### Notes

- The reconciliation report is a hard prerequisite for the `EPIC-MIG-09` parity comparison — without it, dual-running parity numbers cannot be interpreted meaningfully because there is no baseline to compare against. The reconciliation report should therefore be published before the cutover window opens, not after.
- The ±5% tolerance is illustrative only; actual tolerance should be agreed with stakeholders during the readiness epic (`EPIC-MIG-01`) based on the app's traffic profile, the agreed comparison window, and the stakeholder appetite for "Known Gaps" coverage. Apps with very low traffic in the comparison window may require a larger tolerance or a longer window to produce a statistically meaningful signal.

---

### STORY-MIG-08-S03: Confirm historical data accessibility in the Firebase Console

**As a** data analyst, **I want** to confirm that migrated historical Crashlytics data is accessible and queryable in the Firebase Console alongside post-cutover data, **so that** trend analysis, regression detection, and audit reviews can span the cutover boundary without manual data joins or out-of-band spreadsheets.

#### Acceptance Criteria

- **Given** the Firebase Console Crashlytics dashboard for an app whose historical data has been migrated, **When** the data analyst applies a time filter spanning the cutover boundary (for example, "last 90 days" where the cutover sits in the middle of that window), **Then** the dashboard displays both pre- and post-cutover issues seamlessly within the same view, with no visual discontinuity at the cutover timestamp and no missing buckets for the pre-cutover sub-range.
- **Given** a long-lived historical issue that was migrated from Fabric and that has continuing occurrences post-cutover, **When** the data analyst opens the issue card in the Firebase Console, **Then** the card shows the issue's original Fabric capture date as the issue's first-seen timestamp, the original device distribution preserved from Fabric, and the original stack trace fingerprint such that the post-cutover occurrences are grouped under the same issue rather than appearing as a separate net-new issue.
- **Given** the BigQuery export integration is enabled for the Firebase project (this is owned by `../pipeline/EPIC-PA-06` and is a conditional, not hard, dependency for this story), **When** the data analyst queries the BigQuery dataset for the cutover-spanning window, **Then** the historical data is queryable alongside new data via the same schema with no schema-version skew between pre- and post-migration rows.

#### Notes

- BigQuery queryability of historical data is conditional on the pipeline theme's `../pipeline/EPIC-PA-06` epic completing. If BigQuery export is not yet enabled when this story is validated, the analyst can still confirm historical data accessibility via the Firebase Console UI; the BigQuery acceptance criterion above becomes a follow-up validation once `EPIC-PA-06` completes, and that conditionality is recorded in the reconciliation report.
- Stack trace fingerprint preservation across the migration is critical because Firebase Crashlytics groups crashes by fingerprint; loss of fingerprint continuity would cause historical issues to appear as net-new post-cutover issues even though their underlying stack traces are identical. If fingerprint divergence is observed, it must be raised in the "Known Gaps" register because it materially affects the interpretation of trend analyses that depend on issue identity stability across the cutover.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4). They satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically with the pipeline theme for catalog uniformity.

- **Given** the Firebase migration page is available for every in-scope Firebase project, **When** the program lead initiates migration for every in-scope Fabric organization on the 1-to-1 organization-to-project mapping established in `EPIC-MIG-02`, **Then** every initiation completes successfully or has its non-completion explicitly recorded in the "Known Gaps" register with a remediation decision, and no organization remains unprocessed.
- **Given** the reconciliation report produced by `STORY-MIG-08-S02`, **When** the data analyst publishes it for review, **Then** pre- and post-cutover issue counts differ by no more than the agreed tolerance (illustratively ±5%, or as configured during `EPIC-MIG-01` readiness), and any deltas observed within tolerance are still documented for traceability.
- **Given** the Firebase Console Crashlytics dashboard after the migration is complete, **When** a data analyst applies a time filter spanning the cutover boundary, **Then** both pre- and post-cutover issues are visible within the same view without manual joins, and a long-lived historical issue shows continuous occurrence counts that span the cutover under a single issue identifier.
- **Given** every documented "Known Gaps" entry produced by `STORY-MIG-08-S01` and `STORY-MIG-08-S02`, **When** stakeholders review the register before cutover sign-off, **Then** each gap is either resolved (by re-migration or remediation) or accepted as a known risk with explicit, named stakeholder sign-off recorded inline with the entry.
- **Given** the migration program documentation, **When** the migration program lead audits the catalog before handing off to `EPIC-MIG-09`, **Then** the reconciliation report is linked from the migration theme `README.md`, the "Known Gaps" register is published, and `EPIC-MIG-09` entry criteria explicitly reference both artifacts as inputs to dual-running validation.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 3 embedded stories (`STORY-MIG-08-S01`, `STORY-MIG-08-S02`, `STORY-MIG-08-S03`) have their acceptance criteria satisfied for every in-scope Fabric organization and corresponding Firebase project.
- All 5 epic-level acceptance criteria are satisfied across every in-scope organization-to-project pair.
- The Firebase migration page has been run successfully (or has had its non-completion explicitly recorded in the "Known Gaps" register) for every in-scope Fabric organization.
- The reconciliation report is published and linked from the migration theme `README.md`, with its tolerance value, comparison window, per-app counts, and per-app deltas documented inline.
- The "Known Gaps" register is documented with explicit, named stakeholder sign-off recorded against each gap entry; no gap remains in an "unresolved" or "under review" state at epic exit.
- The Firebase Console time-spanning filter returns continuous data across the cutover boundary for every in-scope app, with no visual discontinuity at the cutover timestamp.
- Stack trace fingerprint preservation has been verified for at least one long-lived issue per in-scope app, confirming that post-cutover occurrences group under the same issue identifier as the pre-cutover history.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-MIG-06` | Symbol and mapping upload cutover must be complete so that historical data with symbolicated stacks is meaningful in the Firebase Console — without symbolicated stacks, the migrated historical issues would surface with obfuscated tokens and the fingerprint-based grouping verification in `STORY-MIG-08-S03` would be impossible to interpret reliably. |
| `Predecessor` | `EPIC-MIG-07` | Analytics translation must be complete so that any Google Analytics for Firebase events linked to historical crash data (for example, breadcrumb logs derived from translated Answers events) are not orphaned at the time of the reconciliation report, and so the reconciliation analyst can correlate historical crashes against a stable analytics surface rather than a half-translated one. |
| `Successor` | `EPIC-MIG-09` | Test-crash validation and cutover sign-off in `EPIC-MIG-09` depend on reconciled pre/post-cutover issue counts produced here — without the reconciliation baseline, the dual-running parity comparison in `EPIC-MIG-09` cannot distinguish a true stability regression from a migration artifact or from documented Known Gaps. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance. Where the canonical guidance describes the migration as a self-service Firebase Console action rather than a programmatic API, this epic preserves that framing rather than prescribing automation that is not part of the public guidance.

- [Firebase Crashlytics iOS Migration Guide (crashlytics-migration-ios)](https://github.com/FirebaseExtended/crashlytics-migration-ios) — Establishes the canonical Firebase project ≈ Fabric organization analogy and documents the historical data migration workflow; grounds the description's 1-to-1 organization-to-project mapping framing and the In Scope item that runs the migration page once per organization.
- [Firebase Crashlytics Documentation Home](https://firebase.google.com/docs/crashlytics) — Canonical Crashlytics product documentation; grounds the Firebase Console dashboard, issue card, and stack trace fingerprint grouping references used throughout `STORY-MIG-08-S03`.
- [Firebase Blog — It's time to upgrade to the new Firebase Crashlytics SDK](https://firebase.blog/posts/2020/10/its-time-to-upgrade-to-new-firebase/) — Documents the November 15 sunset of the legacy Fabric SDK and the improved Android capture rate of the new SDK; grounds the Description's "legacy Fabric SDK sunset date" framing and the Business Value claim that explains why pre/post-cutover deltas may show the new SDK capturing more crashes than the legacy SDK did for the same window.
