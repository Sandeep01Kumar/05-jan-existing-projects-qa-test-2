# EPIC-PA-06: Persistence and BigQuery Export

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-PA-06` |
| Theme | `Pipeline` |
| Pipeline Stage | `Stage 6 — Persistence and Export` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-PA-05 (predecessor); EPIC-PA-07, EPIC-PA-08, EPIC-PA-10 (successors); EPIC-PA-09 (cross-cutting)` |
| Last Updated | `n/a` |

## Description

This epic owns the durable persistence and downstream-export stage of the pipeline — the architectural boundary where grouped issues output by `EPIC-PA-05` are written to long-term storage and made available to consumers beyond the Firebase Console. Two output paths leave this stage: (1) Firebase's native managed persistence, which powers the Firebase Console dashboard rendering in `EPIC-PA-07` and feeds the alert engine in `EPIC-PA-08`, and (2) the BigQuery export, which powers custom analytics dashboards in Looker Studio, Grafana, or any BI tool that can connect to BigQuery as a data source. BigQuery export is configured via a one-time linking step in the Firebase Console — once linked, crash, ANR, and non-fatal error data flow to a BigQuery dataset in the project on an ongoing basis, with each row preserving the SDK-captured payload alongside Crashlytics-assigned identifiers (issue ID, fingerprint, occurrence ID). Per canonical Firebase guidance, new datasets created by linking Crashlytics to BigQuery are automatically located in the United States regardless of the location of the Firebase project — this is a non-obvious behavior with real data-residency consequences that must be communicated to teams subject to GDPR, regional data laws, or contractual residency commitments. Downstream consumers built on the BigQuery export include team-owned dashboards in Looker Studio or Grafana that surface crash-free-users trends, top-issue rollups, and ANR rates to product, executive, and customer-success stakeholders who do not log into the Firebase Console directly. Retention policy lives here: Firebase's native retention applies to the managed copy, while team-controlled BigQuery table partitioning and expiration applies to the exported copy — teams with regulatory retention requirements must use the BigQuery export to extend retention beyond Firebase's native window.

## Business Value

Durable persistence ensures that crash history remains queryable across release cycles, supporting longitudinal analysis questions such as "has the crash-free-users rate improved across the last 6 releases?" or "did the ANR rate regress when we shipped the new background worker in v4.3?" — questions that demand an authoritative, time-anchored record that survives feature flag toggles, build pipeline rebuilds, and team turnover. BigQuery export unlocks analyses that the Firebase Console alone cannot support — joins with custom event data from Google Analytics for Firebase, machine-learning-driven anomaly detection over multi-quarter windows, or organization-specific compliance reporting that must combine crash data with other telemetry sources for incident retrospectives. Looker Studio and Grafana dashboards make crash data accessible to product managers, executive sponsors, and customer-success teams who need stability visibility but do not have (or want) Firebase Console access — removing a gatekeeping bottleneck where stability questions had to be relayed through engineering rather than answered directly by the stakeholder asking them. Long-term BigQuery retention (controlled by the team via partition expiration and table-level retention policies) provides a hedge against Firebase's native retention windows for compliance use cases such as post-incident regulatory inquiries that may arrive months or years after the underlying event. Finally, this epic provides the data substrate for `EPIC-PA-10` Pipeline Reliability and SLOs — the end-to-end metrics, time-to-dashboard SLO measurements, and historical crash-free-users baselines that the reliability program depends on all read from the persistence layer documented here.

## In Scope

This epic includes the following items:

