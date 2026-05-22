# EPIC-PA-08: Alerting and Notifications

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-PA-08` |
| Theme | `Pipeline` |
| Pipeline Stage | `Stage 8 — Alerting and Notifications` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-PA-05, EPIC-PA-06, EPIC-PA-07 (predecessors)` |
| Last Updated | `n/a` |

## Description

This epic owns the alerting stage of the pipeline — proactive notification of the on-call team when conditions warrant intervention, beyond the passive dashboard rendering in `EPIC-PA-07`. The alert engine consumes lifecycle events from `EPIC-PA-05` and persisted occurrence history from `EPIC-PA-06` to produce three alert types: **velocity alerts** (an issue's crash rate crosses a documented threshold), **regression alerts** (a previously-closed issue resurfaces in a newer app version), and **new-issue alerts** (a previously-unseen issue first appears in production). Velocity alerts require Crashlytics SDK v18.6.0+ (or Firebase BoM v32.6.0+) per canonical Firebase guidance — older SDK versions cannot emit the telemetry needed to compute velocity — and the prerequisite is communicated via `EPIC-MIG-03`. Notification routing covers Slack, Jira, and email — Crashlytics works seamlessly with industry-standard tools including Jira, Slack, BigQuery, and others — with each channel receiving the alert in its native format. Quiet hours and severity-aware routing prevent alert fatigue: high-severity events page on-call immediately while low-severity events batch into business-hours digests, and acknowledgment in any channel ties back to the underlying issue's lifecycle.

## Business Value

Velocity alerts catch emerging issues BEFORE they trash the crash-free-users metric — early detection is the highest-leverage intervention available to the on-call team. Regression alerts prevent silently-resurfaced crashes from going unnoticed by pairing tightly with `EPIC-PA-05`'s automated regression detection: a fix that worked in version 4.2 but regresses in 4.5 surfaces immediately rather than at the next dashboard review. Slack, Jira, and email integration meets teams where they already work, reducing tool-switching overhead and response latency. Quiet hours and severity-aware routing prevent alert fatigue by batching low-severity events into digests while preserving the paging path for high-severity events. Channel-specific formatting (rich Slack cards, structured Jira tickets, plain-text email summaries) maximizes signal in each medium.

## In Scope

This epic includes the following items:

- Velocity alerts: triggered when an issue's crash rate exceeds the documented Firebase threshold, subject to the SDK version prerequisite (v18.6.0+ or BoM v32.6.0+).
- Regression alerts: triggered when an issue's lifecycle transitions from `Closed` to `Regressed` per `EPIC-PA-05`.
- New-issue alerts: triggered once when a previously-unseen issue first appears in production traffic.
- Slack channel integration: rich-message alerts with issue title, link, occurrence count, affected app version(s), and inline acknowledgment buttons.
- Jira integration: automated ticket creation on alert with documented fields populated (summary, description, severity, label per alert type, link to the Firebase issue).
- Email integration: digest-style notifications routed to on-call rotations or team distribution lists with issue title, link, key metrics, and a one-line summary.
- Notification quiet hours: configurable team-level schedules (expressed in a local timezone) during which low-severity events batch into business-hours digests.
- Severity-aware routing: a documented severity ladder (for example, fatal → page; non-fatal → Slack; ANR → Jira) that maps alert types to channels and to quiet-hours behavior.
- Alert acknowledgment workflows: ties to the issue lifecycle (`Open` → `Acknowledged` → `Closed`) with acknowledgment propagation across every channel the alert reached.
- SDK version requirement documentation: velocity alerts require Crashlytics SDK v18.6.0+ (or Firebase BoM v32.6.0+), surfaced in `EPIC-MIG-03` and in the team's release-readiness checklist.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- Issue creation, grouping, and lifecycle transitions — owned by `EPIC-PA-05`. This epic CONSUMES the lifecycle events but does not own how they are detected.
- Durable persistence of issue occurrence history — owned by `EPIC-PA-06`. The alert engine reads occurrence history from this surface but does not own its storage or retention horizon.
- Dashboard rendering of issue cards — owned by `EPIC-PA-07`. Alerts SURFACE on the dashboard via clickable links, but the dashboard itself is not owned here.
- Pipeline-level SLOs and error budgets for alert latency — owned by `EPIC-PA-10`. This epic documents expected behavior, not the SLO target.
- PagerDuty, Opsgenie, or other paging tools beyond the three channels (Slack, Jira, email) explicitly listed in the AAP scope.

## User Stories

This epic contains 4 user stories embedded inline using H3 headings (Rule AR-1). The four stories partition the alerting stage into its three alert types — velocity (`STORY-PA-08-S01`), regression (`STORY-PA-08-S02`), channel fan-out including new-issue alerts (`STORY-PA-08-S03`) — plus the routing-discipline story preventing alert fatigue (`STORY-PA-08-S04`).

### STORY-PA-08-S01: Generate velocity alerts when crash rate spikes

**As a** on-call engineer, **I want** to receive a velocity alert when an issue's crash rate exceeds a documented threshold, **so that** I can intervene before the spike erodes the crash-free-users metric.

#### Acceptance Criteria

- **Given** the Crashlytics SDK version is v18.6.0+ (or the Firebase BoM version is v32.6.0+), **When** the SDK uploads crashes, **Then** the upload includes the telemetry the velocity alert engine needs to compute crash rates and velocity alerts are eligible to fire.
- **Given** an issue whose occurrence rate crosses Firebase's documented velocity threshold, **When** the alert engine evaluates the issue, **Then** a velocity alert is generated and routed to every channel configured for the project (Slack, Jira, and/or email per `STORY-PA-08-S03`).
- **Given** a velocity alert delivered to any configured channel, **When** the on-call engineer opens it, **Then** the alert links to the underlying issue's card in the Firebase Console (per `EPIC-PA-07`) and shows the current occurrence count, affected app version(s), and detected start time of the spike.
- **Given** a client app integrated with a Crashlytics SDK version older than v18.6.0 (or a Firebase BoM older than v32.6.0), **When** the alert engine attempts to compute velocity for an issue from that app, **Then** velocity alerts do not fire for that app and the team's documentation surfaces this limitation, recommending upgrading via `EPIC-MIG-03`.

#### Notes

- Per canonical Firebase guidance, for velocity alerts to function the Crashlytics SDK must be v18.6.0+ (or the Firebase Android BoM v32.6.0+); teams shipping older SDKs are implicitly opting out of velocity alerts. The exact velocity threshold is a Firebase implementation detail — this story documents that ONE EXISTS, that it is automatically applied, and that the alert behaves predictably when crossed.

---

### STORY-PA-08-S02: Generate regression alerts when closed issues resurface

**As a** mobile developer, **I want** to receive an immediate alert when a previously-closed issue resurfaces in a newer app version, **so that** I know a fix has regressed and can intervene in the current release.

#### Acceptance Criteria

- **Given** an issue whose lifecycle transitioned to `Regressed` via the regression-detection logic in `EPIC-PA-05`, **When** the alert engine detects the transition, **Then** a regression alert is generated and routed to every channel configured for the project.
- **Given** a regression alert, **When** the engineer opens it, **Then** the alert displays the date the issue was originally closed, the version in which it has regressed, the new occurrence count, and a link to the issue's card in the Firebase Console.
- **Given** a regression alert, **When** the engineer acknowledges it, **Then** the underlying issue's regression status remains visible in the dashboard for triage and the issue is not auto-closed — closure remains a deliberate human decision per `EPIC-PA-05`'s lifecycle rules.

#### Notes

- Regression alerts are a strong forcing function for release quality — they catch fixes that were not robust under production traffic and surface the issue immediately rather than at the next dashboard review. Tightly coupled to `EPIC-PA-05` STORY-PA-05-S02 (issue lifecycle); defects in regression detection are referred back to `EPIC-PA-05` rather than tuned inside the alert engine.

---

### STORY-PA-08-S03: Route alerts via Slack, Jira, and email

**As a** on-call engineer, **I want** alerts routed to the channels my team already uses (Slack, Jira, and email), **so that** I see them where I work without context-switching to the Firebase Console for every triage event.

#### Acceptance Criteria

- **Given** a Slack integration configured in the Firebase project, **When** a velocity, regression, or new-issue alert fires, **Then** a rich-message Slack notification is posted to the configured channel containing the issue title, link, alert type, key metrics (occurrence count, affected app version(s)), and inline acknowledgment buttons.
- **Given** a Jira integration configured in the Firebase project, **When** an alert fires, **Then** a Jira ticket is automatically created with documented fields populated: summary, description, severity, label per alert type, and a link to the Firebase Console issue card.
- **Given** an email distribution list configured for alerting, **When** an alert fires, **Then** the recipients receive an email containing the issue title, link, alert type, key metrics, and a one-line summary suitable for inbox triage.
- **Given** an alert routed to multiple channels simultaneously, **When** an engineer acknowledges it in any one channel, **Then** the acknowledgment is reflected back to the Firebase Console and to the other channels (Slack message updates, Jira ticket transitions, subsequent digest emails reflect the state).

#### Notes

- Per canonical Firebase guidance, Crashlytics works seamlessly with industry-standard tools including Jira, Slack, BigQuery, and others; this story operationalizes Slack and Jira and adds email as the third channel per the AAP scope. Channel-specific formatting (rich Slack cards vs. structured Jira tickets vs. plain-text email) is not a configuration knob exposed to the team.
- New-issue alerts (the third alert type alongside velocity and regression) ride the same channel fan-out fabric and fire once per new issue rather than once per occurrence — folded into this story rather than getting a dedicated one.

---

### STORY-PA-08-S04: Respect quiet hours and severity-aware routing

**As a** on-call engineer, **I want** alerts to respect configured quiet hours and to route based on severity, **so that** I am not paged for low-severity events outside business hours but I am still paged immediately for high-severity events.

#### Acceptance Criteria

- **Given** quiet hours configured for a team (for example, 18:00–08:00 local time), **When** a low-severity alert fires during that window, **Then** the alert is batched into the next business-hours digest rather than paging immediately.
- **Given** a high-severity alert (for example, a velocity spike crossing an emergency threshold), **When** the alert fires during quiet hours, **Then** the alert bypasses quiet hours and pages on-call immediately via the configured paging channel(s).
- **Given** a batched digest of low-severity events accumulated during quiet hours, **When** the configured business-hours start time is reached, **Then** the digest is delivered to the configured channel(s) containing every batched event, each linking back to its underlying Firebase Console issue card.
- **Given** severity-aware routing rules configured for the project (for example, fatal → page; non-fatal → Slack; ANR → Jira), **When** alerts fire, **Then** they route per the documented severity ladder, reducing alert fatigue by ensuring each channel receives only the alerts it is designed to handle.

#### Notes

- Quiet hours configuration is a team-level setting; this story documents the EXPECTED BEHAVIOR given a configuration, not the configuration UI (which belongs to `EPIC-PA-07`). Severity classification happens BEFORE quiet-hours suppression: a high-severity alert pages immediately regardless of quiet hours, preventing the system from silently swallowing a production-down event because quiet hours were configured too aggressively.

---

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4) and are applied symmetrically with the migration theme for catalog uniformity.

