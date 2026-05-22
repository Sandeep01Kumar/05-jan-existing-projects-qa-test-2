# EPIC-MIG-07: Analytics Event Translation

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-MIG-07` |
| Theme | `Migration` |
| Phase | `Phase 3 — Cutover Mechanics` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-MIG-02 (predecessor); EPIC-MIG-08 (successor)` |
| Last Updated | `n/a` |

## Description

This epic translates the legacy Fabric Answers analytics surface to Google Analytics for Firebase (GA4F), preserving event continuity across the migration cutover so downstream KPI tracking, funnel analysis, and marketing attribution remain accurate. Per canonical Firebase migration guidance, Google Analytics for Firebase provides the same insights as Answers while integrating closely with the rest of the Firebase suite. The translation work decomposes into three orthogonal activities: inventorying every Answers `logFoo`-style event call with its parameter signature, mapping each event to a GA4F predefined event where the semantics align (the Firebase-recommended default because predefined events unlock built-in Firebase Console reports), and creating GA4F custom events for the residual. Event-name continuity is critical because downstream analytics dashboards and KPI reports key off event names and parameter signatures; the post-migration events must therefore match the pre-migration semantics to avoid silent regression in business metrics. The Firebase project provisioning and Google Analytics enablement that this work consumes were already established in `EPIC-MIG-02`, so this epic CONSUMES the configured Analytics property and adds the event translation on top.

## Business Value

Analytics event translation preserves continuity of the business-metrics surface across the Fabric → Firebase cutover so KPI tracking, funnel analysis, and marketing attribution remain accurate during and after the migration window — without this work, every dashboard built on Answers event volumes would silently lose its data source on the legacy Fabric SDK sunset date. The translation also enables Crashlytics breadcrumb log enrichment as a secondary downstream benefit: GA4F events sent to the same Firebase project are surfaced as breadcrumbs in Crashlytics issue cards, giving on-call engineers richer context when triaging crashes. Adopting GA4F predefined events wherever the semantics align is the canonical Firebase recommendation because predefined events unlock built-in Firebase Console reports, Looker Studio templates, and BigQuery-export-compatible event schemas — a structural upgrade beyond a like-for-like swap. Consolidating onto a single analytics SDK (GA4F) also reduces ongoing maintenance by removing the duplicate event-send footprint and divergent privacy-policy surface of the legacy Answers + Firebase Analytics dual-SDK arrangement. Roles that benefit include data analysts (uninterrupted dashboards), mobile developers (one analytics SDK to maintain), on-call engineers (breadcrumb-enriched crash triage), marketing operations (continuous attribution data), and the migration program lead (a concrete analytics cutover gate that unblocks `EPIC-MIG-08` historical reconciliation).

## In Scope

The following items are included in this epic:

- Inventory of every Answers `logFoo`-style event call across all in-scope client codebases (Android, iOS, Flutter, Unity, React Native), capturing event name, parameter signature, and source-file/line location.
- Mapping of each Answers event to a GA4F predefined event where the semantics align (illustrative pairs: `logLogin` → `login`, `logSignUp` → `sign_up`, `logShare` → `share`, `logSearch` → `search`, `logViewItem` → `view_item`, `logPurchase` → `purchase`).
- Creation of GA4F custom events for Answers events that have no predefined equivalent, with snake_case names that respect GA4F event-name conventions (40-character limit, no reserved prefixes `firebase_`, `google_`, `ga_`) and parameter signatures that respect the GA4F per-event parameter limits (typically 25 parameters per event, 100-character parameter-name limit).
- Replacement of every Answers event call site with a framework-appropriate `logEvent` invocation (`FirebaseAnalytics.logEvent` on Android, `Analytics.logEvent` on iOS, `FirebaseAnalytics.instance.logEvent` on Flutter, `FirebaseAnalytics.LogEvent` on Unity, `analytics().logEvent` on React Native) targeting the translated event name and parameter signature.
- Documentation of the mapping (Answers Name → GA4F Name → Predefined-or-Custom designation → Parameter Signature → Source File) in a migration mapping table linked from the migration theme README so future auditors can trace any post-cutover GA4F event back to its pre-cutover Answers ancestor.
- Validation that translated events appear in the Firebase Console Analytics dashboard with the expected parameters and at the expected per-event volume, against a release-mode build deployed to a non-trivial test cohort.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- The Firebase project provisioning and Google Analytics enablement — owned by `EPIC-MIG-02`. This epic CONSUMES the configured Analytics property but does not create it; readiness gaps are referred back to `EPIC-MIG-02` before translation begins for that app.
- Crashlytics breadcrumb log surfacing in the issue card UI — owned by the pipeline theme (`../pipeline/EPIC-PA-07` dashboard delivery). Breadcrumb enrichment is a downstream beneficiary of this epic but the dashboard-side UX is owned by the pipeline epic.
- User identifier and personally identifiable information (PII) handling controls for analytics events that carry user IDs — owned by the pipeline theme (`../pipeline/EPIC-PA-09` privacy and compliance). Translated GA4F events may carry user identifiers (for example, values assigned via the Firebase Analytics `setUserId` API, custom user properties set via `setUserProperty`, or authenticated-user identifiers embedded in custom-event parameters); the opt-in collection mode, GDPR/CCPA controls, PII redaction policy, and `setCrashlyticsCollectionEnabled` data-collection override that govern those identifiers are owned by the pipeline epic and are out of scope for this translation work. This epic ensures translated events do not introduce new PII-bearing parameter values beyond what the original Answers events already carried; broader privacy and compliance policy controls (including the data-collection override APIs and the opt-in workflow) are deferred to `../pipeline/EPIC-PA-09`.
- General GA4F deep linking, user-property migration, e-commerce funnel setup, audience definitions, and conversion configuration — these are separate analytics work programs outside the migration scope.
- Marketing-attribution platform migrations (for example, Firebase Dynamic Links, Google Ads link configuration, third-party MMP integrations) — outside the scope of this migration epic.

## User Stories

This epic contains 4 user stories. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings (Rule AR-1). Stories live INSIDE their parent epic file to keep each epic self-contained and eliminate broken cross-file links during refactors.

### STORY-MIG-07-S01: Inventory all Answers events used by client apps

**As a** data analyst, **I want** a complete inventory of every Answers `logFoo` event call across all client apps, **so that** the translation work has a known scope and no events are silently dropped during the cutover.

#### Acceptance Criteria

- **Given** the codebase of every in-scope client app (Android, iOS, Flutter, Unity, React Native), **When** the data analyst greps for Answers event call patterns (for example, `Answers.logCustom`, `[Answers logLogin]`, `Answers.getInstance().logSignUp`, `Answers.logContentView` on iOS, and any framework-bridge equivalents in Flutter, Unity, and React Native), **Then** every event call site is captured in the inventory with no dynamically constructed event-name pattern missed.
- **Given** the assembled inventory, **When** the data analyst reviews each entry, **Then** every event has its name, parameter signature, declaring source file, and line number documented in a single source-of-truth document reviewed by at least one stakeholder per in-scope platform.
- **Given** any platform-specific event call that differs across platforms for what is logically the same event, **When** the analyst reviews the variation, **Then** the divergence is documented (for example, "iOS uses `Answers.logLogin` while Android uses `Answers.logCustom("login_event")` — to be unified under GA4F `login`") so the post-cutover GA4F surface is uniform across platforms.
- **Given** the inventory is complete, **When** the data analyst hands it off to `STORY-MIG-07-S02`, **Then** the inventory is committed to the migration program documentation as the authoritative input to the translation mapping table and is referenced by ID from the migration theme README.

#### Notes

- Tools such as `ripgrep` (`rg "Answers\\."`) or IDE "Find Usages" can accelerate inventory; results must be cross-validated by code review to avoid missing dynamically constructed event names (e.g., `Answers.logCustomEvent(named: eventNameVariable)`).
- The inventory should also capture deprecated Answers event types (`logContentView`, `logRating`, `logInvite`, `logLevelStart`, etc.) because some have direct GA4F predefined equivalents picked up by `STORY-MIG-07-S02`.