- Durable Firebase-managed persistence of grouped issues, occurrence counts, and crash payload metadata — the storage surface that powers the Firebase Console dashboard in `EPIC-PA-07` and the alert engine in `EPIC-PA-08`.
- One-time BigQuery linking workflow: enabling the link in the Firebase Console, naming the destination dataset, granting the necessary IAM permissions on the destination GCP project, and verifying the first export completes within the documented setup window.
- Ongoing BigQuery export schema: documented tables and columns for crashes, ANRs, and non-fatal errors — each row preserves the SDK-captured payload alongside Crashlytics-assigned identifiers (issue ID, fingerprint hash, occurrence ID), app version, device metadata, and event timestamp.
- BigQuery dataset location: documenting the US default and the data-residency implications for teams subject to GDPR, CCPA, or contractual residency commitments, plus any options to override the default during dataset creation.
- Looker Studio dashboard wiring: connecting BigQuery as a data source and pre-defined chart templates for crash-free users, top issues by impact, ANR trends, regression frequency, and per-app-version stability comparisons.
- Grafana dashboard wiring (alternate path): documenting BigQuery as a data source for teams already standardized on Grafana, including the Grafana BigQuery plugin configuration and equivalent panel definitions to the Looker Studio templates.
- Retention policy documentation: linking to Firebase's native retention window for the managed copy and providing team-controlled BigQuery retention guidance via partition expiration and table-level retention policies for the exported copy.
- One-time BigQuery linking expectations: documenting that the linking step is performed once per project lifecycle (not per release, not per app), so on-call engineers understand the setup is a project-level action rather than a recurring task.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- Stack-trace fingerprinting and the issue grouping algorithm that decides which crashes share a record — owned by `EPIC-PA-05`. This epic CONSUMES the grouped issues and writes them to storage but does not own how they are defined.
- Firebase Console dashboard rendering of issue cards, filters, detail views, and App Quality Insights integration — owned by `EPIC-PA-07`. This epic provides the persisted READ surface that the dashboard renders against; the dashboard itself is not owned here.
- Alert generation (velocity alerts, regression alerts, new-issue alerts) and notification channel routing — owned by `EPIC-PA-08`. The alert engine READS occurrence history from this storage surface but is not owned here.
- GDPR / CCPA controls including opt-in collection, PII redaction policy, `setCrashlyticsCollectionEnabled` API behavior, and the data-subject access / erasure / portability playbook — owned by `EPIC-PA-09`. This epic documents storage-side enforcement of retention (Story 4) but defers the legal and governance framing to `EPIC-PA-09`.
- Pipeline-level SLOs and error-budget policy — owned by `EPIC-PA-10`. This epic provides the historical data substrate that the SLO program reads from but does not declare the SLOs themselves.

## User Stories

This epic contains 4 user stories embedded inline using H3 headings (Rule AR-1). The four stories partition the persistence stage into its two output paths — durable Firebase-managed storage in `STORY-PA-06-S01` and the BigQuery export in `STORY-PA-06-S02` — the downstream BI dashboards built on the BigQuery export in `STORY-PA-06-S03`, and the cross-cutting retention policy that binds both output paths in `STORY-PA-06-S04`. Stories live INSIDE this epic file (Rule AR-1) to keep each epic self-contained and eliminate broken cross-file links during refactors.

### STORY-PA-06-S01: Durably persist grouped issues and crash history

**As a** mobile developer, **I want** crash history to be durably persisted across release cycles, **so that** I can perform longitudinal analysis on crash-free rates and issue trends and answer questions like "has stability improved across the last 6 releases?" without losing data to retention rollovers.

#### Acceptance Criteria