- **Given** the Crashlytics SDK is v18.6.0+ (or Firebase BoM v32.6.0+) and an issue's crash rate crosses the documented velocity threshold, **When** the alert engine evaluates, **Then** a velocity alert is generated and routed to every channel configured for the project, each alert linking back to the issue card in the Firebase Console.
- **Given** an issue's lifecycle transitions from `Closed` to `Regressed` per `EPIC-PA-05`, **When** the alert engine detects the transition, **Then** a regression alert is generated and routed to every channel configured for the project with original close date, regressed-in version, and a link to the issue card populated.
- **Given** Slack, Jira, and email integrations are configured, **When** velocity, regression, or new-issue alerts fire, **Then** each integration receives the alert in its native format (rich Slack card, structured Jira ticket, plain-text email), and an acknowledgment in any one channel propagates back to the Firebase Console and to the others.
- **Given** quiet hours and severity-aware routing rules are configured, **When** alerts fire during quiet hours, **Then** low-severity alerts batch into the next business-hours digest while high-severity alerts bypass quiet hours and route to the paging channel(s) without delay.
- **Given** a client app uses a Crashlytics SDK older than v18.6.0 (or a Firebase BoM older than v32.6.0), **When** the alert engine evaluates velocity for that app, **Then** velocity alerts do not fire and the team's documentation surfaces this limitation, recommending upgrading via `EPIC-MIG-03`.

