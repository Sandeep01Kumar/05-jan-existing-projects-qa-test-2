# Crashlytics Epic Catalog

This catalog is a self-contained set of agile planning artifacts covering two coordinated themes: (a) the Crashlytics crash reporting pipeline from crash capture to dashboard delivery, and (b) the Fabric → Firebase Crashlytics migration broken into epics with explicit acceptance criteria. All artifacts in this catalog are markdown-only documentation — no SDK code, application code, build configuration, or runtime is created or modified. The catalog is intentionally read-only from the perspective of the existing repository fixture: no script imports it, no build references it, and no test discovers it. Treat this directory tree (`docs/epics/`) as a documentation island that an implementing team can lift into a ticketing system or wiki without touching the rest of the repository.

## User Request (Preserved Verbatim)

The two-bullet request below is reproduced character-for-character from the user's input and is preserved here so that downstream readers can independently verify that this catalog answers the question that was actually asked (Rule AR-8).

> User input — preserved verbatim:
> - Generate epics and stories for the Crashlytics crash reporting pipeline from crash capture to dashboard delivery
>   - Break down the Fabric to Firebase Crashlytics migration into epics with acceptance criteria

## How To Use This Catalog

- Readers seeking the pipeline catalog should open [pipeline/README.md](pipeline/README.md) for the canonical stage diagram and the full list of pipeline epics.
- Readers seeking the migration catalog should open [migration/README.md](migration/README.md) for the sequencing rationale, program exit criteria, and the full list of migration epics.
- Readers authoring new epics should derive them from [templates/epic-template.md](templates/epic-template.md).
- Readers authoring new stories should derive them from [templates/story-template.md](templates/story-template.md).
- Cross-references between epics use the stable identifiers documented in the [Conventions](#conventions) section below.

## Theme A — Crashlytics Crash Reporting Pipeline

This theme covers the inclusive end-to-end pipeline from on-device crash capture (SDK-level hooks for unhandled exceptions, NDK native crashes, ANRs, and non-fatal errors) through dashboard delivery (Firebase Console issue cards, App Quality Insights in Android Studio, and downstream consumers such as BigQuery-backed Looker Studio or Grafana dashboards). Each epic owns a single architectural concern with minimal cross-cutting overlap so that the partition is independently shippable and independently testable.

See [pipeline/README.md](pipeline/README.md) for the canonical stage diagram and detailed theme overview.

| Epic ID | Title | Summary |
|---------|-------|---------|
| [EPIC-PA-01](pipeline/EPIC-PA-01-crash-capture-and-buffering.md) | Crash Capture and On-Device Buffering | SDK-level capture of unhandled exceptions, NDK native crashes, ANRs (Android 11+ via `getHistoricalProcessExitReasons`), and non-fatal errors, with local persistence until next launch |
| [EPIC-PA-02](pipeline/EPIC-PA-02-upload-and-transport.md) | Upload and Transport | Background transport of buffered payloads on next launch, retry/backoff semantics, transport security, and post-app-close upload behavior |
| [EPIC-PA-03](pipeline/EPIC-PA-03-symbolication.md) | Symbolication | Mapping file lifecycle (Android ProGuard/R8 mappings, iOS dSYM, NDK native symbols) and human-readable crash construction |
| [EPIC-PA-04](pipeline/EPIC-PA-04-ingestion-and-validation.md) | Server-Side Ingestion and Validation | Logical ingest endpoints, schema validation, request authentication, and deduplication of incoming payloads |
| [EPIC-PA-05](pipeline/EPIC-PA-05-issue-grouping.md) | Issue Grouping and Lifecycle | Stack-trace fingerprinting, issue lifecycle states (open / closed / regressed), and merge/split workflows |
| [EPIC-PA-06](pipeline/EPIC-PA-06-persistence-and-bigquery-export.md) | Persistence and BigQuery Export | Durable storage of crashes and BigQuery export linkage for downstream Looker Studio / Grafana dashboards |
| [EPIC-PA-07](pipeline/EPIC-PA-07-dashboard-delivery.md) | Dashboard Delivery | Firebase Console issue cards, filters by severity/time/version/device, and App Quality Insights integration in Android Studio |
| [EPIC-PA-08](pipeline/EPIC-PA-08-alerting-and-notifications.md) | Alerting and Notifications | Velocity alerts (Crashlytics SDK v18.6.0+), regression alerts, and Slack/Jira/email notification channels |
| [EPIC-PA-09](pipeline/EPIC-PA-09-privacy-and-compliance.md) | Privacy and Compliance | Opt-in collection, PII redaction, GDPR/CCPA controls, and `setCrashlyticsCollectionEnabled` runtime override |
| [EPIC-PA-10](pipeline/EPIC-PA-10-pipeline-reliability-and-slos.md) | Pipeline Reliability and SLOs | End-to-end pipeline observability, SLOs (capture rate, time-to-dashboard), and error-budget policy |

## Theme B — Fabric → Firebase Crashlytics Migration

This theme sequences the Fabric SDK → Firebase Crashlytics SDK migration into ten epics covering every supported client platform (Android, iOS, Flutter, Unity, React Native). Every migration epic carries explicit Given-When-Then acceptance criteria per the user's R-2 mandate, and the sequence is ordered by dependency: inventory and project provisioning precede platform-specific SDK swaps; symbol-upload cutover follows the SDK swaps; analytics translation can proceed in parallel; historical-data migration and test-crash validation precede the final Fabric decommission.

See [migration/README.md](migration/README.md) for the sequencing rationale and program exit criteria.

| Epic ID | Title | Summary |
|---------|-------|---------|
| [EPIC-MIG-01](migration/EPIC-MIG-01-inventory-and-readiness.md) | Inventory and Readiness | Audit Fabric usage per app and platform; verify AndroidX migration prerequisite; identify risk factors |
| [EPIC-MIG-02](migration/EPIC-MIG-02-firebase-project-provisioning.md) | Firebase Project Provisioning | Create Firebase project (analogous to Fabric organization); link app bundle IDs; enable Google Analytics for breadcrumb logs |
| [EPIC-MIG-03](migration/EPIC-MIG-03-android-sdk-migration.md) | Android SDK Migration | Remove Fabric Maven repo and Gradle plugin; add `firebase-crashlytics-gradle`; adopt Firebase Android BoM |
| [EPIC-MIG-04](migration/EPIC-MIG-04-ios-sdk-migration.md) | iOS SDK Migration | Remove Fabric Run Script Build Phase; migrate CocoaPods (drop `pod 'Fabric'`, `pod 'Crashlytics'`); update AppDelegate init |
| [EPIC-MIG-05](migration/EPIC-MIG-05-cross-platform-sdk-migration.md) | Cross-Platform SDK Migration | FlutterFire `firebase_crashlytics`, Unity Firebase plugin, and `@react-native-firebase/crashlytics` adoption |
| [EPIC-MIG-06](migration/EPIC-MIG-06-symbol-and-mapping-upload-cutover.md) | Symbol and Mapping Upload Cutover | Cutover mapping uploads to the new 100 KB Crashlytics Gradle plugin; integrate dSYM and NDK symbol upload |
| [EPIC-MIG-07](migration/EPIC-MIG-07-analytics-event-translation.md) | Analytics Event Translation | Translate Answers events to Google Analytics for Firebase predefined or custom events |
| [EPIC-MIG-08](migration/EPIC-MIG-08-historical-data-migration.md) | Historical Data Migration | Migrate historical Crashlytics data via the Firebase migration page; reconcile pre- and post-cutover issue counts |
| [EPIC-MIG-09](migration/EPIC-MIG-09-test-crash-validation-cutover.md) | Test-Crash Validation and Cutover | Force test crashes; confirm receipt in Firebase Console within five minutes; dual-running validation window |
| [EPIC-MIG-10](migration/EPIC-MIG-10-fabric-sdk-decommission.md) | Fabric SDK Decommission | Remove all `fabric.io` references; retire legacy upload jobs; archive Fabric organization |

## Templates

All 20 epic files derive from a single uniform template (Rule AR-1) so that downstream readers — engineering, QA, product management — encounter a consistent, scannable structure across every artifact. Stories live inside their parent epic files and follow a separate story template for the same reason.

- [epic-template.md](templates/epic-template.md) — Canonical epic structure (Metadata → Description → Business Value → In Scope → Out of Scope → User Stories → Acceptance Criteria (Epic-Level) → Definition of Done → Dependencies → References).
- [story-template.md](templates/story-template.md) — Canonical INVEST-aligned story structure with a Given-When-Then acceptance criteria block and an optional Notes section.

## Conventions

### Identifier Conventions

- Pipeline epic IDs follow the pattern `EPIC-PA-NN` where `NN` is a zero-padded two-digit ordinal (`01` through `10`). The `PA` prefix denotes "Pipeline Architecture" (also referred to as "Pipeline / Capture-to-dashboard A-side" in the AAP).
- Migration epic IDs follow the pattern `EPIC-MIG-NN` where `NN` is a zero-padded two-digit ordinal (`01` through `10`).
- Pipeline story IDs follow the pattern `STORY-PA-NN-SMM` where `NN` matches the parent epic's number and `MM` is a zero-padded two-digit story ordinal within that epic (for example, `STORY-PA-01-S03` is the third story inside `EPIC-PA-01`).
- Migration story IDs follow the pattern `STORY-MIG-NN-SMM` with the same semantics (for example, `STORY-MIG-03-S02`).
- Identifiers are stable, unique across the entire catalog, monotonically numbered, and must never be reused or renumbered once assigned (Rule AR-2).

### Story Format

- Every story uses INVEST-aligned framing: `As a <role>, I want <capability>, so that <outcome>.`
- Roles cover at minimum: mobile end-user, mobile developer, release manager, on-call engineer, data analyst, security/privacy reviewer, and migration program lead (Rule AR-3).
- Stories aim to be Independent, Negotiable, Valuable, Estimable, Small, and Testable — the INVEST mnemonic.
- Stories live INSIDE their parent epic file (not in separate files) to keep each epic self-contained and to eliminate broken cross-file links during refactors.

### Acceptance Criteria Format

- Every story carries 2–5 acceptance criteria phrased as `Given <precondition>, When <event>, Then <observable outcome>` (Rule AR-4).
- Every epic additionally carries 3–6 epic-level acceptance criteria summarizing exit conditions across its stories.
- This Given-When-Then discipline satisfies the user's R-2 directive ("epics with acceptance criteria") and is applied symmetrically to the pipeline theme for catalog uniformity.

### Authoring Rules

- `Rule AR-1 — Template Discipline:` Every epic derives from [templates/epic-template.md](templates/epic-template.md); every story block derives from [templates/story-template.md](templates/story-template.md).
- `Rule AR-2 — Stable Identifiers:` Epic and story IDs are stable, unique, monotonically numbered, and never reused or renumbered.
- `Rule AR-3 — INVEST-Aligned Stories:` Every story uses the `As a / I want / So that` framing and is sized to be Independent, Negotiable, Valuable, Estimable, Small, and Testable.
- `Rule AR-4 — Given-When-Then Acceptance Criteria:` Every story has 2–5 acceptance criteria; every epic has 3–6 epic-level acceptance criteria, all expressed in Given-When-Then form.
- `Rule AR-5 — Source Grounding:` Every epic's `References` section cites public Firebase or Crashlytics guidance; inferred content is flagged `[inferred — no direct source]`.
- `Rule AR-6 — No Time-Based Planning:` Epics describe *what* and *how*; they never prescribe *when* (no sprint numbers, no calendar dates, no week-by-week schedules).
- `Rule AR-7 — Dashed Lists Only:` All unordered lists use `-` markers; numbered bullets are not used anywhere in the catalog.
- `Rule AR-8 — Verbatim User Inputs:` The user's two requirement bullets are preserved verbatim in this README and in both theme READMEs to maintain fidelity to the user's intent.

## Catalog Statistics

This catalog comprises 25 net-new markdown files: 1 master index (this file), 2 reusable templates, 1 pipeline theme index plus 10 pipeline epics, and 1 migration theme index plus 10 migration epics. No existing repository file is modified.

- 1 master index (`docs/epics/README.md`)
- 2 reusable templates (`docs/epics/templates/*.md`)
- 1 pipeline theme index (`docs/epics/pipeline/README.md`)
- 10 pipeline epics (`docs/epics/pipeline/EPIC-PA-01..10-*.md`)
- 1 migration theme index (`docs/epics/migration/README.md`)
- 10 migration epics (`docs/epics/migration/EPIC-MIG-01..10-*.md`)
- Total: 25 new markdown files

## Repository Constraints Honored

The catalog is purely additive and honors every repository constraint documented in the technical specification.

- `C-001 (Repository immutability):` The 12 pre-existing repository files remain byte-for-byte unchanged.
- `C-002 (Zero dependencies):` Markdown files require no runtime, framework, or library; `package.json` and `package-lock.json` are not touched.
- `C-003 (No build step):` Markdown documents render natively; no build, compilation, or transpilation step is introduced.
- `C-004 (No network surface changes):` The localhost-only `server.js` is unaffected by this catalog.