- **Given** grouped issues output by `EPIC-PA-05` (each issue identified by its stack-trace fingerprint and lifecycle status), **When** the persistence stage processes them, **Then** the issue records and their per-occurrence crash records are written to Firebase's durable managed storage with their full SDK-captured payload (stack trace, breadcrumbs, custom keys, custom logs, user identifier subject to `EPIC-PA-09` privacy controls, app version, and device metadata) preserved.
- **Given** a stored issue, **When** the on-call engineer queries it days, weeks, or months after first occurrence (within Firebase's documented retention window), **Then** the issue is fully retrievable from the Firebase Console with original metadata intact — fingerprint, lifecycle status, occurrence history, affected-user count, and affected-version range all reflect the values present at the original capture time.
- **Given** the durable persistence surface, **When** downstream stages read from it (dashboard rendering in `EPIC-PA-07`, alert engine in `EPIC-PA-08`, reliability monitoring in `EPIC-PA-10`), **Then** each reader observes a consistent view of the issue and occurrence history without contention or staleness beyond the documented end-to-end pipeline latency.
- **Given** Firebase's native retention window for crash data, **When** the team requires longer retention for regulatory or operational reasons, **Then** they can rely on the BigQuery export (`STORY-PA-06-S02`) for team-controlled long-term retention rather than expecting Firebase's managed copy to extend beyond the native window.

#### Notes

- Firebase's documented native retention applies to the managed copy held inside the Firebase Crashlytics surface; teams with regulatory retention requirements (for example, audit trails that must persist for the duration of a financial reporting window) must mirror data to BigQuery via `STORY-PA-06-S02` and apply team-controlled BigQuery retention via `STORY-PA-06-S04`.
- This story documents the WRITE-side contract from `EPIC-PA-05` into persistence. The READ-side contracts from persistence into `EPIC-PA-07`, `EPIC-PA-08`, and `EPIC-PA-10` are owned by those successor epics; this story documents only that the read surface exists and is consistent.

---

### STORY-PA-06-S02: Link Crashlytics to BigQuery and export crash data

**As a** data analyst, **I want** Crashlytics data exported to a BigQuery dataset on an ongoing basis, **so that** I can run custom SQL queries, join crash data with other organization datasets (custom events, user attributes, support tickets), and build analytics dashboards that exceed what the Firebase Console alone offers.

#### Acceptance Criteria

- **Given** a Firebase project with Crashlytics enabled and a project owner with the necessary IAM permissions, **When** the project owner navigates to the BigQuery linking flow in the Firebase Console and completes the one-time link (selecting the destination GCP project and accepting the link), **Then** subsequent crash data is exported to a BigQuery dataset in the destination project on an ongoing basis without any further per-release action required.
- **Given** a fresh BigQuery link, **When** the first export completes within the documented setup window, **Then** the documented BigQuery tables (`crashlytics_*` covering crashes, ANRs, and non-fatal errors) appear in the destination dataset with the expected columns — event timestamp, issue ID, fingerprint, occurrence ID, app version, device manufacturer and model, OS version, and the full crash payload — and a data analyst can query them via the BigQuery console or any SQL client.
- **Given** the BigQuery linking flow, **When** the project owner inspects the destination dataset's metadata, **Then** they observe that the dataset is automatically located in the United States regardless of the location of the Firebase project, and the team's documentation surfaces this data-residency consequence prominently for any audit reviewer or compliance reviewer who later inspects the configuration.
- **Given** the data analyst's SQL queries against the exported tables, **When** they execute the queries, **Then** the data accurately reflects the crashes captured by the Crashlytics SDK with the documented export latency (typically within hours of the original capture, per Firebase's documented BigQuery export cadence), and the row counts reconcile with the issue and occurrence counts observed in the Firebase Console for the same time window.
- **Given** an active BigQuery link, **When** the BigQuery linking step is repeated, **Then** the system surfaces that the link already exists (one link per project) rather than creating a duplicate export pipeline, reinforcing that linking is a one-time setup action and setting expectations correctly for on-call engineers and platform owners.

#### Notes

