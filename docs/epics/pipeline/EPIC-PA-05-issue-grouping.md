# EPIC-PA-05: Issue Grouping and Lifecycle

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-PA-05` |
| Theme | `Pipeline` |
| Pipeline Stage | `Stage 5 — Issue Grouping and Lifecycle` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-PA-04, EPIC-PA-03 (predecessors); EPIC-PA-06, EPIC-PA-07, EPIC-PA-08 (successors)` |
| Last Updated | `n/a` |

## Description

This epic owns the issue-grouping stage of the Crashlytics pipeline — the architectural boundary where validated, symbolicated crash payloads emerging from `EPIC-PA-04` Ingestion are transformed into the unit of work that mobile developers actually triage: the *issue*. An issue is a cluster of crash occurrences sharing a single underlying root cause, identified by a normalized stack-trace fingerprint, so that thousands of identical NullPointerExceptions on a hot crash path collapse into one queue entry rather than overwhelming the on-call engineer. Per canonical Firebase guidance, Crashlytics groups crashes by stack-trace fingerprints and intelligently surfaces the circumstances that lead up to them — a property this epic depends on at its core and exposes to downstream stages as the system of record. Each issue carries an explicit lifecycle (`Open` while unresolved, `Closed` once a developer marks it as fixed, `Regressed` when a matching crash resurfaces in a newer app version than the version where the issue was closed), and the lifecycle transitions are themselves observable events that downstream stages (`EPIC-PA-08` Alerting, `EPIC-PA-10` Reliability) consume to drive paging and metrics. Manual merge and split workflows give on-call engineers an escape hatch to correct the grouping mistakes that arise when a generic exception class causes distinct root causes to share a fingerprint or when frame-pattern coincidence collapses two genuinely distinct causes into one issue — both directions of correction are first-class operations with full audit trails. Forward compatibility for AI-powered grouping (semantic-similarity clustering rather than strict fingerprint equality) is anticipated at the architecture level so the team can adopt future Firebase enhancements without rewriting upstream ingestion or downstream persistence, but the steady-state contract documented here does not depend on any AI capability shipping.

## Business Value

Without grouping, the volume of raw crash payloads arriving from `EPIC-PA-04` would be impossible for mobile developers to triage — the flood of individual reports would force teams to invent their own grouping logic externally or accept that most crashes go uninvestigated; grouping turns that flood into a manageable list of issues prioritized by impact, which is the foundation of the entire developer-facing value proposition of Crashlytics. Regression detection — the automatic transition from `Closed` to `Regressed` when a matching crash resurfaces in a newer app version — is a strong driver of crash-free-users improvement because it prevents previously fixed crashes from silently returning to production: without this signal, a fix reverted by a bad merge in a later release could go undetected for weeks while customers experience a crash the team believed was solved. Manual merge and split workflows let on-call engineers correct grouping mistakes that no fingerprinting algorithm can fully avoid, keeping the issue queue accurate and the impact metrics trustworthy. A deterministic fingerprint algorithm gives both the SDK and on-call engineers a stable reference point that survives across app versions, devices, and locales, so a long-running issue investigation can reference the same identifier in a quarterly retrospective months after the issue was first opened. AI-powered grouping forward compatibility positions the team to adopt future Firebase enhancements (semantic-similarity grouping that recognizes "two crashes in the same function on different lines are probably the same root cause") without architectural rework.

## In Scope

This epic includes the following items:

- Stack-trace fingerprinting algorithm exposed as a deterministic behavior contract — which frames participate (application frames, top-of-stack framework frames), how each frame is normalized (line numbers stripped, anonymous-function names normalized, platform-specific suffixes removed), and the property that two payloads from the same root cause produce the same fingerprint even when superficial details differ.
- Issue lifecycle state machine with three states — `Open` (initial state for a new issue), `Closed` (a developer has marked the issue as resolved), and `Regressed` (a closed issue has resurfaced in a newer app version) — plus transition rules and the property that lifecycle history is preserved across all transitions for retrospective audit.
- Automatic regression detection logic: a `Closed` issue transitions to `Regressed` when a matching crash payload arrives in a newer app version than the version where it was closed, including version-comparison semantics that handle non-semver schemes (build numbers, calendar versions, app-store version codes) commonly seen in mobile release pipelines.
- Manual merge workflow: combining two issues into one when on-call engineers identify them as duplicates, including rules for summing occurrence counts, routing future matching payloads to the merged issue, and recording the merge in the audit trail with both original issue identifiers preserved.
- Manual split workflow: dividing one issue into two or more when on-call engineers determine its payloads represent distinct root causes, including selection criteria (app version range, device class, custom-key attribute), occurrence-count recomputation, and the routing rule for future payloads that would have matched the original fingerprint.
- Issue metadata exposed to downstream stages and to the Firebase Console: title derived from the top-of-stack application frame (not from generic infrastructure frames like `dispatch_main_queue` or `Thread.run`), total occurrence count, first-seen and last-seen app versions, affected-user count, affected-device count, and lifecycle state.
- Forward-compatibility design notes for AI-powered grouping enhancements — including the constraint that the externally observable contract must remain unchanged even if the internal grouping algorithm shifts from strict fingerprint equality to semantic similarity.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- Server-side ingestion endpoints, schema validation, request authentication, and payload deduplication — owned by `EPIC-PA-04`. This epic CONSUMES the validated, deduplicated payloads produced by ingestion.
- Symbolication of obfuscated stack traces (Android ProGuard/R8 mappings, iOS dSYM resolution, NDK native symbol resolution) — owned by `EPIC-PA-03`. This epic DEPENDS on symbolicated frames as input to fingerprinting; obfuscated frames would produce noisy and unstable groupings.
- Durable storage of grouped issues, retention policy enforcement, and BigQuery export of grouped issue and occurrence history — owned by `EPIC-PA-06`. This epic PRODUCES the issue records as output; persisting and exporting them is the next stage's responsibility.
- Firebase Console rendering of issue cards, filters by severity / time / app version / device, App Quality Insights in Android Studio — owned by `EPIC-PA-07`. This epic produces the issues the dashboard renders; how they are rendered is not owned here.
- Alert generation triggered by issue lifecycle events (new-issue alerts, regression alerts, velocity alerts when occurrence rate exceeds a threshold) and notification channel routing — owned by `EPIC-PA-08`. This epic EMITS the lifecycle events the alert engine subscribes to but does not own alert configuration or channel routing.
- End-to-end pipeline SLOs (capture-rate SLO, time-to-dashboard SLO, mean-time-to-detect for emerging issues) — owned by `EPIC-PA-10`.
- Privacy controls including opt-in collection, PII redaction at capture time, and the `setCrashlyticsCollectionEnabled` runtime override — owned by `EPIC-PA-09`.

## User Stories

This epic contains 4 user stories embedded inline using H3 headings (Rule AR-1). The four stories partition the grouping stage into its core deterministic behavior (`STORY-PA-05-S01` fingerprinting and grouping), its lifecycle state-machine contract (`STORY-PA-05-S02` Open/Closed/Regressed with automatic regression detection), and the two manual override workflows that correct grouping mistakes (`STORY-PA-05-S03` merge and `STORY-PA-05-S04` split). Stories live INSIDE this epic file (Rule AR-1) to keep the epic self-contained and eliminate broken cross-file links during refactors.

### STORY-PA-05-S01: Fingerprint and group crashes by stack trace

**As a** mobile developer, **I want** crashes to be automatically grouped by stack-trace fingerprint, **so that** my triage queue shows a manageable list of distinct issues rather than a flood of individual reports that no human could realistically work through.

#### Acceptance Criteria

