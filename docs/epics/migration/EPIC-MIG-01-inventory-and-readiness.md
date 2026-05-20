# EPIC-MIG-01: Inventory and Readiness

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-MIG-01` |
| Theme | `Migration` |
| Phase | `Phase 1 — Foundation` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `none (predecessor); EPIC-MIG-02 (parallel); EPIC-MIG-03, EPIC-MIG-04, EPIC-MIG-05, EPIC-MIG-06 (successors)` |
| Last Updated | `n/a` |

## Description

This epic produces the migration program's readiness artifact: a complete, per-app inventory of every Fabric reference across every client platform — Android, iOS, Flutter, Unity, and React Native — including Fabric SDK version, integration depth, build-system entry points (Gradle, CocoaPods, `pubspec.yaml`, Unity package manifest, `package.json`), and any custom configurations such as Answers event taxonomies or third-party Fabric integrations. For Android apps, the epic verifies the AndroidX migration prerequisite — the Firebase Crashlytics SDK uses AndroidX as a dependency, so an Android app not yet on AndroidX cannot adopt the new SDK and must be deferred until its AndroidX migration completes. The epic also identifies per-app risk factors (DexGuard usage, custom ProGuard/R8 rules, NDK native code, multi-bundle-variant configurations, Bitcode-enabled iOS builds, custom dSYM-upload pipelines, third-party tools consuming Fabric data) and records each one against the migration theme README's Risk Register Summary table. The epic's principal output is a signed-off readiness report consumed by `EPIC-MIG-03` (Android), `EPIC-MIG-04` (iOS), and `EPIC-MIG-05` (cross-platform) to scope and plan their platform-specific work. This epic sits in Phase 1 alongside `EPIC-MIG-02` (Firebase project provisioning); the two have no inter-dependency and can execute in parallel — both, however, must complete before any Phase 2 platform SDK swap begins.

## Business Value

The inventory is the SOURCE OF TRUTH for migration scope. Without it, the migration program risks missing apps or platforms and producing partial coverage of the Fabric → Firebase Crashlytics transition — a partial migration is worse than no migration because the legacy Fabric SDK was sunset on November 15 and any app still using it no longer reports crashes. AndroidX prerequisite verification prevents wasted work: an Android app not yet on AndroidX cannot adopt the Firebase Crashlytics SDK and must be deferred, so identifying these apps up front avoids a stalled SDK swap mid-Phase-2. Risk identification surfaces costly issues (DexGuard, custom obfuscation, multi-bundle variants, NDK native code, Bitcode-enabled iOS builds) BEFORE they block downstream epics, enabling proactive mitigation rather than reactive firefighting. Finally, the readiness report is the document that program coordinators present to release management, engineering, and security to authorize Phase 2 work — it is the audit trail of "what we know and what we do not yet know" at the start of the program, and it provides the explicit go/no-go signal for every app in scope. The roles that benefit are the migration program lead (visibility into total scope), platform mobile developers (pre-scoped per-app work items), release management (a signed go/no-go gate), and security/privacy reviewers (visibility into third-party data flows that change during migration).

## In Scope

The following items are included in this epic:

- Audit of every client app's source, build configuration, and CI pipeline for Fabric references via `grep -ril "fabric.io"` and `grep -ril "io.fabric"` discipline across each app's working tree.
- Per-platform inventory across all five supported client platforms: Android (root and module `build.gradle`, `AndroidManifest.xml`, source), iOS (`Podfile`, `Podfile.lock`, Xcode `project.pbxproj`, Run Script Build Phases, `AppDelegate`), Flutter (`pubspec.yaml`, Dart source, platform overrides under `android/` and `ios/`), Unity (Asset folder, Unity package manifest), React Native (`package.json`, native module bridges, autolinking config).
- Verification that each Android app has migrated to AndroidX by confirming `android.useAndroidX=true` in `gradle.properties` and the absence of legacy `android.support.*` imports.
- Identification of custom Fabric integrations: bespoke Answers event taxonomies and third-party tools consuming Fabric data (marketing dashboards, internal reporting tools, external observability vendors).
- Identification of risk factors per app: DexGuard usage, ProGuard/R8 custom configurations, NDK native code (and ABIs targeted), multi-bundle-variant configurations, Bitcode-enabled iOS builds, custom dSYM-upload pipelines, and pre-Android-11 user-base concentration (relevant to ANR collection coverage).
- Production of the readiness report (a markdown document committed to the migration program documentation) summarizing inventory, AndroidX status, and risks per app with explicit "Ready For Migration" booleans.
- Cross-reference of each identified risk to the migration theme README's Risk Register Summary table (rows `R-MIG-01` through `R-MIG-06`, extended as needed).
- Stakeholder sign-off of the readiness report by release management, engineering, and security before Phase 2 work begins.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- The AndroidX migration itself for apps not yet on AndroidX — owned by the app's mobile team; this epic only VERIFIES status and flags deferral via `R-MIG-01`.
- Firebase project provisioning (project creation, linking app bundle IDs, team access, enabling Google Analytics for breadcrumb logs) — owned by `EPIC-MIG-02`, proceeding in parallel.
- Any SDK installation, build-system change, or source-code modification — owned by `EPIC-MIG-03` (Android), `EPIC-MIG-04` (iOS), and `EPIC-MIG-05` (cross-platform).
- Resolution of identified risks (e.g., DexGuard rule tuning, NDK symbol-upload pipeline rebuild, dSYM-upload reconfiguration) — owned by the relevant platform-specific epic or by `EPIC-MIG-06` for symbol cutover.
- Translation of Answers event taxonomies to Google Analytics for Firebase — owned by `EPIC-MIG-07`.
- Historical Crashlytics data migration via the Firebase migration page — owned by `EPIC-MIG-08`.
- Test-crash validation and the dual-running validation window — owned by `EPIC-MIG-09`.
- Final Fabric SDK decommission — owned by `EPIC-MIG-10`.

## User Stories

This epic contains 4 user stories. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings (Rule AR-1). Stories live INSIDE their parent epic file to keep each epic self-contained and eliminate broken cross-file links during refactors.

### STORY-MIG-01-S01: Audit Fabric usage across all apps and platforms

**As a** migration program lead, **I want** a complete inventory of every Fabric reference across every client app and platform, **so that** the migration scope is fully known before any platform-specific work begins.

#### Acceptance Criteria

- **Given** every client app's repository, **When** a developer runs `grep -ril "fabric.io"` and `grep -ril "io.fabric"` across the working tree, **Then** every match is captured in the inventory with file path, line number, and platform classification.
- **Given** the inventory document, **When** the program lead reviews it, **Then** every client app (Android, iOS, Flutter, Unity, React Native) appears with platform-specific Fabric integration details enumerated, with no app omitted.
- **Given** an iOS app, **When** the developer inspects the `Podfile`, `Podfile.lock`, and Xcode `project.pbxproj`, **Then** Fabric pods (`pod 'Fabric'`, `pod 'Crashlytics'`), the Crashlytics Run Script Build Phase, and any `Fabric.with([...])` calls in `AppDelegate` are catalogued individually.
- **Given** an Android app, **When** the developer inspects root and module `build.gradle`, `AndroidManifest.xml`, and source, **Then** the Fabric Maven repository (`maven { url 'https://maven.fabric.io/public' }`), the Fabric Gradle plugin (`io.fabric.tools:gradle`), the Fabric API key `meta-data` in the manifest, and any `Fabric.with(this, new Crashlytics())` calls are catalogued.

#### Notes

- For repositories that span multiple apps (mono-repos), apply the inventory PER APP, not per repository — each app's flavor, variant, and target set may differ.
- The grep discipline must include BOTH `fabric.io` and `io.fabric` because they appear in different contexts: `fabric.io` matches the Maven repository URL and the service host, while `io.fabric` matches the Gradle plugin ID and the legacy Java package prefix.

---

### STORY-MIG-01-S02: Verify AndroidX migration prerequisite for every Android app

**As a** mobile developer, **I want** to verify that every Android app in scope has completed migration to AndroidX, **so that** the apps are ready to adopt the Firebase Crashlytics SDK, which uses AndroidX as a dependency.

#### Acceptance Criteria

- **Given** each Android app's `gradle.properties` file, **When** the developer inspects it, **Then** the presence (or absence) of `android.useAndroidX=true` is recorded in the inventory entry for that app.
- **Given** each Android app's source code, **When** the developer searches for legacy `android.support.*` package imports, **Then** the result (zero matches or a listing of offending files) is recorded in the inventory entry for that app.
- **Given** an Android app that is NOT on AndroidX, **When** the program lead reviews the inventory, **Then** the app is removed from the immediate Crashlytics migration scope and tagged with risk `R-MIG-01` (AndroidX prerequisite gap), with a clear re-entry path documented (e.g., "Re-evaluate once AndroidX migration completes").
- **Given** the AndroidX verification is complete for all Android apps in scope, **When** the program lead audits the inventory, **Then** the readiness report includes an explicit "AndroidX Ready" status per Android app, with each entry valued as one of `Ready`, `Deferred`, or `In Progress`.

#### Notes

- The AndroidX migration itself is performed via Android Studio's `Refactor → Migrate to AndroidX` automation; manual handling may be required for custom libraries or third-party SDKs that do not ship AndroidX-compatible artifacts.
- Per canonical Firebase migration guidance, the Firebase Crashlytics SDK uses AndroidX as a dependency — this is a HARD prerequisite, not a recommendation, and the SDK swap in `EPIC-MIG-03` cannot proceed for a non-AndroidX app.

---

### STORY-MIG-01-S03: Identify risk factors and custom Fabric integrations

**As a** migration program lead, **I want** to identify per-app risk factors and custom Fabric integrations, **so that** known risks are surfaced BEFORE platform SDK swap epics begin, allowing proactive mitigation rather than reactive firefighting.

#### Acceptance Criteria

- **Given** the inventory document from `STORY-MIG-01-S01`, **When** the program lead reviews each app entry, **Then** the following risk factors are recorded where present: DexGuard usage, custom ProGuard/R8 rules, NDK native code (and the ABIs targeted), multi-bundle-variant configurations, Bitcode-enabled iOS builds, custom dSYM-upload pipelines, and third-party tools consuming Fabric data.
- **Given** each identified risk, **When** the program lead categorizes it, **Then** the risk is mapped to a row in the migration theme README's Risk Register Summary table (`R-MIG-01` through `R-MIG-06`, or a new row appended for novel risks), with severity, owning team, and mitigation guidance recorded against the row.
- **Given** any third-party tool consuming Fabric data (e.g., a marketing dashboard, an internal reporting tool, an external observability vendor), **When** the program lead documents it, **Then** a coordination action is added to the readiness report identifying the team that owns the tool and the migration step required to point it at Firebase data (e.g., BigQuery export, Firebase REST API).
- **Given** Android apps using NDK native code, **When** the developer reviews them, **Then** they are flagged for special handling in `EPIC-MIG-06` (symbol and mapping upload cutover) so that the NDK native symbol upload pipeline is rebuilt against the new Firebase Crashlytics Gradle plugin.

#### Notes

- DexGuard is a known risk per the migration theme README (`R-MIG-02`). Other non-standard obfuscators or hand-rolled `proguard-rules.pro` configurations should be catalogued with the same severity because they affect symbolicated stack traces post-migration.
- Crashlytics ANR collection requires Android 11+ via the platform's `getHistoricalProcessExitReasons` API; apps with significant pre-Android-11 user base have reduced ANR visibility post-migration — record this as a known limitation rather than a blocking risk.

---

### STORY-MIG-01-S04: Produce the readiness report gating Phase 2 epics

**As a** migration program lead, **I want** a published, stakeholder-signed-off readiness report that summarizes inventory and risks per app, **so that** stakeholders can authorize Phase 2 platform SDK swap epics to begin with full knowledge of scope and risk.

#### Acceptance Criteria

- **Given** the inventory document from `STORY-MIG-01-S01` and the risk register entries from `STORY-MIG-01-S03`, **When** the program lead drafts the readiness report, **Then** the report contains one row per client app with columns for platform, Fabric integration depth, AndroidX status (for Android apps), applicable risk register entries, and a "Ready For Migration" boolean.
- **Given** the readiness report draft, **When** stakeholders from release management, engineering, and security review it, **Then** explicit sign-off from each of the three stakeholder groups is recorded in the report's sign-off table.
- **Given** any app marked "Not Ready" (e.g., due to an AndroidX prerequisite gap), **When** the program lead reviews the readiness report, **Then** the app is deferred from Phase 2 with a clear re-entry path documented (e.g., `Re-evaluate once AndroidX migration completes; re-run STORY-MIG-01-S02 verification`).
- **Given** the readiness report is signed off, **When** the program lead publishes it, **Then** the report is linked from the migration theme README and `EPIC-MIG-03`, `EPIC-MIG-04`, and `EPIC-MIG-05` reference it as their input.

#### Notes

- The readiness report is a real deliverable that GATES Phase 2 — without it, the migration program risks beginning platform SDK swaps with unknown scope or unknown risks, and there is no audit trail for the go/no-go decision.
- The report should be a markdown document committed to the migration program documentation, not just an email thread or a chat message, so that it forms part of the permanent audit trail.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4). They satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically to the pipeline theme for catalog uniformity.

- **Given** every client app in the migration program's scope, **When** the program lead inspects the inventory document, **Then** the app has a complete entry showing platform, Fabric integration depth, and applicable risks — no app is missing and no entry is incomplete.
- **Given** every Android app in scope, **When** the developer inspects its inventory entry, **Then** its AndroidX migration status is recorded explicitly as `Ready`, `Deferred`, or `In Progress`, and any `Deferred` entry includes an `R-MIG-01` link and a documented re-entry path.
- **Given** every risk identified during the inventory phase, **When** the program lead audits the migration theme README's Risk Register Summary table, **Then** the risk is mapped to a row with severity, owning team, and mitigation guidance populated.
- **Given** the readiness report, **When** the program lead audits the sign-off table, **Then** explicit sign-off is recorded and dated from release management, engineering, and security stakeholders.
- **Given** all 4 embedded stories' acceptance criteria are satisfied, **When** the program lead audits the epic against this acceptance-criteria checklist, **Then** Phase 2 platform SDK swap epics (`EPIC-MIG-03`, `EPIC-MIG-04`, `EPIC-MIG-05`) are authorized to begin.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 4 embedded stories' acceptance criteria are satisfied.
- All 5 epic-level acceptance criteria are satisfied.
- The inventory document is complete and linked from the migration theme README, with one row per client app and every required column populated.
- AndroidX migration status is verified and recorded for every Android app in scope; any deferred app carries an `R-MIG-01` tag and a documented re-entry path.
- Risk register entries are mapped to the migration theme README's Risk Register Summary table with severity, owning team, and mitigation guidance for each entry.
- The readiness report is signed off by release management, engineering, and security stakeholders, with the sign-off table populated and dated.
- Any apps deferred from Phase 2 have a documented re-entry path and an open tracking item against the team that owns the deferral.
- Downstream successor epics (`EPIC-MIG-03`, `EPIC-MIG-04`, `EPIC-MIG-05`, `EPIC-MIG-06`) reference this epic's readiness report as their input scope.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `none` | This epic is one of two Phase 1 (Foundation) epics with no internal predecessors. `EPIC-MIG-02` is a parallel Phase 1 epic, not a predecessor. |
| `Parallel` | `EPIC-MIG-02` | Firebase project provisioning runs in parallel with inventory and readiness; the two have no inter-dependency, but BOTH must complete before any Phase 2 platform SDK swap begins. |
| `Successor` | `EPIC-MIG-03` | Android SDK migration requires the per-app inventory, AndroidX verification, and Android risk classification (DexGuard, NDK) from this epic. |
| `Successor` | `EPIC-MIG-04` | iOS SDK migration requires the per-app inventory and iOS-specific risk classification (Bitcode, custom dSYM-upload pipelines) from this epic. |
| `Successor` | `EPIC-MIG-05` | Cross-platform SDK migration requires the inventory of cross-platform framework usage (Flutter, Unity, React Native) from this epic. |
| `Successor` | `EPIC-MIG-06` | Symbol and mapping upload cutover requires the NDK and custom-obfuscation risk classification recorded in this epic's risk register. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance.

- [Migrating from Fabric to Firebase Crashlytics — Medium](https://medium.com/@hmertel/migrating-from-fabric-to-firebase-crashlytics) — AndroidX prerequisite and Android Gradle/Maven cleanup specifics referenced by `EPIC-MIG-03`.
- [Firebase Crashlytics iOS Migration Guide](https://github.com/FirebaseExtended/crashlytics-migration-ios) — iOS migration scope (Xcode Build Phases, CocoaPods, AppDelegate init) and the Firebase project ≈ Fabric organization analogy.
- [Firebase Crashlytics Troubleshooting](https://firebase.google.com/docs/crashlytics/troubleshooting) — ANR collection support for Android 11+ via `getHistoricalProcessExitReasons`, relevant to inventory entries with pre-Android-11 user base.
- [It's time to upgrade to the new Firebase Crashlytics SDK — Firebase Blog](https://firebase.blog/posts/2020/10/its-time-to-upgrade-to-new-firebase-crashlytics) — November 15 sunset of the legacy Fabric SDK and migration motivators (post-app-close upload, ~30% more Android crashes captured, Gradle plugin reduced from 20+ MB to 100 KB).
- [Get started with Firebase Crashlytics for Android](https://firebase.google.com/docs/crashlytics/get-started?platform=android) — Firebase Android BoM and Google Analytics for Firebase dependency for breadcrumb logs.