- The US default location for newly created BigQuery datasets must be documented prominently — it has data residency implications for teams subject to GDPR, regional data laws, or contractual residency commitments, and `EPIC-PA-09` cross-references this behavior in its data-residency awareness scope item.
- The Firebase BigQuery linking guide provides authoritative procedures and exact navigation paths in the Firebase Console; this story documents the BEHAVIOR (link is one-time, datasets default to US, export is ongoing) rather than the exact UI steps which are owned by Firebase as a product surface.
- BigQuery linking is a project-level (not app-level) configuration — a single link covers all Crashlytics-enabled apps in the Firebase project (Android, iOS, Flutter, Unity, React Native, web), and the exported tables include an `app_id` column so a single BI dashboard can filter by platform or app.
- Forward-compatibility note (BigQuery export location evolution): Firebase has been observed to evolve the BigQuery linking flow to support user-selected dataset locations during setup, in addition to the historical US default behavior documented in the Firebase Crashlytics Troubleshooting reference above. The US-by-default acceptance criterion in this story remains accurate for datasets created under the historical default and for any new link where a non-US location is not explicitly selected during setup; teams creating fresh BigQuery links should verify the location options offered by the current Firebase Console at the time of linking, consult the canonical [Firebase Crashlytics — Export to BigQuery](https://firebase.google.com/docs/crashlytics/bigquery-export) documentation for the latest authoritative behavior, and select a regional location at setup time if data-residency requirements demand it. Legacy datasets created before any such infrastructure update retain the US default and cannot be relocated after creation. `[inferred — no direct source]` for the evolution-over-time framing; the canonical US-default behavior remains directly grounded in Firebase Troubleshooting documentation as cited in this epic's References section, and the location-selection affordance is described in the canonical BigQuery export documentation referenced above.

---

### STORY-PA-06-S03: Build downstream dashboards in Looker Studio or Grafana

**As a** product manager, **I want** crash trends visible in our team's Looker Studio (or Grafana) dashboards, **so that** I and other non-engineering stakeholders can monitor app stability without logging into the Firebase Console directly or asking engineering to extract numbers manually.

#### Acceptance Criteria

- **Given** the BigQuery export from `STORY-PA-06-S02` is active and the dataset has accumulated at least the documented warm-up window of crash data, **When** a dashboard author connects Looker Studio (or Grafana) to the BigQuery dataset as a data source using a service account with read-only access to the dataset, **Then** the connection succeeds and the `crashlytics_*` tables are queryable from the BI tool's query interface.
- **Given** a Looker Studio dashboard connected to the BigQuery dataset, **When** the dashboard author defines panels for crash-free users over time, top-issues-by-impact tables, and ANR trends per app version, **Then** the panels render with accurate data sourced from BigQuery and the values reconcile with the Firebase Console for overlapping time windows.
- **Given** a Grafana dashboard connected to the BigQuery dataset via the Grafana BigQuery plugin, **When** the dashboard author defines equivalent panels (crash-free users, top issues, ANR trends), **Then** the panels render with accurate data and refresh on a documented schedule (typically every 5-15 minutes for a Grafana auto-refresh dashboard) without manual reload.
- **Given** downstream dashboards exposed to non-engineering stakeholders (product, executives, customer success), **When** they view the dashboards, **Then** they understand the data without needing Firebase Console access — the dashboards are self-contained with legends, axis labels, time-range pickers, and annotations explaining any non-obvious metrics (e.g., "Crash-Free Users = sessions without a fatal crash divided by total sessions").

#### Notes

- Looker Studio is the Firebase-native BI integration with first-class authentication via Google identity and project ownership — it is the recommended default for teams without a pre-existing BI standardization.
- Grafana is provided as an alternate path for teams already standardized on Grafana for other observability dashboards (infrastructure metrics, logs); documenting both prevents the catalog from prescribing a BI tool the user did not specify.
- Per canonical Firebase guidance documented in public pipeline write-ups, teams build dashboards in Looker Studio or Grafana from BigQuery data to detect anomalies early (such as memory leaks or ANRs) before users feel the pain — this story operationalizes that recommendation.

---

### STORY-PA-06-S04: Document and respect the retention policy

**As a** security/privacy reviewer, **I want** the retention policy for crash data to be documented and enforced across both the Firebase managed copy and the BigQuery export, **so that** we are compliant with regulatory retention requirements and so that data subjects' rights (notably GDPR erasure) are respected end-to-end.

#### Acceptance Criteria

- **Given** Firebase's native retention window for Crashlytics data (the managed copy) and the team's BigQuery retention extension (the exported copy), **When** the team documents the policy, **Then** the policy explicitly states both windows, the rationale for each (regulatory, operational, contractual), and the procedure for adjusting either window as requirements evolve.
- **Given** a documented retention policy with a defined maximum age, **When** crash data ages out, **Then** the policy is enforced — either by Firebase's native expiration on the managed copy (no team action required) or by team-controlled BigQuery table partition expiration and table-level retention policies on the exported copy (configured per the policy's stated windows).
- **Given** a GDPR erasure request received by the privacy team, **When** the team processes it using the playbook from `EPIC-PA-09`, **Then** the erasure propagates to BOTH the Firebase managed copy (via Firebase's documented erasure mechanism) AND the BigQuery exported copy (via team-controlled SQL `DELETE` against the exported tables filtered by the data subject's identifier), and the documented retention policy explicitly states this dual-surface propagation requirement.
- **Given** a BigQuery dataset receiving the Crashlytics export, **When** the team configures BigQuery partition expiration (for example, partitioning by event date and expiring partitions older than the policy's stated window), **Then** the configuration matches the retention policy and a periodic dry-run query confirms that no rows older than the stated window remain in the dataset.

#### Notes

- Retention policy interacts closely with `EPIC-PA-09` Privacy and Compliance — this story documents the storage-side ENFORCEMENT (how retention is applied to each surface) while `EPIC-PA-09` documents the legal and governance FRAMING (why retention matters, what regulatory windows apply, how data-subject rights are honored).
- BigQuery's native table partition expiration and table-level retention features enable team-controlled retention without custom maintenance jobs; document recommended configurations (for example, partitioning by `event_date` with a configured expiration matching the team's policy) so each team adopting the export inherits a sensible default.
- The dual-surface erasure requirement is the most important detail to surface — an erasure that ignores the BigQuery export is incomplete because the data continues to exist in the team-owned BigQuery dataset even after Firebase has erased its copy, and a dry-run that erases only from Firebase and then queries BigQuery to confirm the record still exists demonstrates this point concretely during onboarding.

