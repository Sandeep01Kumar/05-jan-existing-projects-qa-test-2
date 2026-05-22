# EPIC-PA-07: Dashboard Delivery

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-PA-07` |
| Theme | `Pipeline` |
| Pipeline Stage | `Stage 7 — Dashboard Delivery (TERMINAL stage of the user's stated range)` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-PA-06 (predecessor); EPIC-PA-08 (successor for alerts surfaced on the dashboard)` |
| Last Updated | `n/a` |

## Description

This epic owns the TERMINAL pipeline stage and the user-facing endpoint of the inclusive range *"from crash capture to dashboard delivery"* the user requested — every upstream epic (`EPIC-PA-01` capture through `EPIC-PA-06` persistence) exists to make THIS rendering accurate, timely, and actionable. Crash data persisted in `EPIC-PA-06` is rendered in the Firebase Console as **issue cards** — each card represents one issue (a fingerprint group from `EPIC-PA-05`) and surfaces title (derived from the top-of-stack application frame), status (`Open` / `Closed` / `Regressed`), occurrence count, affected-user count, and affected-version range. Filters allow on-call engineers to narrow the issue list by severity (fatal vs. non-fatal vs. ANR), time window, app version, device, OS version, and (for Android) Google Play track — per canonical Firebase guidance, the dashboard integrates with Google Play to filter crash reports by Google Play track in the Crashlytics dashboard. The dashboard is the SINGLE PANE OF GLASS for triage: every subsequent action — from acknowledging an alert from `EPIC-PA-08` to opening a Jira ticket against a regression — originates from a click on this surface. App Quality Insights brings the dashboard into Android Studio so mobile developers see crash data directly in their IDE, and the IDE provides a browser link to the Crashlytics dashboard page for deeper inspection. The dashboard is reachable within five minutes of a force-crash plus cold relaunch in a healthy pipeline — the canonical end-to-end latency target documented in the Firebase Crashlytics troubleshooting guidance and the same window that anchors `EPIC-PA-10` (time-to-dashboard SLO) and `EPIC-MIG-09` (Test-Crash Validation).

## Business Value

The dashboard is the highest-value pipeline output: every upstream stage exists to make this rendering accurate, timely, and actionable, and a degradation here invalidates the entire pipeline's value regardless of how healthy capture, transport, ingestion, grouping, and persistence are operating in isolation. Issue cards turn raw crash data into a triage queue prioritized by user impact — affected-user count, occurrence count, affected-version range, and lifecycle status are surfaced directly on the card, collapsing the time from "a crash happened" to "I know which fix to prioritize" into a single glance. Filters let teams answer rapid, targeted operational questions — "what's broken in the latest release?", "which devices regress this version?", "is the beta candidate safe to promote to production?" — without writing queries or exporting data, the difference between a tool that supports release decisions and one that informs them after the fact. The App Quality Insights integration in Android Studio reduces context-switching by surfacing crash data directly where Android developers already work. A documented 5-minute end-to-end latency target converts pipeline health from ambient intuition into a measurable signal that can be alerted on (via `EPIC-PA-10` synthetic monitoring), preventing the silent-failure trap of a stalled pipeline producing a deceptively quiet dashboard.

## In Scope

This epic includes the following items:

- Firebase Console issue cards rendering: title derived from the top-of-stack application frame, status (`Open` / `Closed` / `Regressed`) per `EPIC-PA-05` lifecycle, occurrence count, affected-user count, and affected-version range — each card a single-glance summary of one fingerprint group.
- Issue detail view: full symbolicated stack trace (per `EPIC-PA-03`), breadcrumb timeline (sourced from the Google Analytics for Firebase integration per `EPIC-MIG-07`), custom keys (`setCustomKey(...)` values), custom logs (`log(...)` messages), user identifiers (`setUserId(...)` values subject to privacy controls per `EPIC-PA-09`), affected-device breakdown by manufacturer and model, and affected-OS-version breakdown.
- Filter set: by issue status (`Open` / `Closed` / `Regressed`), by severity (fatal vs. non-fatal vs. ANR), by time window (last 24 hours, last 7 days, custom range), by app version, by device class, and by OS version — applied individually or combined.
- Android-specific filter: Google Play track (production, beta, alpha, internal testing) per canonical Firebase guidance — exposed only when the Firebase project is linked to a Google Play app and used to separate pre-release stability signals from production stability signals.
- App Quality Insights window in Android Studio: top crash and non-fatal events grouped by device manufacturer and Android version, filters that mirror the Firebase Console dashboard (severity, time, app version), and a one-click browser link from any in-IDE issue back to the corresponding Crashlytics dashboard page for deeper inspection.
- Customizable crash-report setup surfaced on the dashboard: opt-in reporting indicators (per `EPIC-PA-09` controls), custom logs visible on the issue detail view, custom keys visible on the issue detail view, and non-fatal error tracking surfaced alongside fatal crashes with severity differentiation.
- 5-minute end-to-end latency target from capture through dashboard visibility, documented as the canonical service-level expectation per Firebase troubleshooting guidance and adopted as the time-to-dashboard SLO in `EPIC-PA-10`.
- Surfacing of alerts (generated by `EPIC-PA-08`) on the dashboard as clickable links and badges on the corresponding issue card, where the alert engine itself remains owned by `EPIC-PA-08`.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- Stack-trace fingerprinting and the issue grouping algorithm that decides which crashes share a card — owned by `EPIC-PA-05`. This epic CONSUMES the grouped issues but does not own how they are defined.
- Durable storage of crashes and the BigQuery export that feeds downstream Looker Studio or Grafana dashboards — owned by `EPIC-PA-06`. This epic READS from the persisted surface but does not own retention, indexing, or the BigQuery linkage.
- Custom non-Firebase dashboards (Looker Studio, Grafana, or other visualization tools sourced from BigQuery) — owned by `EPIC-PA-06`. This epic owns the FIREBASE CONSOLE dashboard specifically; downstream visualizations are out of scope here.
- Alert generation (velocity alerts, regression alerts, new-issue alerts) and notification channel routing (Slack, Jira, email) — owned by `EPIC-PA-08`. Alerts are SURFACED on the dashboard via clickable links and badges, but the alert engine itself, the velocity threshold computation, and the channel fan-out are owned by `EPIC-PA-08`.
- Crash data privacy controls: opt-in collection, PII redaction policy for what is safe to log via `setCustomKey` and `log` calls, user-ID handling discipline, and GDPR / CCPA data-subject rights — owned by `EPIC-PA-09`. This epic respects the controls established there when rendering data on the dashboard (notably the redaction of user identifiers when privacy posture requires it) but does not own the controls themselves.
- Pipeline-level SLOs and error-budget policy — owned by `EPIC-PA-10`. This epic documents the 5-minute end-to-end latency target as a service-level expectation but defers the SLO declaration, synthetic monitoring, and error-budget tracking to `EPIC-PA-10`.
- Symbolication and the upload of mapping artifacts (Android ProGuard/R8 mappings, iOS dSYM files, NDK native symbols) — owned by `EPIC-PA-03`.

## User Stories

This epic contains 6 user stories — the LARGEST count in the pipeline catalog, reflecting that this stage is the consumer-facing endpoint of the entire pipeline and the destination of the user's stated range. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings (Rule AR-1). The six stories partition the dashboard surface into (1) the issue card list itself (`STORY-PA-07-S01`), (2) the issue detail view (`STORY-PA-07-S02`), (3) the general-purpose filter set (`STORY-PA-07-S03`), (4) the Android-only Google Play track filter (`STORY-PA-07-S04`), (5) the Android Studio App Quality Insights integration (`STORY-PA-07-S05`), and (6) the 5-minute end-to-end latency target that ties this stage back to the pipeline reliability program in `EPIC-PA-10` (`STORY-PA-07-S06`).

### STORY-PA-07-S01: Render issue cards in the Firebase Console

**As a** mobile developer, **I want** the Firebase Console to render each grouped issue as a card with title, status, and key metrics, **so that** I can quickly scan the issue queue and prioritize the highest-impact work without expanding any individual issue.

#### Acceptance Criteria

- **Given** persisted issues from `EPIC-PA-06` and grouped fingerprints from `EPIC-PA-05`, **When** the on-call engineer opens the Firebase Console Crashlytics dashboard for the project, **Then** each issue is rendered as a card showing the title (derived from the top-of-stack application frame, with infrastructure frames excluded), the lifecycle status (`Open` / `Closed` / `Regressed`), the occurrence count, the affected-user count, and the affected-version range — a single-glance summary of one fingerprint group.
- **Given** the dashboard issue card list, **When** the engineer sorts by impact, **Then** issues with the largest affected-user count appear first, with secondary sort by occurrence count to break ties, so the highest-impact items are the first work the engineer sees on opening the dashboard.
- **Given** an issue card, **When** the engineer clicks it, **Then** they are taken to the issue detail view documented in `STORY-PA-07-S02`, preserving the current filter context so returning to the list does not lose their place in the triage queue.

#### Notes

- Title derivation comes from the top-of-stack application frame per `EPIC-PA-05` Story 1 — infrastructure frames (framework, OS, JVM internals) are excluded so the card title reflects the application code most likely to be the bug location rather than a generic exception type.
- Card layout, typography, and exact visual fidelity are owned by Firebase as a product surface; this story documents the EXPECTED CONTENT (the data fields surfaced on each card) and EXPECTED INTERACTIONS (sort by impact, click to detail) rather than pixel-level rendering. Affected-user count is the canonical impact metric because it is a stronger proxy for user-perceived stability than occurrence count alone.

---

### STORY-PA-07-S02: Provide issue detail view with stack trace, breadcrumbs, and keys

**As an** on-call engineer, **I want** each issue's detail view to show the full symbolicated stack trace, breadcrumb timeline, custom keys, custom logs, user identifiers, and affected-device breakdown, **so that** I have all the context needed to reproduce, diagnose, and fix the underlying crash without leaving the dashboard.

#### Acceptance Criteria

- **Given** an issue card on the dashboard, **When** the engineer opens its detail view, **Then** the detail view shows the full SYMBOLICATED stack trace (per `EPIC-PA-03`) with original class, file, method, and line numbers rather than obfuscated tokens, so the engineer can navigate directly to the offending application code.
- **Given** breadcrumb logs captured via the Google Analytics for Firebase integration enabled per `EPIC-MIG-02` and `EPIC-MIG-07`, **When** the engineer views the issue detail, **Then** the breadcrumb timeline is rendered showing the user's actions leading up to the crash (screen views, custom events, taps, network calls) so the path-to-crash is reconstructable.
- **Given** custom keys set by the SDK (e.g., `setCustomKey("user_tier", "premium")`) and custom logs added via `log(...)`, **When** the engineer views the issue detail, **Then** both are displayed alongside each affected crash session, surfacing the application-state context the engineer chose to capture.
- **Given** user identifiers set by the SDK via `setUserId(...)` and privacy controls in `EPIC-PA-09` permit display (values constrained to hashed or opaque identifiers per the PII redaction policy), **When** the engineer views the issue detail, **Then** the affected user IDs are displayed so the engineer can correlate with internal tooling for reproduction.
- **Given** an issue spanning multiple device classes and OS versions, **When** the engineer views the detail, **Then** the dashboard shows breakdowns by device manufacturer, model, and OS version, surfacing whether the issue is concentrated on a specific hardware or OS surface or distributed broadly.

#### Notes

- Breadcrumb logs depend on Google Analytics for Firebase being enabled in the Firebase project per `EPIC-MIG-02` — without Analytics, the breadcrumb timeline is empty and the engineer must rely on custom `log(...)` messages and custom keys for path-to-crash context.
- User-ID display is subject to the PII redaction policy in `EPIC-PA-09`: `setUserId(...)` must be called with a hashed or opaque identifier rather than a raw email or username so the display does not leak PII to anyone with Firebase Console access.

---

### STORY-PA-07-S03: Filter issues by severity, time, version, and device

**As an** on-call engineer, **I want** to filter the dashboard issue list by severity, time window, app version, and device, **so that** I can rapidly answer targeted operational questions like "what's broken in the latest release?" or "what's the trend on ANRs over the past 7 days?" without writing queries or exporting data.

#### Acceptance Criteria

- **Given** the dashboard issue list, **When** the engineer applies a severity filter (fatal-only, non-fatal-only, ANR-only), **Then** the list narrows to issues matching that severity, with the filter state persisted in the URL so the filtered view can be shared with teammates as a link.
- **Given** the dashboard issue list, **When** the engineer applies a time-window filter (last 24 hours, last 7 days, last 30 days, or a custom range), **Then** the list shows only issues with at least one occurrence in the selected window and per-card metrics are scoped to that window rather than lifetime totals.
- **Given** the dashboard issue list, **When** the engineer applies an app-version filter (single version, multiple selected versions, or a version range), **Then** the list shows only issues affecting the selected version(s), enabling evaluation of "what's broken in v4.7" vs. "what's broken across v4.5–v4.7".
- **Given** the dashboard issue list, **When** the engineer applies a device filter (device class, manufacturer, model, OS version, or OS version range), **Then** the list narrows accordingly, exposing device- or OS-specific stability problems that are obscured by aggregated views.
- **Given** multiple filters applied simultaneously, **When** the engineer reviews the resulting list, **Then** all filters are combined as a logical AND and the filter state is visible at the top of the dashboard so the engineer can see exactly which filters are narrowing the view.

#### Notes

- Filter capabilities are described in canonical Firebase guidance; this story documents the engineer-facing behavior and combination semantics rather than the underlying implementation, which is a Firebase product surface.
- URL-persistence of filter state lets a triage engineer share a focused view (e.g., "v4.7 fatal-only over the last 24 hours") with a teammate via a single hyperlink rather than requiring the recipient to reapply every filter manually.

---

### STORY-PA-07-S04: Filter Android crashes by Google Play track

**As an** Android release manager, **I want** to filter the dashboard by Google Play track (production, beta, alpha, internal testing), **so that** I can separate pre-release stability signals from production stability signals and make informed promotion decisions for each candidate.

#### Acceptance Criteria

- **Given** a Firebase project linked to a Google Play app with the Google Play integration enabled, **When** the release manager opens the Crashlytics dashboard, **Then** a Google Play track filter is available alongside the general-purpose filters from `STORY-PA-07-S03`, surfaced only when the integration is wired so iOS-only or unintegrated projects do not see a non-functional control.
- **Given** the Google Play track filter, **When** the release manager selects "production", **Then** the issue list narrows to crashes from builds shipped on the production track, isolating the in-production stability picture from pre-release contamination.
- **Given** the Google Play track filter, **When** the release manager selects "beta" (or "alpha", or "internal testing"), **Then** the issue list narrows to crashes from builds on that pre-release track, enabling evaluation of the candidate's stability in isolation from production.
- **Given** the release manager is reviewing a release candidate currently on the beta track, **When** they combine the Google Play track filter set to "beta" with a time window scoped to "since the candidate's promotion", **Then** they can decide whether the candidate is safe to promote to production by comparing its in-beta stability profile against the prior production baseline.

#### Notes

- Per canonical Firebase guidance, Crashlytics integrates with Google Play to filter crash reports by Google Play track in the Crashlytics dashboard — this story operationalizes that integration into a concrete release-promotion workflow.
- This filter is ANDROID-ONLY; there is no iOS equivalent because Apple's TestFlight pre-release track is not surfaced through the same Firebase integration. iOS-only teams use the general app-version filter from `STORY-PA-07-S03` to separate TestFlight versions from App Store versions.

---

### STORY-PA-07-S05: Surface crashes inside Android Studio via App Quality Insights

**As an** Android mobile developer, **I want** Crashlytics data accessible directly within Android Studio via the App Quality Insights window, **so that** I can diagnose crashes from inside my IDE without alt-tabbing to the browser, preserving my working context.

#### Acceptance Criteria

- **Given** the Crashlytics SDK is integrated in the Android app and a sufficiently recent Android Studio version is installed, **When** the developer opens the App Quality Insights window, **Then** the window shows summary statistics about top crash and non-fatal events grouped by device manufacturer and Android version, mirroring the high-level signals visible on the Firebase Console dashboard.
- **Given** the App Quality Insights window, **When** the developer applies filters by attributes including severity, time, and app version, **Then** the in-IDE issue list narrows in the same way the Firebase Console dashboard would for the equivalent filter combination, keeping the developer's mental model of "filtering" consistent across IDE and browser.
- **Given** a crash event in the App Quality Insights window, **When** the developer clicks the event, **Then** the IDE provides a browser link to the Crashlytics dashboard page for that specific issue, so the developer can pivot to the full browser-based detail view (per `STORY-PA-07-S02`) when deeper context is needed.
- **Given** the App Quality Insights view of an issue, **When** the developer reviews the issue, **Then** the IDE surfaces insights that help resolve root causes (per Android Studio's App Quality Insights documentation), including navigation aids from the stack trace to the offending source file when source resolution is possible.

#### Notes

- Per canonical Firebase guidance, Crashlytics integrates with Android Studio so that Crashlytics data can be viewed directly within the App Quality Insights window — this story operationalizes that integration as a concrete developer-facing workflow.
- There is no equivalent IDE plugin for iOS; iOS developers use the browser-based Firebase Console dashboard. The browser dashboard remains available to Android developers as well — App Quality Insights is an ADDITIVE convenience, not a replacement.

---

### STORY-PA-07-S06: Meet a 5-minute end-to-end latency target from capture to dashboard

**As a** mobile developer running a force-crash test, **I want** the test crash to appear on the Firebase Console dashboard within five minutes of cold relaunch, **so that** I have rapid feedback that the SDK integration and the pipeline are healthy.

#### Acceptance Criteria

- **Given** a force-crash test executed per `EPIC-MIG-09` (e.g., `throw RuntimeException("Force Crash")` on Android, `fatalError("Force Crash")` on iOS), **When** the app cold-relaunches and the on-device buffered payload uploads successfully via `EPIC-PA-02`, **Then** the test crash appears on the Firebase Console dashboard as a new or updated issue card within five minutes — the canonical end-to-end visibility window documented in the Firebase Crashlytics troubleshooting guidance.
- **Given** the test crash does not appear on the dashboard within five minutes, **When** the developer follows the Firebase troubleshooting guidance, **Then** they enable Crashlytics debug logging (via `adb shell setprop log.tag.FirebaseCrashlytics DEBUG` on Android or `-FIRDebugEnabled` on iOS) and re-run the test to observe whether the SDK is serializing the crash on capture and attempting upload on cold relaunch.
- **Given** the documented 5-minute end-to-end latency target, **When** SLOs are formalized in `EPIC-PA-10`, **Then** the target is adopted as the time-to-dashboard SLO with synthetic monitoring measuring p50, p95, and p99 latencies, so persistent breaches become a pipeline reliability signal rather than an ambient inconvenience.

#### Notes

- Per canonical Firebase guidance, if after five minutes the test crash is still not visible in the Firebase Console, the recommended diagnostic action is to enable debug logging to see if the app is sending crash reports.
- The 5-minute target is the canonical end-to-end pipeline expectation; persistent breaches are tracked in `EPIC-PA-10`. This story documents the SERVICE-LEVEL EXPECTATION; the SLO declaration, synthetic monitoring, and error-budget accounting belong to `EPIC-PA-10`.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4). These satisfy the user's R-2 directive ("epics with acceptance criteria") applied symmetrically to the pipeline theme.

- **Given** a healthy upstream pipeline (`EPIC-PA-01` through `EPIC-PA-06` operating within their SLOs), **When** an on-call engineer opens the Firebase Console Crashlytics dashboard, **Then** all open and recently-occurring issues are rendered as cards displaying title, lifecycle status, occurrence count, affected-user count, and affected-version range, sortable by impact.
- **Given** any issue card on the dashboard, **When** the engineer opens its detail view, **Then** they see the full symbolicated stack trace, breadcrumb timeline (when Google Analytics for Firebase is enabled per `EPIC-MIG-02`), custom keys, custom logs, user identifiers (subject to `EPIC-PA-09` privacy controls), and breakdowns by device manufacturer, model, and OS version.
- **Given** the dashboard, **When** the engineer applies any combination of severity, time-window, app-version, device, and (Android-only) Google Play track filters, **Then** the issue list narrows correctly under combined-AND semantics with filter state visible and shareable via URL.
- **Given** the Android Studio App Quality Insights window is opened by an Android developer with the Crashlytics SDK integrated, **When** the developer reviews events, **Then** Crashlytics data is rendered with filters mirroring the dashboard (severity, time, app version), grouped summary statistics by device manufacturer and Android version, and a working browser link from any event to the corresponding Firebase Console issue page.
- **Given** a force-crash test executed per `EPIC-MIG-09`, **When** the app cold-relaunches and the buffered payload uploads successfully, **Then** the test crash appears on the dashboard within five minutes of cold relaunch — the canonical visibility window from the Firebase Crashlytics troubleshooting guidance.
- **Given** the 5-minute visibility window is breached during a force-crash test, **When** the developer enables Crashlytics debug logging via the documented platform-specific procedure, **Then** they can diagnose whether the SDK is serializing the crash on capture and attempting upload on cold relaunch, providing a reproducible diagnostic path before escalating to `EPIC-PA-10`.

## Definition of Done

The epic is complete when ALL of the following observable conditions are simultaneously true:

- All 6 embedded stories (`STORY-PA-07-S01` through `STORY-PA-07-S06`) have their acceptance criteria satisfied.
- All 6 epic-level acceptance criteria above are satisfied.
- A force-crash test from a release-style build produces a visible issue card on the Firebase Console dashboard within five minutes of cold relaunch, demonstrating the end-to-end pipeline from capture through dashboard delivery.
- All documented filters (status, severity, time, app version, device, OS version, and — on Android — Google Play track) are exercised and observed to narrow the issue list correctly under both single-filter and combined-AND conditions, with filter state persisted in the URL for sharing.
- The Android Studio App Quality Insights window is verified to show the test crash with a working browser link to the Firebase Console issue detail page and filter parity with the browser dashboard for severity, time, and app version.
- The 5-minute latency target is reflected in `EPIC-PA-10` as the time-to-dashboard SLO, with synthetic monitoring in place and breach alerts wired through `EPIC-PA-08` channels; custom keys, custom logs, and user identifiers (subject to `EPIC-PA-09`) render on the issue detail view for at least one verified test issue.

## Dependencies

This epic has the following predecessor, successor, and cross-cutting relationships in the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-PA-06` | The dashboard reads persisted issue and occurrence data from the storage surface owned by `EPIC-PA-06` to render issue cards and the issue detail view. |
| `Predecessor` | `EPIC-PA-05` | The dashboard renders issues defined by the grouping stage in `EPIC-PA-05`; each card maps one-to-one to a fingerprint group and reflects the lifecycle states (`Open` / `Closed` / `Regressed`) emitted by that stage. |
| `Predecessor` | `EPIC-PA-03` | Symbolicated stack traces on the issue detail view are produced by the symbolication stage in `EPIC-PA-03`; without it, the detail view would show obfuscated tokens rather than original class, file, and line information. |
| `Successor` | `EPIC-PA-08` | Alerts surface on the dashboard via clickable links and badges on the corresponding issue cards, but the alert engine (velocity, regression, new-issue), channel fan-out, and quiet-hours discipline are owned by `EPIC-PA-08`. |
| `Cross-Cutting` | `EPIC-PA-09` | Privacy controls (opt-in collection, PII redaction policy, user-ID hashing discipline) affect what the dashboard renders — notably, whether user identifiers are displayed and what custom-key values are surfaced — but the policy itself is owned by `EPIC-PA-09`. |
| `Cross-Cutting` | `EPIC-PA-10` | The 5-minute time-to-dashboard latency referenced in `STORY-PA-07-S06` is adopted as a flagship SLO in `EPIC-PA-10`, with synthetic monitoring and error-budget accounting owned there rather than here. |
| `Cross-Cutting` | `EPIC-MIG-09` | The force-crash test that validates the 5-minute end-to-end visibility window is defined and executed by `EPIC-MIG-09` Test-Crash Validation — this epic documents the visibility CONTRACT; `EPIC-MIG-09` documents the VALIDATION PROCEDURE. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase, Crashlytics, and Android Studio guidance. Inferred content not directly traceable to a public source is flagged inline as `[inferred — no direct source]`.

- [Firebase Crashlytics — Product Overview](https://firebase.google.com/docs/crashlytics) — Documents customizable crash report setup (opt-in reporting, custom logs, custom keys, non-fatal error tracking) and Google Play track filtering in the dashboard. Grounds `STORY-PA-07-S01`, `STORY-PA-07-S02`, and `STORY-PA-07-S04`.
- [Firebase Crashlytics — Get started (Android)](https://firebase.google.com/docs/crashlytics/get-started?platform=android) — Documents the 5-minute Firebase Console visibility window and the debug-logging fallback when a test crash does not appear. Grounds `STORY-PA-07-S06`.
- [Firebase Crashlytics — Customize crash reports](https://firebase.google.com/docs/crashlytics/customize-crash-reports) — Documents `setCustomKey`, `log`, and `setUserId` APIs whose values are surfaced on the issue detail view. Grounds `STORY-PA-07-S02`.
- [Firebase Crashlytics — Troubleshooting](https://firebase.google.com/docs/crashlytics/troubleshooting) — Documents the diagnostic procedure when a force-crash test is not visible within five minutes, including debug-logging activation on Android (`adb shell setprop log.tag.FirebaseCrashlytics DEBUG`) and iOS (`-FIRDebugEnabled`). Grounds the second AC of `STORY-PA-07-S06`.
- [Android Studio — App Quality Insights](https://developer.android.com/studio/debug/app-quality-insights) — Documents Crashlytics integration in Android Studio: summary statistics grouped by device manufacturer and Android version, filters by severity / time / app version, browser link to the Crashlytics dashboard, and root-cause insights. Grounds `STORY-PA-07-S05`.
- [Firebase Products — Crashlytics](https://firebase.google.com/products/crashlytics) — Documents the Android Studio integration via the App Quality Insights window. Grounds `STORY-PA-07-S05`.