## Definition of Done

The epic is complete when ALL of the following observable conditions are simultaneously true:

- All 4 embedded stories (`STORY-PA-08-S01` through `STORY-PA-08-S04`) have their acceptance criteria satisfied.
- All 5 epic-level acceptance criteria above are satisfied.
- A test velocity scenario (rapid crash injection in a staging build on Crashlytics SDK v18.6.0+) triggers a velocity alert that arrives at the configured Slack channel within the documented latency.
- A test regression scenario (closing an issue, then reproducing the crash in a higher app version) triggers a regression alert at the configured channel with original close date, regressed-in version, and Firebase Console link populated.
- Slack, Jira, and email channels are wired and end-to-end verified with at least one test alert routed to each, with channel-native formatting confirmed in each medium.
- Quiet hours and severity-aware routing are exercised with at least two test events — one low-severity event during quiet hours (batches into a digest) and one high-severity event during the same window (bypasses quiet hours and pages immediately).
- The SDK version requirement (Crashlytics SDK v18.6.0+ or BoM v32.6.0+ for velocity alerts) is communicated to all integrating teams via `EPIC-MIG-03` and referenced in the team's release-readiness checklist.

## Dependencies

This epic has the following relationships in the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-PA-05` | The alert engine fires on issue lifecycle events (creation, regression) detected and emitted by `EPIC-PA-05`. |
| `Predecessor` | `EPIC-PA-06` | The alert engine queries persisted occurrence history from `EPIC-PA-06` to compute velocity over recent time windows. |
| `Predecessor` | `EPIC-PA-07` | Alerts surface on the dashboard owned by `EPIC-PA-07` and every channel links back to the dashboard's issue card. |
| `Cross-Cutting` | `EPIC-PA-10` | End-to-end alert latency (from crash upload to channel post) is one of the pipeline SLOs owned by `EPIC-PA-10`. |
| `Cross-Cutting` | `EPIC-MIG-03` | The Crashlytics SDK v18.6.0+ (or BoM v32.6.0+) requirement for velocity alerts is communicated as part of the Android SDK migration program. |

## References

Per Rule AR-5, this epic's content is grounded in public Firebase or Crashlytics guidance. Inferred content not directly traceable to a public source is flagged inline as `[inferred — no direct source]`.

- [Firebase Crashlytics — Troubleshooting](https://firebase.google.com/docs/crashlytics/troubleshooting) — Documents that velocity alerts require Crashlytics SDK v18.6.0+ (or Firebase BoM v32.6.0+). Grounds the SDK version prerequisite in `STORY-PA-08-S01` and the epic-level AC.
- [Firebase Products — Crashlytics](https://firebase.google.com/products/crashlytics) — Documents that Crashlytics works seamlessly with industry-standard tools including Jira, Slack, BigQuery, and others. Grounds the channel integrations in `STORY-PA-08-S03`.
- [Firebase Crashlytics — Customize crash reports](https://firebase.google.com/docs/crashlytics/customize-crash-reports) — Documents customization surfaces that interact with the alert engine, including how custom keys and logs surface on the alert payload.
- [Firebase Crashlytics — Get started](https://firebase.google.com/docs/crashlytics/get-started) — Documents the broader integration surface the alert engine depends on: SDK setup, console wiring, and the initial channel-integration flow.