- **Given** two crash payloads with identical normalized stack-trace fingerprints (same application frames after normalization stripping line numbers, anonymous-function names, and platform-specific suffixes), **When** the grouping stage processes them, **Then** both payloads are assigned to the SAME issue and the issue's occurrence count is incremented to 2 rather than two separate issues being created.
- **Given** two crash payloads with different normalized fingerprints (different top-of-stack application frames, different exception classes, or any other normalized-frame divergence), **When** the grouping stage processes them, **Then** each payload is assigned to a DIFFERENT issue and the on-call engineer sees them as distinct entries in the triage queue.
- **Given** an issue is created from a freshly grouped crash payload, **When** the on-call engineer inspects it for the first time, **Then** the issue title is derived from the top-of-stack APPLICATION frame (e.g. `com.example.app.checkout.PaymentService.charge`) rather than from a generic infrastructure frame (e.g. `dispatch_main_queue`, `Thread.run`, or `java.lang.reflect.Method.invoke`) so the title is immediately recognizable to the team that owns the affected code.
- **Given** a high-volume crash that recurs across many devices and many users in a short time window, **When** payloads accumulate against the same fingerprint, **Then** the single issue's occurrence count, affected-user count, and affected-device count are all incremented accordingly — these counters are the impact signal that drives triage prioritization in the Firebase Console and in downstream alerting.

#### Notes

- Frame normalization typically strips line numbers, anonymous-function names, and platform-specific suffixes so that semantically identical crashes group together across minor source-line drift between adjacent app versions; the precise normalization rules are a Firebase-internal implementation detail and this story documents the externally observable consequence.
- Per Firebase guidance, Crashlytics intelligently groups crashes and highlights the circumstances that lead up to them — this story exposes that property as a contract that downstream stages can rely on.
- Partially obfuscated payloads (when symbolication artifacts from `EPIC-PA-03` are missing for a given build) still produce a deterministic fingerprint, but grouping stability degrades gracefully; persistent symbolication gaps should be treated as a remediation target rather than an accepted steady state.

---

### STORY-PA-05-S02: Track issue lifecycle (Open / Closed / Regressed)

**As a** mobile developer, **I want** each issue to have an explicit lifecycle state (`Open`, `Closed`, or `Regressed`), **so that** my triage queue accurately reflects which issues need attention right now and which have already been resolved or have automatically resurfaced.

#### Acceptance Criteria

- **Given** a newly grouped crash payload that does not match any existing issue's fingerprint, **When** the grouping stage creates a new issue for it, **Then** the issue's initial lifecycle state is `Open` and the issue is immediately visible in the triage queue as actionable work.
- **Given** an `Open` issue that the developer has marked as resolved via the Firebase Console (typically after shipping a fix in a release build), **When** the system records the resolution action, **Then** the issue's state transitions from `Open` to `Closed`, the state-change timestamp and acting-user identifier are recorded in the audit trail, and the issue is removed from the default active triage view while remaining retrievable for historical inspection.
- **Given** a `Closed` issue and a matching crash payload that arrives in a NEWER app version than the version where the issue was closed, **When** the grouping stage processes the payload, **Then** the issue's state transitions automatically from `Closed` to `Regressed`, the original close action is preserved in the audit trail, the regression event is emitted for downstream consumers (notably the alerting engine in `EPIC-PA-08`), and the issue resurfaces in the triage queue with a regression badge so the on-call engineer recognizes it as a previously fixed crash that has come back.
- **Given** a `Regressed` issue that the developer re-investigates and either re-resolves (after shipping a second fix) or accepts as a known regression (deferred to a later release), **When** the developer takes the corresponding action in the Firebase Console, **Then** the lifecycle state updates accordingly — back to `Closed` after re-resolution or remaining in `Regressed` with an acknowledgement flag — and the full history of all prior transitions remains visible for retrospective audit.

#### Notes

- Regression detection is a strong driver of crash-free-users improvement: it prevents previously fixed crashes from silently returning to production because of a bad merge, a reverted fix, or a refactor that reintroduces the underlying defect in a later release.
- History retention is non-negotiable: the audit trail of state transitions remains visible for retrospectives, post-incident reviews, and root-cause analysis even after the issue is `Closed` for the final time.
- The version-comparison semantics for "newer" need to handle both semver and non-semver versioning schemes commonly used in mobile release pipelines (build numbers, calendar versions, app-store-assigned version codes); this story documents the externally observable behavior rather than the internal comparison logic.

---

### STORY-PA-05-S03: Manually merge issues that share a root cause

**As an** on-call engineer, **I want** to manually merge two issues that the automated fingerprinting incorrectly split apart, **so that** my triage queue is not cluttered with grouping mistakes and the consolidated occurrence counts accurately reflect the true impact of the underlying root cause.