---

### STORY-MIG-07-S02: Map Answers events to GA4F predefined events where semantically equivalent

**As a** mobile developer, **I want** every Answers event mapped to a GA4F predefined event where the semantics align, **so that** the post-migration events benefit from GA4F's native reporting in the Firebase Console and Looker Studio templates.

#### Acceptance Criteria

- **Given** the inventory from `STORY-MIG-07-S01`, **When** the developer reviews each event against the canonical GA4F predefined-events list, **Then** every Answers event that has a clear predefined equivalent is mapped (illustrative examples: `logLogin` → `login`, `logSignUp` → `sign_up`, `logShare` → `share`, `logSearch` → `search`, `logViewItem` → `view_item`, `logPurchase` → `purchase`, `logAddToCart` → `add_to_cart`, `logBeginCheckout` → `begin_checkout`).
- **Given** the mapping is complete, **When** the developer reviews it, **Then** at least 50% of inventoried Answers events have a predefined GA4F equivalent (illustrative target — the actual ratio depends on the app's event mix and is agreed during `EPIC-MIG-01` inventory) and the remainder are explicitly flagged for `STORY-MIG-07-S03` custom-event translation.
- **Given** any predefined GA4F event with REQUIRED parameters (for example, `purchase` requires `value` and `currency`; `add_to_cart` requires the `items` array), **When** the developer translates the call site, **Then** the required parameters are populated correctly with values sourced from the original Answers payload and the translated call site is smoke-tested against a debug build.
- **Given** any Answers event whose parameter signature is richer than the closest GA4F predefined event's signature, **When** the developer maps it, **Then** the additional Answers parameters are preserved as custom parameters on the predefined event (GA4F allows custom parameters on predefined events) and the mapping table records both the predefined-event name and the carried-over custom parameter list.

#### Notes

- Google Analytics for Firebase provides many predefined events recommended for use; refer to the [GA4F predefined events documentation](https://support.google.com/analytics/answer/9322688) for the full list. Predefined events are strongly preferred because they unlock built-in Firebase reports and standardized BigQuery export schemas.
- The 50% predefined-event ratio is illustrative and not a hard gate; apps with rich e-commerce surfaces map almost 100% to predefined events, while apps with bespoke gameplay or content-engagement events tend to require more custom events under `STORY-MIG-07-S03`.

---

### STORY-MIG-07-S03: Translate residual Answers events to GA4F custom events

**As a** mobile developer, **I want** every Answers event without a predefined GA4F equivalent translated to a GA4F custom event with a stable name and parameter signature, **so that** no analytics data is lost across the cutover and the residual events follow a documented naming convention.

#### Acceptance Criteria

- **Given** the residual Answers events flagged by `STORY-MIG-07-S02` as having no predefined GA4F equivalent, **When** the developer creates GA4F custom events for each, **Then** each custom event has a snake_case name matching GA4F event-name conventions (under 40 characters, no reserved prefix `firebase_`, `google_`, or `ga_`) and a documented parameter signature that respects GA4F's per-event parameter limits.
- **Given** a custom event name is chosen, **When** the developer records it in the mapping table, **Then** the entry captures the Answers Name → GA4F Name → `Custom` designation → Parameter Signature → Source File so the residual mapping is auditable end-to-end and uniform across the in-scope client platforms.
- **Given** any Answers event with parameters that cannot be represented one-to-one as GA4F event parameters (for example, oversized payloads, structured objects, or arrays beyond GA4F's parameter-value limits), **When** the developer addresses the payload, **Then** the payload is truncated, hashed, or split into multiple parameters per GA4F's parameter limits, and the chosen representation is documented in the mapping table's "Notes" column.
- **Given** any custom event name conflicts with a reserved GA4F prefix (`firebase_`, `google_`, `ga_`), **When** the developer reviews the candidate name, **Then** the name is renamed to a non-reserved alternative and the rename is recorded in the mapping table so downstream reviewers can trace the chosen name back to its proposed predecessor.

#### Notes

- GA4F custom events typically have a 25-parameters-per-event limit and a 100-character parameter-name limit; ensure the translation respects these constraints. The full set of GA4F naming and parameter rules is documented in the [Firebase Analytics — Log events](https://firebase.google.com/docs/analytics/events) reference.
- For parameter names that would clash with GA4F's auto-collected parameters (for example, `firebase_screen`, `firebase_screen_class`, `firebase_event_origin`), choose application-specific alternatives to avoid silent collision at ingestion time.

---

### STORY-MIG-07-S04: Validate translated events appear in Firebase Console Analytics dashboard

**As a** data analyst, **I want** to validate that translated events appear correctly in the Firebase Console Analytics dashboard with the expected parameters and volumes, **so that** I can confirm event continuity before declaring the analytics translation complete and before `EPIC-MIG-08` reconciliation runs.

#### Acceptance Criteria

- **Given** a release-mode build of an in-scope client app with translated events deployed to a non-trivial test cohort, **When** test users exercise event-emitting flows (login, sign-up, search, view-item, purchase, plus app-specific custom-event flows), **Then** the events appear in the Firebase Console Analytics → Events view within the configured streaming latency (typically minutes to a few hours, depending on the GA4F streaming or standard tier configured in the project).
- **Given** any predefined or custom event with parameters, **When** the data analyst inspects the event in the Firebase Console, **Then** every parameter is populated with the expected value type and range, and any auto-collected GA4F parameters (`firebase_screen`, `engagement_time_msec`, `session_id`) are also present per the GA4F default collection contract.
- **Given** the post-cutover GA4F event volume for a specific event over an agreed observation window, **When** the analyst compares the volume to the pre-cutover Answers event volume for the same logical event over an equivalently sized window, **Then** the volumes are within an agreed tolerance (the tolerance value is application-dependent and is agreed during `EPIC-MIG-01` inventory; this story validates the comparison process, not a specific tolerance number).
- **Given** any event missing from the GA4F dashboard after the validation window elapses, **When** the analyst investigates the gap, **Then** the root cause is identified (illustrative causes: SDK not initialized on a specific platform, translated call site not deployed in the active release, opt-in collection disabled for the test cohort, event-name typo in the translated code) and remediated, and the validation is re-run against the corrected build before the epic is considered exit-ready.

#### Notes

- GA4F's [DebugView](https://firebase.google.com/docs/analytics/debugview) feature can accelerate validation on debug builds by surfacing events in real time rather than waiting for the streaming ingest tier; DebugView requires the device or emulator to be in debug-mode collection, which is opt-in per device.
- Volume tolerance for the pre-vs-post comparison is illustrative; the actual tolerance should be agreed with marketing-operations and data-analytics stakeholders during `EPIC-MIG-01` inventory so the validation gate is calibrated to the app's traffic profile.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4). They satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically to the pipeline theme for catalog uniformity.

- **Given** the complete Answers event inventory produced by `STORY-MIG-07-S01`, **When** the developer cross-references it against the GA4F translation produced by `STORY-MIG-07-S02` and `STORY-MIG-07-S03`, **Then** every Answers event has either a predefined or custom GA4F counterpart and no inventoried Answers event remains untranslated.
- **Given** the migration mapping table at the time the epic is audited, **When** an auditor reviews it, **Then** every entry contains the columns `Answers Name`, `GA4F Name`, `Predefined or Custom`, `Parameter Signature`, and `Source File`, and the table is linked from the migration theme README.
- **Given** translated events deployed in release-mode builds of every in-scope client app, **When** the data analyst checks the Firebase Console Analytics → Events view, **Then** each translated event appears with its parameters populated and the per-event volume matches the pre-cutover Answers volume within the tolerance agreed during `EPIC-MIG-01` inventory.
- **Given** every custom GA4F event introduced by `STORY-MIG-07-S03`, **When** an auditor reviews the names against GA4F naming conventions, **Then** every name follows snake_case, is under 40 characters, does not begin with a reserved prefix (`firebase_`, `google_`, `ga_`), and parameter names are unique within the event and under the 100-character limit.
- **Given** the 4 embedded stories' acceptance criteria are satisfied and the validation in `STORY-MIG-07-S04` confirms expected event behavior in the Firebase Console, **When** the migration program lead audits the epic, **Then** analytics continuity is declared and `EPIC-MIG-08` historical data reconciliation can confidently proceed.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 4 embedded stories' acceptance criteria are satisfied for every in-scope client app (Android, iOS, Flutter, Unity, React Native).
- All 5 epic-level acceptance criteria are satisfied across every in-scope client platform and Firebase project.
- The Answers event inventory document is complete, reviewed by at least one data-analyst stakeholder per platform, and committed to the migration program documentation.
- The migration mapping table (Answers Name → GA4F Name → Predefined-or-Custom → Parameter Signature → Source File) is published and linked from the migration theme README.
- All translated events appear in the Firebase Console Analytics → Events view of each in-scope Firebase project with their parameters populated and at the expected per-event volume.
- GA4F predefined events are used wherever the semantics align (Firebase guidance recommends predefined events); custom events are used only for the residual, and the predefined-vs-custom split is recorded in the mapping table.
- No Answers event call site remains active in any in-scope client app after this epic completes — every original `Answers.logFoo(...)` call has been replaced with the framework-appropriate `logEvent` invocation against the translated GA4F event name and parameter signature.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-MIG-02` | The Firebase project must exist and Google Analytics for Firebase must be enabled BEFORE translated events have a destination — without an enabled Analytics property, `logEvent` calls succeed at the SDK layer but the events have no ingest endpoint, so the validation in `STORY-MIG-07-S04` would fail trivially. `EPIC-MIG-02` owns project provisioning and Analytics enablement; this epic CONSUMES the configured Analytics property. |
| `Successor` | `EPIC-MIG-08` | Historical data migration's reconciliation step compares pre- and post-cutover analytics volumes against the mapping table produced by this epic; analytics translation must complete before reconciliation runs so the reconciliation has a stable, authoritative Answers-to-GA4F mapping to query against and the GA4F event surface has had time to accumulate the observation window the reconciliation needs. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance. Where canonical guidance varies across GA4F tiers (streaming vs. standard ingest, free vs. paid BigQuery export), this epic notes both supported approaches rather than prescribing a single answer.

- [Firebase Crashlytics iOS Migration Guide (crashlytics-migration-ios)](https://github.com/FirebaseExtended/crashlytics-migration-ios) — Documents that Google Analytics for Firebase provides the same insights as Answers while integrating closely with the rest of the Firebase suite, and that GA4F provides many predefined events recommended for use; grounds the description's framing of GA4F as the canonical Answers replacement.
- [Google Analytics for Firebase Predefined Events](https://support.google.com/analytics/answer/9322688) — Canonical predefined-events list against which `STORY-MIG-07-S02` performs the predefined-event mapping; grounds the illustrative `logLogin → login`, `logSignUp → sign_up`, `logShare → share`, `logSearch → search` mappings.
- [Firebase Analytics — Log events](https://firebase.google.com/docs/analytics/events) — Documents the `logEvent` API and parameter conventions for predefined and custom events across the Apple, Android, web, Flutter, Unity, and C++ SDKs; grounds the call-site replacement contract and the custom-event naming rules in `STORY-MIG-07-S03`.
- [Firebase Crashlytics — Customize crash reports (breadcrumb logs)](https://firebase.google.com/docs/crashlytics/customize-crash-reports#get_breadcrumb_logs) — Confirms that Crashlytics breadcrumb log enrichment requires Google Analytics for Firebase to be enabled in the same Firebase project; grounds the Business Value claim about breadcrumb enrichment as a secondary downstream benefit.
- [Firebase Analytics — Set a user ID](https://firebase.google.com/docs/analytics/userid) — Documents the canonical `setUserId` API and the contract for user identifiers in Firebase Analytics, including the GA4F guidance that values assigned to `setUserId` must not contain personally identifiable information; grounds the Out of Scope cross-theme boundary that defers user-ID and PII handling controls to `../pipeline/EPIC-PA-09` privacy and compliance.
