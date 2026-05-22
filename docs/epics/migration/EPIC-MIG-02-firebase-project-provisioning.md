# EPIC-MIG-02: Firebase Project Provisioning

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-MIG-02` |
| Theme | `Migration` |
| Phase | `Phase 1 — Foundation` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `none (predecessor); EPIC-MIG-01 (parallel); EPIC-MIG-03, EPIC-MIG-04, EPIC-MIG-05, EPIC-MIG-07 (successors)` |
| Last Updated | `n/a` |

## Description

This epic provisions the Firebase project(s) that will host the migrated Crashlytics data and analytics for every client app in scope. Per canonical Firebase migration guidance, a Firebase project is analogous to a Fabric organization, and for cross-platform apps the recommended pattern is a SINGLE project containing both the Android and iOS versions — the single-project pattern unlocks shared Firebase features (Realtime Database, Analytics, Cloud Messaging, Remote Config) that all key off the same project identity. The epic covers linking each platform's app via its native bundle identifier (Android package name, iOS bundle identifier, plus Flutter / Unity / React Native variants that delegate to those native identities), configuring Google Cloud IAM team access roles (Firebase Admin, Firebase Crashlytics Admin, Firebase Crashlytics Viewer, Firebase Analytics Viewer), and enabling Google Analytics for Firebase so Crashlytics breadcrumb logs populate in issue cards downstream. This epic is the foundation for `EPIC-MIG-03`, `EPIC-MIG-04`, and `EPIC-MIG-05` (which download platform-specific config files — `google-services.json` for Android, `GoogleService-Info.plist` for iOS — from the provisioned project) and for `EPIC-MIG-07` (which depends on Google Analytics for Firebase being enabled). This epic sits in Phase 1 alongside `EPIC-MIG-01` (inventory and readiness); the two have no inter-dependency and can execute in parallel — both, however, must complete before any Phase 2 platform SDK swap begins.

## Business Value

The Firebase project is the DESTINATION for all post-migration crash and analytics data — without it, no platform SDK swap epic can produce a working `google-services.json` or `GoogleService-Info.plist`. The single-project-per-cross-platform-app pattern reduces administrative overhead (one project per product line rather than per platform), unlocks shared Firebase features (Realtime Database, Cloud Messaging, Remote Config), and produces a single Crashlytics view that aggregates issues across all platforms of a product — the triage experience on-call engineers and release managers expect. Enabling Google Analytics for Firebase is the gateway to breadcrumb logs in Crashlytics issue cards: breadcrumbs surface user-journey events preceding each crash and accelerate root-cause diagnosis compared with stack traces alone. IAM-based access control replaces Fabric's coarse role model with three upgrades for security and compliance reviewers — least-privilege role granularity (Crashlytics Viewer vs. Admin vs. Analytics Viewer), Cloud Audit Log integration that records every membership change with actor identity and timestamp, and Cloud IAM Conditions that can time-bound contractor access. Roles that benefit include the migration program lead (foundation that gates downstream epics), mobile developers (config files for SDK install), on-call engineers (richer issue cards), security/privacy reviewers (auditable IAM trails), and release managers (a single project that owns the product's crash signal end-to-end).

## In Scope

The following items are included in this epic:

- Creation of a Firebase project — one per Fabric organization; for cross-platform apps spanning Android and iOS, a SINGLE project contains both platforms per the recommended Firebase pattern.
- Selection and recording of the Google Cloud Platform organization that owns each project, including project ID, project number, and GCP link in the migration program documentation.
- Linking of Android apps via Android package name (e.g., `com.example.app`), with optional SHA-1 / SHA-256 certificate fingerprints per variant.
- Linking of iOS apps via iOS bundle identifier (e.g., `com.example.app`), with optional App Store ID and team ID captured.
- Linking of Flutter, Unity, and React Native app variants by their underlying Android package names and iOS bundle identifiers, since these frameworks delegate to native identities for Firebase linkage.
- Configuration of team access via Google Cloud IAM roles (`roles/firebase.admin`, `roles/firebasecrashlytics.admin`, `roles/firebasecrashlytics.viewer`, `roles/firebaseanalytics.viewer`), with assignments documented and least-privilege as the default.
- Enablement of Google Analytics for Firebase in every project, including the linked Google Analytics property and its data streams, because Analytics is a hard prerequisite for Crashlytics breadcrumb logs.
- Download and secure handoff of platform-specific configuration files (`google-services.json` per Android variant; `GoogleService-Info.plist` per iOS app) as the input contract for `EPIC-MIG-03`, `EPIC-MIG-04`, and `EPIC-MIG-05`.
- Recording of Firebase project metadata (project ID, project number, GCP organization, enabled product set, IAM role assignments) in the migration program documentation so downstream epics and audits can reference the foundation without re-discovery.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- Installation of any Crashlytics or Firebase SDK in any client app (including all `build.gradle`, `Podfile`, `pubspec.yaml`, Unity Package Manager, and `package.json` changes) — owned by `EPIC-MIG-03` (Android), `EPIC-MIG-04` (iOS), and `EPIC-MIG-05` (cross-platform).
- Cataloguing of Fabric references and AndroidX prerequisite verification — owned by `EPIC-MIG-01`, proceeding in parallel.
- Migration of historical Crashlytics data from the legacy Fabric service via the Firebase migration page — owned by `EPIC-MIG-08`.
- Translation of Fabric Answers events to Google Analytics for Firebase predefined or custom events — owned by `EPIC-MIG-07`; this epic only enables Google Analytics so the translation has a target.
- Mapping-file and dSYM upload pipeline cutover to the Firebase Crashlytics Gradle plugin and the Firebase upload APIs — owned by `EPIC-MIG-06`.
- Test-crash validation (`throw RuntimeException("Force Crash")`, `fatalError()`) and the dual-running validation window — owned by `EPIC-MIG-09`.
- Final removal of all `fabric.io` references, retirement of legacy upload jobs, and archival of the Fabric organization — owned by `EPIC-MIG-10`.
- Billing or paid plan setup — Crashlytics is free, but other Firebase products may require the Blaze (pay-as-you-go) plan; coordinated with finance outside the migration program.

## User Stories

This epic contains 4 user stories. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings (Rule AR-1). Stories live INSIDE their parent epic file to keep each epic self-contained and eliminate broken cross-file links during refactors.

### STORY-MIG-02-S01: Create Firebase project as analog to Fabric organization

**As a** migration program lead, **I want** to create a Firebase project for each Fabric organization being migrated, **so that** there is a one-to-one destination for all post-migration crash and analytics data.

#### Acceptance Criteria

- **Given** access to the Firebase Console with appropriate Google Cloud organization permissions, **When** the program lead clicks "Add project", provides a project name, and selects the owning Google Cloud Platform organization, **Then** a new Firebase project is created and visible in the Console project list with a non-empty project ID and project number.
- **Given** every Fabric organization in the migration program's scope (as enumerated by `EPIC-MIG-01`'s readiness report), **When** the program lead inspects the Firebase Console after project creation, **Then** a corresponding Firebase project exists for every in-scope organization with no organization missing.
- **Given** each newly created Firebase project, **When** the program lead opens its settings panel, **Then** the project ID, project number, owning GCP organization, and GCP project link are recorded in the migration program documentation for downstream reference by `EPIC-MIG-03`, `EPIC-MIG-04`, `EPIC-MIG-05`, and `EPIC-MIG-07`.
- **Given** a cross-platform app that spans Android and iOS (and optionally Flutter, Unity, or React Native), **When** the program lead creates the Firebase project for that app, **Then** a SINGLE Firebase project contains all platforms for that app per the recommended cross-platform pattern, not two parallel projects.

#### Notes

- Per canonical Firebase migration guidance, a Firebase project is analogous to a Fabric organization, and for cross-platform apps the recommended pattern is a single Firebase project containing both Android and iOS versions to take advantage of shared Firebase features such as Realtime Database, Cloud Messaging, and Analytics.
- Firebase projects are owned by Google Cloud Platform organizations; the GCP organization choice can be hard to change after creation, so confirm with security and platform teams before clicking "Create project".

---

### STORY-MIG-02-S02: Link platform-specific apps to the Firebase project

**As a** mobile developer, **I want** every client platform app (Android, iOS, Flutter, Unity, React Native) linked to its Firebase project via its native bundle identifier, **so that** platform-specific configuration files are downloadable and crashes are routed to the correct project.

#### Acceptance Criteria

- **Given** the Firebase project for a product line, **When** the developer clicks "Add app" → Android and enters the Android package name (e.g., `com.example.app`), **Then** an Android app is linked to the project and `google-services.json` is downloadable from the project settings.
- **Given** the Firebase project for a product line, **When** the developer clicks "Add app" → iOS and enters the iOS bundle identifier (e.g., `com.example.app`), **Then** an iOS app is linked to the project and `GoogleService-Info.plist` is downloadable from the project settings.
- **Given** a Flutter, Unity, or React Native app, **When** the developer adds it via its underlying Android package name and iOS bundle identifier (one binding per native platform), **Then** both the Android and iOS app bindings appear under the project's app list and both configuration files are downloadable.
- **Given** an Android app that supports multiple bundle variants (e.g., `com.example.app.debug`, `com.example.app.staging`, `com.example.app`), **When** the developer adds each variant's package name as a separate Android app, **Then** each variant has its own `google-services.json` reflecting its distinct package name.

#### Notes

- Optional SHA-1 / SHA-256 certificate fingerprints can be added per Android app for Firebase features that require certificate-based authentication (Dynamic Links, App Check, Google Sign-In, Phone Auth); the fingerprints propagate into a refreshed `google-services.json` on download.
- For cross-platform apps that also ship to tvOS or macOS in addition to iOS, those platforms can share the iOS bundle identifier per canonical Firebase guidance — confirm with the platform owner before creating duplicate bindings.
- The downloaded `google-services.json` and `GoogleService-Info.plist` are the contract handoff to `EPIC-MIG-03`, `EPIC-MIG-04`, and `EPIC-MIG-05`; store them in source control following team conventions and avoid exposing API keys via public mirrors.

---

### STORY-MIG-02-S03: Configure team access control via IAM

**As a** security/privacy reviewer, **I want** team access to every Firebase project configured via Google Cloud IAM roles, **so that** least-privilege access is enforced, assignments are auditable, and changes are recorded in Cloud Audit Logs.

#### Acceptance Criteria

- **Given** the Firebase project, **When** the program lead navigates to Project Settings → Users and Permissions (or IAM & Admin → IAM in the Google Cloud Console), **Then** the access list shows the migration program team members with explicit IAM role grants matching the documented access matrix for that project.
- **Given** the documented access matrix, **When** the security reviewer audits the role assignments, **Then** every member holds the LEAST role required — for example, `roles/firebasecrashlytics.viewer` for on-call engineers, `roles/firebasecrashlytics.admin` for the migration team, `roles/firebaseanalytics.viewer` for analysts who consume Analytics dashboards.
- **Given** any external party (contractor or vendor consultant) requires access, **When** the program lead grants the IAM role, **Then** the addition is recorded in Cloud Audit Logs with actor identity, principal added, role granted, and a UTC timestamp, providing a permanent audit trail.
- **Given** the migration program team membership at the time of audit, **When** the security reviewer cross-references current IAM members against the active personnel roster, **Then** no orphaned permissions remain (e.g., grants for departed team members or for those whose responsibilities have changed).

#### Notes

- Firebase project IAM is built on Google Cloud IAM; role inheritance from the owning GCP organization or folder flows down to the project and should be reviewed before assigning project-scoped roles.
- For organizations with regulatory compliance requirements or for contractor access, consider applying Cloud IAM Conditions to time-bound role grants so access expires automatically rather than relying on manual revocation.

---

### STORY-MIG-02-S04: Enable Google Analytics for Firebase for breadcrumb logs

**As a** mobile developer, **I want** Google Analytics for Firebase enabled in every Firebase project, **so that** Crashlytics breadcrumb logs are available in crash issue cards and on-call engineers can trace the user-journey events that preceded each crash.

#### Acceptance Criteria

- **Given** the Firebase project, **When** the developer navigates to Project Settings → Integrations → Google Analytics and clicks "Enable", **Then** the integration is enabled, a linked Google Analytics property is configured (existing property selected or a new one created), and the project's Integrations panel reports Google Analytics as Active.
- **Given** Google Analytics for Firebase is enabled, **When** an Android or iOS app linked to the project is configured with the Firebase SDK for Google Analytics by the downstream platform SDK swap epics (`EPIC-MIG-03`, `EPIC-MIG-04`, `EPIC-MIG-05`), **Then** Analytics events emitted from the app are received by the linked Analytics property and surface as breadcrumb logs in Crashlytics issue cards.
- **Given** a Firebase project that does NOT have Google Analytics enabled at the time of readiness review, **When** the migration program lead reviews readiness, **Then** the project is flagged as "Analytics Not Enabled" and Google Analytics is enabled before `EPIC-MIG-07` (analytics event translation) begins for that project.

#### Notes

- Per canonical Firebase guidance for Crashlytics on Android, breadcrumb logs require both the Firebase SDK for Google Analytics in the app AND Google Analytics enabled in the Firebase project; this epic establishes the project-side half of the prerequisite, while the SDK-side half is owned by `EPIC-MIG-03`, `EPIC-MIG-04`, and `EPIC-MIG-05`.
- Enabling Google Analytics for Firebase is free and is recommended for all Firebase projects regardless of immediate Analytics consumption — enabling it later does not retroactively populate breadcrumb logs for past crashes.
- The linked Google Analytics property's data-stream configuration should match the platform set of the Firebase project (Android stream for the Android binding, iOS stream for the iOS binding).

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4). They satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically to the pipeline theme for catalog uniformity.

- **Given** every Fabric organization in the migration program's scope (from `EPIC-MIG-01`'s readiness report), **When** the program lead inspects the Firebase Console, **Then** a corresponding Firebase project exists with project ID, project number, and GCP organization recorded in the migration program documentation.
- **Given** every client platform app enumerated in `EPIC-MIG-01`'s inventory, **When** the developer inspects the Firebase project's app list, **Then** the platform-specific app is linked with its correct bundle identifier and the corresponding configuration file (`google-services.json` for Android, `GoogleService-Info.plist` for iOS) is downloadable.
- **Given** the IAM role assignments for every Firebase project, **When** the security reviewer audits them against the documented access matrix, **Then** every team member holds least-privilege access, no orphaned permissions remain, and Cloud Audit Logs record every grant and revocation.
- **Given** every Firebase project provisioned by this epic, **When** the developer opens the project's Integrations panel, **Then** Google Analytics for Firebase is enabled and a linked Google Analytics property is configured.
- **Given** all 4 embedded stories' acceptance criteria are satisfied, **When** the program lead audits the epic, **Then** the foundation is ready and the Phase 2 platform SDK swap epics (`EPIC-MIG-03`, `EPIC-MIG-04`, `EPIC-MIG-05`) are authorized to begin consuming the downloaded configuration files.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 4 embedded stories' acceptance criteria are satisfied.
- All 5 epic-level acceptance criteria are satisfied.
- A Firebase project exists for every Fabric organization in scope, with project ID, number, and GCP organization recorded in the migration program documentation.
- Every client app from `EPIC-MIG-01`'s inventory is linked via the correct Android package name or iOS bundle identifier; Flutter / Unity / React Native variants are linked via both native identifiers.
- `google-services.json` is downloadable for every Android binding (including per-variant bindings); `GoogleService-Info.plist` is downloadable for every iOS binding.
- IAM role assignments are audited, follow least-privilege, and have no orphaned permissions; Cloud Audit Logs record every grant and revocation.
- Google Analytics for Firebase is enabled in every project with a linked Analytics property configured for the project's platform set.
- Firebase project IDs, app bindings, IAM assignments, and Analytics property links are recorded in the migration program documentation for reference by downstream successor epics.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `none` | This epic is one of two Phase 1 (Foundation) epics with no internal predecessors. `EPIC-MIG-01` is a parallel Phase 1 epic, not a predecessor. |
| `Parallel` | `EPIC-MIG-01` | Inventory and readiness runs in parallel with Firebase project provisioning; the two have no inter-dependency, but BOTH must complete before any Phase 2 platform SDK swap begins. |
| `Successor` | `EPIC-MIG-03` | Android SDK migration depends on the Firebase project being provisioned, the Android app binding existing with the correct package name, and `google-services.json` being downloadable for the Android app variant. |
| `Successor` | `EPIC-MIG-04` | iOS SDK migration depends on the Firebase project being provisioned, the iOS app binding existing with the correct bundle identifier, and `GoogleService-Info.plist` being downloadable for the iOS app. |
| `Successor` | `EPIC-MIG-05` | Cross-platform SDK migration (Flutter, Unity, React Native) depends on the Firebase project being provisioned and on both Android and iOS native bindings existing with their respective configuration files downloadable. |
| `Successor` | `EPIC-MIG-07` | Analytics event translation depends on Google Analytics for Firebase being enabled in the project so that translated events have a configured Analytics property to target. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance.

- [Firebase Crashlytics iOS Migration Guide (crashlytics-migration-ios)](https://github.com/FirebaseExtended/crashlytics-migration-ios) — Documents the Firebase project ≈ Fabric organization analogy and the recommended single-Firebase-project-per-cross-platform-app pattern for sharing features such as Realtime Database.
- [Get started with Firebase Crashlytics for Android](https://firebase.google.com/docs/crashlytics/get-started?platform=android) — Documents the requirement to enable Google Analytics in the Firebase project for Crashlytics breadcrumb logs.
- [Firebase Console](https://console.firebase.google.com) — Web UI used to create Firebase projects, add app bindings, download `google-services.json` / `GoogleService-Info.plist`, manage IAM, and enable Google Analytics integrations.
- [Firebase IAM roles](https://firebase.google.com/docs/projects/iam/roles) — Documents the IAM roles available for Firebase projects (Firebase Admin, Firebase Crashlytics Admin, Firebase Crashlytics Viewer, Firebase Analytics Viewer) and the inheritance model from the owning GCP organization.
- [It's time to upgrade to the new Firebase Crashlytics SDK — Firebase Blog](https://firebase.blog/posts/2020/10/its-time-to-upgrade-to-new-firebase/) — Provides the November 15 sunset context that motivates this migration program.