---

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4) and are applied symmetrically with the migration theme for catalog uniformity.

- **Given** grouped issues output by `EPIC-PA-05`, **When** the persistence stage runs, **Then** issues and their per-occurrence crash history are durably stored within Firebase's native managed storage with the full SDK-captured payload preserved and a consistent read surface available to downstream stages (`EPIC-PA-07`, `EPIC-PA-08`, `EPIC-PA-10`).
- **Given** a Firebase project with Crashlytics enabled, **When** the project owner completes the one-time BigQuery linking flow in the Firebase Console, **Then** crash, ANR, and non-fatal error data is exported on an ongoing basis to a BigQuery dataset in the destination GCP project, with the dataset auto-located in the United States by default and the data-residency implication communicated to the team.
- **Given** an active BigQuery link, **When** a data analyst queries the exported `crashlytics_*` tables, **Then** the data accurately reflects the Crashlytics-captured crashes with documented export latency and the row counts reconcile with the Firebase Console for overlapping time windows.
- **Given** Looker Studio (or Grafana) connected to the BigQuery dataset, **When** the dashboard author publishes panels for crash-free users, top issues by impact, and ANR trends, **Then** non-engineering stakeholders (product, executives, customer success) can view the dashboards without Firebase Console access and the panel values reconcile with the Firebase Console for the same time windows.
- **Given** a documented retention policy covering both the Firebase managed copy and the BigQuery exported copy, **When** crash data ages out, **Then** the policy is enforced by Firebase's native expiration on the managed copy and by team-controlled BigQuery partition expiration on the exported copy, and a GDPR erasure request propagates to BOTH surfaces per the dual-surface propagation requirement cross-referenced from `EPIC-PA-09`.

## Definition of Done

The epic is complete when ALL of the following observable conditions are simultaneously true:

- All 4 embedded stories (`STORY-PA-06-S01` through `STORY-PA-06-S04`) have their acceptance criteria satisfied.
- All 5 epic-level acceptance criteria above are satisfied.
- A test query against the BigQuery export confirms that a recent force-crash (from `EPIC-PA-01` capture and `EPIC-PA-02` transport, via `EPIC-MIG-09` test-crash validation if exercising the migration program) appears in the expected `crashlytics_*` table with expected columns populated and matches the corresponding occurrence visible in the Firebase Console.
- At least one downstream dashboard (Looker Studio OR Grafana) is wired against the BigQuery export and accessible to non-engineering stakeholders, with at least the three canonical panels (crash-free users, top issues by impact, ANR trends) defined and rendering correctly.
- The retention policy is documented in an accessible location (for example, the team's internal wiki or alongside this catalog) and reviewed by the privacy/legal team — covering both the Firebase managed copy and the BigQuery exported copy with explicit windows for each.
- The US default dataset location is communicated to all teams subject to data residency requirements (GDPR, regional data laws, contractual residency commitments), and the communication is referenced from `EPIC-PA-09` for completeness of the privacy posture.
- BigQuery partition expiration is configured on the exported tables to match the team's retention policy, and a periodic dry-run query confirms no rows older than the stated retention window remain in the dataset.

## Dependencies

This epic has the following relationships in the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-PA-05` | Persistence writes the grouped issues output by issue grouping — without grouping there is nothing structured to persist. |
| `Successor` | `EPIC-PA-07` | The Firebase Console dashboard reads issue cards and detail views from the persisted managed copy owned by this epic. |
| `Successor` | `EPIC-PA-08` | The alert engine queries persisted occurrence history for velocity computation, regression detection, and new-issue surfacing. |
| `Successor` | `EPIC-PA-10` | Pipeline SLOs (time-to-dashboard, crash-free-users trend) are computed from the persisted history maintained by this epic. |
| `Cross-Cutting` | `EPIC-PA-09` | Privacy controls — particularly GDPR / CCPA erasure and the retention policy framing — interact directly with persistence; erasure must propagate to both Firebase and the BigQuery export. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance. Inferred content not directly traceable to a public source is flagged inline as `[inferred — no direct source]`.

- [Firebase Crashlytics — Product Overview](https://firebase.google.com/docs/crashlytics) — Documents BigQuery and Cloud Logging export, custom dashboards, and custom alerts. Grounds the in-scope BigQuery linking and downstream dashboard items.
- [Firebase Crashlytics — Export to BigQuery](https://firebase.google.com/docs/crashlytics/bigquery-export) — Canonical procedure for linking Crashlytics to BigQuery and the documented export schema. Grounds `STORY-PA-06-S02` and the epic-level AC for ongoing export.
- [Firebase Crashlytics — Troubleshooting](https://firebase.google.com/docs/crashlytics/troubleshooting) — Documents that new BigQuery datasets created via the Crashlytics export are automatically located in the United States regardless of the location of the Firebase project. Grounds the data-residency awareness in `STORY-PA-06-S02` and the epic-level AC.
- [Firebase Products — Crashlytics](https://firebase.google.com/products/crashlytics) — Documents the BigQuery integration as a standard downstream consumer. Grounds the Looker Studio / Grafana downstream dashboards in `STORY-PA-06-S03`.
- [Crashlytics Pipeline Guide (ReverseBits)](https://reversebits.tech/blog/firebase-crashlytics-guide) — Documents downstream Looker Studio and Grafana dashboards built from BigQuery data to detect anomalies early (such as memory leaks or ANRs) before users feel the pain. Grounds the dashboard recommendations in `STORY-PA-06-S03`.
- [BigQuery — Table partition expiration](https://cloud.google.com/bigquery/docs/managing-partitioned-tables#partition-expiration) — Documents team-controlled retention via partition expiration on exported tables. Grounds the storage-side retention enforcement in `STORY-PA-06-S04`.