#### Acceptance Criteria

- **Given** two distinct issues that the on-call engineer has determined represent the same root cause (for example, two slightly different stack traces produced by the same defect across two adjacent app versions where minor frame normalization differences caused them to fingerprint differently), **When** the engineer triggers a merge action in the Firebase Console naming one as the merge target and the other as the merge source, **Then** the system combines them into a single merged issue whose occurrence count is the sum of the two originals, whose affected-user and affected-device counts are recomputed (deduplicated across the union of both originals' contributing users and devices), and whose first-seen and last-seen versions span the combined version range of the two originals.
- **Given** a completed merge action, **When** subsequent crash payloads arrive whose fingerprints match EITHER of the two original issues' fingerprints, **Then** the grouping stage routes them to the merged issue rather than creating a new issue or recreating the original split — the merge is a durable routing instruction that survives across all future payloads, not a one-time count adjustment.
- **Given** a completed merge action, **When** the on-call engineer inspects the merged issue's history, **Then** the audit trail records the merge with the timestamp, the acting-user identifier, both original issue identifiers, and the surviving merged-issue identifier preserved as references — so that any future investigator can reconstruct which issues were combined, when, and by whom, even months later.

#### Notes

- Merge is a manual override of the automated fingerprinting algorithm and should be used sparingly — frequent merge actions on the same project may indicate that the upstream symbolication stage (`EPIC-PA-03`) has gaps causing frame-normalization differences and producing avoidable splits; the systemic fix is to close those symbolication gaps rather than merge issue pairs perpetually.
- Merged issues retain their full crash occurrence history: no payload data is lost in the merge, so retrospective analysis (e.g. "how many users were affected by this defect during the v4.2 release window?") still works correctly against the merged record.
- The merge action emits an event that downstream consumers (`EPIC-PA-08` alerting, `EPIC-PA-10` reliability) can subscribe to so they can adjust their own state — for example, an alert tracking the original issue should follow the merge to the surviving issue rather than firing on a now-empty record.

---

### STORY-PA-05-S04: Manually split an issue with multiple root causes

**As an** on-call engineer, **I want** to manually split a single issue into multiple issues when its underlying crash payloads actually represent distinct root causes that the automated fingerprinting incorrectly conflated, **so that** each root cause can be triaged independently rather than being hidden inside a single misleading record.

#### Acceptance Criteria

- **Given** a single issue whose underlying crash payloads the on-call engineer has determined come from at least two distinct root causes (a common case is a top-of-stack generic exception class such as `Exception`, `NSError`, or `RuntimeException` that buries multiple genuinely different defects under one fingerprint), **When** the engineer triggers a split action providing a selection criterion (such as affected app version range, device class, OS version range, or a custom-key attribute on the payload), **Then** the system creates a NEW issue, reassigns the payloads matching the selection criterion to it, and leaves the remaining payloads on the original issue.
- **Given** a completed split action, **When** the on-call engineer inspects either the original issue or the newly created split issue, **Then** the occurrence counts, affected-user counts, affected-device counts, and first-seen/last-seen version ranges on BOTH issues are recomputed to accurately reflect the reassigned payloads — there is no risk of double-counting (a payload appearing under both issues) or undercounting (a payload disappearing from both).
- **Given** a completed split action, **When** future crash payloads arrive whose fingerprints would have matched the ORIGINAL issue, **Then** the grouping stage routes them according to the split criterion: payloads matching the criterion go to the split issue, payloads not matching the criterion go to the original issue, and the routing is durable across all future payloads rather than reverting to the pre-split fingerprint behavior.
- **Given** a completed split action, **When** the on-call engineer inspects the audit trail on either the original or the newly created issue, **Then** the audit trail records the split with the timestamp, the acting-user identifier, the split criterion, the original issue identifier, and the newly created issue identifier — so that any future investigator can reconstruct the split decision and trace each payload back to its grouping decision history.

#### Notes

- Split is the inverse of merge (`STORY-PA-05-S03`) and is most commonly used when a generic exception class causes distinct root causes to share a fingerprint — the on-call engineer recognizes from payload-level breadcrumbs, custom keys, or device-class distribution that the single issue actually conflates multiple defects.
- Like merge, split is a manual override recorded for auditability — frequent splits on issues that share a generic top frame may indicate the project would benefit from richer custom-key annotation at capture time so upstream payloads carry more discriminating attributes that the fingerprinting algorithm or the team can use to distinguish root causes earlier.
- The split criterion can target any payload attribute reliably present, including app version, device manufacturer, OS version, custom keys set via the Crashlytics SDK, or breadcrumb content; the choice of attribute is the engineer's judgment call based on the underlying root-cause hypothesis.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic. Per Rule AR-4, every epic carries 3-6 epic-level acceptance criteria; this epic carries five. These satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically to the pipeline theme for catalog uniformity.

- **Given** crash payloads arriving from `EPIC-PA-04` Ingestion (validated, deduplicated, and accompanied by symbolicated frames from `EPIC-PA-03`), **When** the grouping stage processes them, **Then** crashes with identical normalized stack-trace fingerprints are assigned to the SAME issue and crashes with different fingerprints are assigned to DIFFERENT issues — the deterministic grouping property holds across app versions, devices, and locales.
- **Given** any issue produced by this stage, **When** the on-call engineer inspects it (directly via the Firebase Console or via a downstream consumer such as `EPIC-PA-07` or the BigQuery export from `EPIC-PA-06`), **Then** the issue exposes its current lifecycle state (`Open`, `Closed`, or `Regressed`), title derived from the top-of-stack application frame, total occurrence count, affected-user count, affected-device count, and first-seen and last-seen app-version range.
- **Given** a `Closed` issue and a matching crash payload arriving in a NEWER app version than the version where the issue was closed, **When** the grouping stage detects the recurrence, **Then** the issue is automatically transitioned to `Regressed`, the regression event is emitted for downstream alerting and reliability consumers, and the original close action is preserved in the audit trail rather than overwritten.
- **Given** a merge or split action triggered by an on-call engineer in the Firebase Console, **When** the system processes it, **Then** the resulting issue topology is updated (one issue produced from two on merge, or N issues produced from one on split), occurrence and impact counts are recomputed correctly on every affected issue, future matching payloads are routed according to the new topology, and the audit trail records the action with timestamp, acting user, and both old and new issue identifiers.
- **Given** the architecture of the grouping stage, **When** the design is reviewed against the forward-compatibility goal of adopting AI-powered grouping (semantic-similarity clustering rather than strict fingerprint equality), **Then** the externally observable contract — one issue per root cause with a stable identifier, lifecycle states, manual merge and split overrides, and the documented issue metadata — remains compatible with a future internal algorithm swap, and no upstream stage (`EPIC-PA-01` through `EPIC-PA-04`) or downstream stage (`EPIC-PA-06` through `EPIC-PA-10`) requires rework to accommodate the change.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 4 embedded stories (`STORY-PA-05-S01` through `STORY-PA-05-S04`) have their acceptance criteria satisfied.
- All 5 epic-level acceptance criteria above are satisfied with documented test evidence.
- A force-crash run (the same crash reproduced multiple times in a row via the test-crash mechanism documented in the SDK get-started guides) produces exactly one issue with the corresponding occurrence count — not multiple issues with occurrence count 1 each.
- A regression workflow test is executed end-to-end: an issue is opened, marked `Closed` in the Firebase Console, a matching crash is reproduced in a higher app version, and the system surfaces the issue as `Regressed` to the on-call engineer with the regression event observable for downstream alerting consumers.
- A merge workflow test is executed: two intentionally distinct issues identified as the same root cause are merged via the Firebase Console, occurrence counts and impact counts on the merged issue match the sum (with deduplication) of the originals, future matching payloads route to the merged issue, and the audit trail records the merge with both original identifiers preserved.
- A split workflow test is executed: an issue conflating two distinct root causes (constructed deliberately by triggering two genuinely different crashes that share a top-of-stack generic frame) is split via the Firebase Console using a selection criterion, occurrence counts on both resulting issues are recomputed correctly, future payloads route per the split criterion, and the audit trail records the split with the selection criterion preserved.
- The forward-compatibility design note for AI-powered grouping enhancements is documented in this epic's References section (with the `[inferred — no direct source]` flag where applicable) and is reviewed during the architecture review milestone for the pipeline.
- The handoff contracts to `EPIC-PA-06` Persistence (issue records, occurrence records, lifecycle events, audit-trail entries) and `EPIC-PA-08` Alerting (lifecycle events such as new-issue creation, `Closed`-to-`Regressed` transitions, occurrence-count updates) are documented.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-PA-04` | Grouping consumes validated and deduplicated crash payloads from server-side ingestion; without `EPIC-PA-04` there is no validated input to group. |
| `Predecessor` | `EPIC-PA-03` | Symbolicated stack frames are the input to fingerprinting; obfuscated frames would produce noisy and unstable groupings, so symbolication must be in place for issues to be deterministically identified across builds. |
| `Successor` | `EPIC-PA-06` | Persistence stores the grouped issues, occurrence history, and lifecycle audit trail produced by this stage for long-term retention and BigQuery export. |
| `Successor` | `EPIC-PA-07` | The Firebase Console dashboard renders grouped issues as the unit of work in the on-call engineer's triage queue — issues defined here are what the dashboard displays. |
| `Successor` | `EPIC-PA-08` | Alerts (new-issue alerts, regression alerts, velocity alerts) trigger on issue lifecycle events and on occurrence-count updates emitted by this stage. |
| `Cross-Cutting` | `EPIC-PA-10` | Pipeline reliability SLOs (mean-time-to-detect for new and regressed issues, time-to-dashboard) are computed in part from the lifecycle event stream emitted by this stage. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance. Inferred content not directly traceable to a public source is flagged inline as `[inferred — no direct source]`.

- [Firebase Crashlytics — Product Overview](https://firebase.google.com/docs/crashlytics) — Documents that Crashlytics intelligently groups crashes and highlights the circumstances that lead up to them. Grounds the core grouping property exposed by `STORY-PA-05-S01` and reinforced in the epic-level acceptance criteria.
- [Firebase Crashlytics — Get Started](https://firebase.google.com/docs/crashlytics/get-started) — Documents the test-crash mechanism used in the Definition of Done to validate that repeated identical crashes produce exactly one issue rather than multiple. Grounds the force-crash validation step.
- [Firebase Crashlytics — Customize crash reports](https://firebase.google.com/docs/crashlytics/customize-crash-reports) — Documents issue lifecycle actions (close, regression handling) and the Firebase Console actions available to on-call engineers. Grounds `STORY-PA-05-S02` lifecycle state transitions and the merge/split workflows in `STORY-PA-05-S03` and `STORY-PA-05-S04`.
- [Firebase Crashlytics — Troubleshooting](https://firebase.google.com/docs/crashlytics/troubleshooting) — Documents expected console verification timing and the operational signals (such as crash-free-users) that drive triage prioritization. Grounds the impact-counter properties in `STORY-PA-05-S01` and the regression-surfacing behavior in `STORY-PA-05-S02`.
- [Crashlytics Pipeline Guide (ReverseBits)](https://reversebits.tech/blog/firebase-crashlytics-guide) — Documents that Crashlytics groups crashes by stack-trace fingerprints. Grounds the fingerprinting property at the core of `STORY-PA-05-S01` and the deterministic grouping property at the epic level.
- [Android Studio — App Quality Insights](https://developer.android.com/studio/debug/app-quality-insights) — Documents the integration that surfaces grouped issues directly inside Android Studio with severity and version filters. Grounds the issue-metadata fields (title, version range, severity context) that this epic must expose so downstream consumers can render them.
- [Keeping Apps Stable: Using Crashlytics in 2025 (Medium)](https://medium.com/@stable-apps-2025/keeping-apps-stable) — `[inferred — no direct source]` — Discusses the industry trend toward AI-powered grouping enhancements that cluster crashes by semantic similarity rather than strict fingerprint equality. Grounds the forward-compatibility design note in the In Scope section and the corresponding epic-level acceptance criterion.
