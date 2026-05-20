# EPIC-MIG-10: Fabric SDK Decommission

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-MIG-10` |
| Theme | `Migration` |
| Phase | `Phase 6 — Decommission` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-MIG-09 (predecessor); none (successor)` |
| Last Updated | `n/a` |

## Description

This epic is the TERMINAL epic of the Fabric → Firebase Crashlytics migration program and is reached only after `EPIC-MIG-09` (test-crash validation and cutover) has completed and produced the auditable cutover sign-off artifact authorizing decommission to begin. The work covers the final, irreversible removal of every remaining `fabric.io` reference from the client codebases — Android Maven repository declarations, Fabric Gradle plugin classpaths in root-level `build.gradle`, iOS CocoaPods `pod 'Fabric'` and `pod 'Crashlytics'` entries, the Fabric Run Script Build Phase in every Xcode project file, the Fabric API key dictionary in every `Info.plist`, and any `io.fabric.sdk.*` or `com.crashlytics.*` import statements in source code — along with the retirement of all legacy CI upload jobs (dSYM uploaders, ProGuard mapping uploaders) and any third-party integrations (Jira, Slack, observability tooling) that previously consumed Fabric crash data. The Fabric organization itself is archived via the legacy Fabric web console as the final record-keeping milestone of the migration program, and the decommission is communicated to internal stakeholders — engineering, release management, support, security, and leadership — so that no team is surprised by post-sunset behavior and so that audit reviewers have an explicit, dated record of the program's terminal state. After this epic completes, crash collection is sourced EXCLUSIVELY from Firebase Crashlytics with no fall-back path to Fabric, and the migration program is closed; ongoing steady-state operation of the crash-reporting pipeline is then owned by the pipeline theme (`../pipeline/`) rather than by the migration theme.

## Business Value

Decommissioning eliminates the ongoing maintenance burden of carrying two crash reporters in parallel — once `EPIC-MIG-09` has validated that Firebase Crashlytics captures crashes at parity (or better, per the canonical guidance that the new SDK is estimated to capture about 30% more Android crashes than the legacy Fabric SDK), every additional day the Fabric SDK remains in the codebase produces no benefit and incremental risk. Stale references — a forgotten `fabric.io` Maven repository, an orphaned Fabric Gradle plugin classpath, a leftover Fabric Run Script Build Phase, a residual Fabric API key in `Info.plist` — can produce build warnings, runtime conflicts with the active Firebase Crashlytics SDK, slow CI cycles wasted on a sunset endpoint, or spurious "upload failed" alerts that pollute on-call channels, and this epic's grep-disciplined cleanup removes that entire class of issues at once. It frees CI minutes and storage previously consumed by legacy dSYM and ProGuard mapping upload jobs, simplifies onboarding for new engineers (who otherwise have to learn which crash-reporting code paths are live and which are vestigial), and produces a clean, audit-friendly codebase where every crash-reporting reference points to Firebase Crashlytics. The Fabric organization archival is a concrete record-keeping milestone that supports security and compliance audits, and the published internal decommission communication closes the migration program with an explicit, dated handoff so that release management, on-call rotations, and audit reviewers all share the same authoritative end-state. Roles that benefit include mobile developers (a codebase free of stale crash-reporting references), release managers (no CI cycles wasted on a sunset endpoint and no spurious alerts), on-call engineers (a single, well-understood crash-collection pipeline), the migration program lead (an auditable program closure), and security and audit reviewers (an explicit archival record of the legacy organization).

## In Scope

The following items are included in this epic:

- Removal of all `fabric.io` Maven repository declarations from every Android `build.gradle` file (both the root-level `build.gradle` and every module-level `build.gradle`), so that the only declared crash-reporting repositories are `mavenCentral()` and `google()`.
- Removal of all Fabric Gradle plugin classpath declarations (`io.fabric:io.fabric.gradle.plugin`) from the `buildscript.dependencies` block of every root-level Android `build.gradle`, alongside removal of the `apply plugin: 'io.fabric'` line from every module-level `build.gradle`.
- Removal of every `pod 'Fabric'` and `pod 'Crashlytics'` line from every iOS `Podfile`, followed by `pod install` (or `pod deintegrate` where appropriate) so the resulting `Podfile.lock` reflects the new dependency closure and no Fabric framework remains in the `Pods/` directory.
- Removal of the legacy Fabric Run Script Build Phase from every Xcode project file (`*.xcodeproj/project.pbxproj`), performed by opening the project in Xcode and deleting the `Crashlytics` Run Script entry from the target's Build Phases (rather than hand-editing the `pbxproj` to avoid corrupting the project format).
- Removal of the Fabric API key dictionary entry from every `Info.plist` file in every iOS target, including any associated `Fabric.with([Crashlytics.self])` initialization line in the AppDelegate (Swift) or `[Fabric with:@[[Crashlytics class]]]` line in `application:didFinishLaunchingWithOptions:` (Objective-C).
- Removal of any `io.fabric.sdk.*`, `com.crashlytics.*`, or `Crashlytics.getInstance()` references from Java and Kotlin source code in Android client apps, and removal of any `import Crashlytics` or `import Fabric` statements from Swift and Objective-C source code in iOS client apps.
- Retirement of all CI upload jobs that targeted the Fabric upload endpoint (legacy `crashlytics.com/api` or `fabric.io` endpoints), including any `crashlytics-build-tool` invocations, `fabric upload` shell steps, and any `fastlane` lanes whose only purpose was Fabric symbol or mapping upload.
- Retirement of any third-party integrations that consumed Fabric crash data — for example, Jira automation that filed tickets from Fabric issues, Slack webhooks that posted Fabric alerts, or observability tooling rules that consumed Fabric metrics — by either re-pointing them to Firebase Crashlytics (per `EPIC-PA-08` alerting integrations) or retiring them outright.
- Archival of the Fabric organization via the Fabric web console: removing all active app associations, then explicitly setting the organization to `Archived` status as the final record-keeping milestone of the migration program.
- Publication of an internal decommission communication to engineering, release management, support, security, and leadership stakeholders, confirming that crash collection is now sourced EXCLUSIVELY from Firebase Crashlytics and recording the Fabric organization archival as the program's terminal artifact.
- Introduction of a CI lint check that fails any pull request reintroducing the literal string `fabric.io` (or the package prefixes `io.fabric.sdk` and `com.crashlytics`) so future commits cannot silently revive the legacy SDK references.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or predecessor epic:

- Adding new Firebase Crashlytics references to client codebases — owned by `EPIC-MIG-03` (Android), `EPIC-MIG-04` (iOS), and `EPIC-MIG-05` (Flutter, Unity, React Native). This epic only REMOVES Fabric; the Firebase Crashlytics integration is already in place when this epic commences.
- Forced test-crash validation, dual-running parity comparison, and the production of the cutover sign-off artifact that gates this epic's start — owned by `EPIC-MIG-09` (test-crash validation and cutover). This epic CONSUMES the sign-off artifact as its explicit entry criterion but does not produce it.
- Historical Crashlytics data export, pre- and post-cutover issue count reconciliation, and the "Known Gaps" register — owned by `EPIC-MIG-08` (historical data migration). Historical data has already been preserved in Firebase by the time this epic runs, so the Fabric organization archival here does not lose any audit-relevant crash history.
- Symbol and mapping upload pipeline cutover (Android ProGuard/R8 mapping uploads, iOS dSYM uploads, NDK native symbol uploads) — owned by `EPIC-MIG-06`. This epic retires the LEGACY upload jobs targeting Fabric; the active upload jobs targeting Firebase Crashlytics were already in place by the time `EPIC-MIG-09` validated cutover.
- Analytics event translation from Fabric Answers to Google Analytics for Firebase — owned by `EPIC-MIG-07`. This epic does not touch analytics code; it only removes the Fabric crash-reporting SDK.
- Long-running steady-state operation of the Firebase Crashlytics pipeline, including ongoing ingestion, grouping, dashboard delivery, alerting, BigQuery export, privacy controls, and pipeline SLOs — owned by the pipeline theme (`../pipeline/`). Once this epic closes the migration program, all ongoing crash-reporting responsibilities transfer to the pipeline theme.

## User Stories

This epic contains 3 user stories. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings (Rule AR-1). Stories live INSIDE their parent epic file to keep each epic self-contained and eliminate broken cross-file links during refactors. The 3-story scope is intentionally compact because this epic is largely cleanup work — code removal, CI retirement, and organizational archival/communication — rather than the introduction of new functionality; the three stories partition the work along its three natural seams (codebase, CI/integration surface, organizational record-keeping) so that each story can be independently executed and verified.

### STORY-MIG-10-S01: Remove all fabric.io references from build configurations

**As a** mobile developer, **I want** every `fabric.io` reference removed from build scripts and project files, **so that** the codebase contains no stale links to the sunset Fabric service and no build warnings, runtime conflicts, or accidental fall-back paths to the legacy SDK remain.

#### Acceptance Criteria

- **Given** the Android codebase for every in-scope client app, **When** a developer runs `grep -ril fabric.io` across the repository root (including every root-level and module-level `build.gradle`, `settings.gradle`, and any included Gradle build scripts), **Then** zero matches are returned.
- **Given** every Android root-level `build.gradle`, **When** a developer inspects the `buildscript.dependencies` block, **Then** no `io.fabric:io.fabric.gradle.plugin` classpath entry is present and no `apply plugin: 'io.fabric'` line exists in any module-level `build.gradle`.
- **Given** the iOS codebase for every in-scope client app, **When** a developer inspects every `Podfile`, **Then** no `pod 'Fabric'` or `pod 'Crashlytics'` entries are present, and the resulting `Podfile.lock` (regenerated by a fresh `pod install`) contains no Fabric or legacy Crashlytics pod entries.
- **Given** every iOS Xcode project file, **When** a developer opens the target's Build Phases pane in Xcode, **Then** the legacy `Crashlytics` Run Script Build Phase is absent and no orphaned Fabric script references remain in the `*.xcodeproj/project.pbxproj` file.
- **Given** every iOS target's `Info.plist`, **When** a developer searches for the `Fabric` API key dictionary entry, **Then** the entry is removed and no associated `Fabric.with(...)` initialization remains in the AppDelegate.

#### Notes

- The `grep -ril fabric.io` discipline must be encoded in CI as a lint check that fails any pull request reintroducing the literal string `fabric.io` (or the package prefixes `io.fabric.sdk` and `com.crashlytics`), so future commits cannot silently revive Fabric references after this story is complete. The lint check is itself a deliverable of the In Scope section above.
- Some projects may have Fabric references inside committed `*.xcodeproj/project.pbxproj` files (Xcode's project format is a serialized property list); these references must be removed by opening the project in Xcode and editing through the Build Phases UI rather than by hand-editing the `pbxproj`, which can silently corrupt the project format and break the Xcode build in non-obvious ways.

---

### STORY-MIG-10-S02: Retire legacy CI upload jobs and Fabric integrations

**As a** release manager, **I want** all CI upload jobs that targeted the Fabric service to be retired and every third-party integration that consumed Fabric crash data to be re-pointed or retired, **so that** no CI cycles or storage are wasted on a sunset endpoint and no spurious "upload failed" alerts pollute on-call channels after this epic closes.

#### Acceptance Criteria

- **Given** the CI configuration repository (whether GitHub Actions workflows, GitLab CI YAML, Jenkins pipelines, CircleCI configs, or any other CI surface), **When** a release manager searches for jobs referencing `crashlytics.com/api`, `fabric.io`, the legacy `crashlytics-build-tool` invocation, or `fabric upload` shell steps, **Then** zero active jobs are found and any historical references survive only in archived commit history.
- **Given** the CI pipeline history for the most recent successful release build of every in-scope client app, **When** a release manager reviews the build log, **Then** the log contains no calls to the legacy Fabric upload tool, no Fabric authentication errors, and no warnings about deprecated Fabric endpoints.
- **Given** the dSYM-upload step in the iOS release pipeline and the ProGuard/R8 mapping-upload step in the Android release pipeline, **When** the pipeline runs after this story is complete, **Then** symbol and mapping artifacts are uploaded ONLY to Firebase Crashlytics (via the new 100 KB Firebase Crashlytics Gradle plugin or the bundled Firebase `upload-symbols` script, per `EPIC-MIG-06`) and not to Fabric.
- **Given** any third-party integrations that previously consumed Fabric crash data (for example, Jira automation that filed tickets from Fabric issues, Slack webhooks that posted Fabric alerts, observability tooling rules that consumed Fabric metrics, or BigQuery jobs that ingested Fabric exports), **When** the integrations are inspected, **Then** each is either re-pointed to the equivalent Firebase Crashlytics surface (typically the integrations described in `EPIC-PA-08` alerting and the BigQuery export described in `EPIC-PA-06`) or explicitly retired with the retirement recorded in the migration program documentation.

#### Notes

- Coordinate with the team that owns observability tooling — orphaned alert rules referencing Fabric metrics should be retired in the same change set rather than left to fire false-negative or false-positive alerts after the underlying Fabric data source has been decommissioned, which would otherwise produce alert fatigue and erode on-call trust in the new pipeline.

---

### STORY-MIG-10-S03: Archive Fabric organization and communicate sunset to stakeholders

**As a** migration program lead, **I want** the Fabric organization archived in the legacy Fabric web console and the decommission communicated to internal stakeholders, **so that** there is a clear, auditable terminal state for the migration program and no team is surprised by post-sunset behavior or by the disappearance of the legacy crash-reporting surface.

#### Acceptance Criteria

- **Given** the Fabric web console for the legacy Fabric organization, **When** the migration program lead opens the organization settings, **Then** no active app associations remain (every previously linked app has been unlinked as part of the codebase cleanup in `STORY-MIG-10-S01`) and the organization's status is explicitly marked `Archived` as the program's terminal record-keeping milestone.
- **Given** the migration program's internal stakeholder communication channels (typically: an engineering all-hands announcement, a release-management distribution list, a security and compliance review channel, and an executive program-status email), **When** the program lead publishes the decommission notice, **Then** the notice references the November 15 legacy-SDK sunset as deadline CONTEXT, confirms that crash collection is now sourced EXCLUSIVELY from Firebase Crashlytics, links to this epic and to `EPIC-MIG-09`'s cutover sign-off artifact as evidence, and explicitly states that any pre-sunset historical data has been preserved per `EPIC-MIG-08`.
- **Given** the migration program documentation, **When** an auditor reviews the program's terminal state, **Then** a `Decommission Complete` artifact is present in the migration program documentation linking to this epic, recording the Fabric organization archival timestamp, and itemizing each stakeholder channel that received the decommission communication along with at least one acknowledgement signal per channel (a reply, a meeting notes entry, or a chat acknowledgement).
- **Given** any teams that previously consumed Fabric APIs or Fabric exports for downstream purposes (for example, internal reporting tools, custom dashboards, security audit tooling, or product analytics joins), **When** they are surveyed as part of the decommission communication, **Then** each team confirms migration to the equivalent Firebase Crashlytics data sources (typically the Firebase Console for ad-hoc analysis or the BigQuery export described in `../pipeline/EPIC-PA-06` for programmatic analysis) and the migration program documentation records each confirmation.

#### Notes

- The November 15 legacy-SDK sunset is referenced as deadline CONTEXT only (Rule AR-6 — no time-based planning in epic content). This story does not prescribe WHEN the Fabric organization archival happens; it prescribes only that the archival MUST happen before the migration program is declared complete and that the decommission communication MUST reference the sunset date as the immovable context that motivated the program.
- The stakeholder communication should explicitly mention that any pre-sunset historical data has been preserved in Firebase Crashlytics per `EPIC-MIG-08`, so stakeholders do not interpret the Fabric organization archival as a data-loss event and so audit reviewers can verify that the program closed without losing pre-cutover crash history.

## Acceptance Criteria (Epic-Level)

Per Rule AR-4, the following Given-When-Then criteria summarize exit conditions across all stories in this epic. They satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically with the pipeline theme for catalog uniformity. Per the AAP, this epic carries 5 epic-level acceptance criteria so that the terminal state of the migration program is unambiguously specified.

- **Given** the entire mono-repo or org-wide collection of client app repositories, **When** a `grep -ril fabric.io` is run across every client app's repository root (including all Gradle scripts, Podfiles, source files, Xcode project files, and CI configuration files), **Then** zero matches are returned and a CI lint check is in place that fails any future pull request reintroducing the literal string.
- **Given** the root-level `build.gradle` of every Android client app, **When** a developer inspects the `buildscript.dependencies` block, **Then** no `io.fabric:io.fabric.gradle.plugin` classpath entry is present, no `apply plugin: 'io.fabric'` line exists in any module-level `build.gradle`, and the declared repositories in the `repositories` block are limited to `mavenCentral()` and `google()` (or equivalent first-party sources) with no `fabric.io` Maven repository declaration remaining.
- **Given** every iOS `Podfile`, `Podfile.lock`, and Xcode project file, **When** a developer opens them, **Then** no Fabric pods are declared or locked, no Fabric Run Script Build Phase exists in any target's Build Phases, no Fabric API key dictionary remains in any `Info.plist`, and no `Fabric.with(...)` initialization line remains in any AppDelegate.
- **Given** the CI configuration repository, **When** a release manager audits active build jobs, **Then** no job invokes the Fabric upload endpoint, no job references `crashlytics.com/api` or `fabric.io`, and the symbol and mapping upload steps target ONLY Firebase Crashlytics (per `EPIC-MIG-06`).
- **Given** the Fabric organization in the legacy Fabric web console and the migration program documentation, **When** the program lead inspects the organization and the documentation, **Then** the organization is marked `Archived`, no active app associations remain, the `Decommission Complete` artifact is published with stakeholder acknowledgement signals captured, and the decommission communication has been distributed to engineering, release management, support, security, and leadership channels.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 3 embedded stories (`STORY-MIG-10-S01`, `STORY-MIG-10-S02`, `STORY-MIG-10-S03`) have their acceptance criteria satisfied for every in-scope app and platform.
- All 5 epic-level acceptance criteria above are satisfied.
- A repository-wide `grep -ril fabric.io` across every in-scope client app's repository returns zero matches, and a parallel `grep -ril "io.fabric.sdk\|com.crashlytics"` also returns zero matches against active (non-archived) source paths.
- The CI lint check for `fabric.io`, `io.fabric.sdk`, and `com.crashlytics` references is enabled in the CI configuration and has been observed to pass on at least one merged pull request after enablement, demonstrating that the guardrail is active and not merely declared.
- The Fabric organization is marked `Archived` in the legacy Fabric web console, with no active app associations remaining and with the archival timestamp recorded in the migration program documentation.
- The internal decommission communication has been published to engineering, release management, support, security, and leadership stakeholders, and at least one acknowledgement signal has been captured per channel in the `Decommission Complete` artifact.
- No crash-reporting network traffic targets Fabric endpoints (`crashlytics.com`, `fabric.io`) for at least 7 consecutive days post-decommission, verified via network monitoring on at least one representative production build of each client platform (Android, iOS) or via the Fabric console traffic dashboards if still accessible.
- The `EPIC-MIG-09` cutover sign-off artifact is referenced from this epic's documentation as the entry criterion that authorized decommission to begin, providing an unbroken audit trail from validation through decommission.
- The migration theme `README.md` (and the master `docs/epics/README.md`) reflect the migration program's terminal state by linking to the `Decommission Complete` artifact in their Program Exit Criteria sections (or equivalent).

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-MIG-09` | Test-crash validation and the dual-running validation window must complete successfully and produce the cutover sign-off artifact (with named signatures from release management, engineering, and security) before decommission can safely begin. Decommissioning prematurely would lose the ability to fall back to Fabric if a regression were detected, and the cutover sign-off artifact is the explicit, auditable authorization that releases this epic to commence. |
| `Successor` | `none` | This is the TERMINAL epic of the migration program. After this epic completes, the migration theme is closed and ongoing steady-state operation of the Firebase Crashlytics pipeline is owned by the pipeline theme (`../pipeline/`); there is no successor migration epic to enable. |

## References

Per Rule AR-5 (Source Grounding), the following references ground this epic's content in public Firebase or Crashlytics guidance. Inferred content not directly traceable to a public source has been flagged inline where applicable.

- [It's time to upgrade to the new Firebase Crashlytics SDK — Firebase Blog](https://firebase.blog/posts/2020/10/its-time-to-upgrade-to-new-firebase-crashlytics) — Establishes November 15 as the last day to upgrade before the legacy SDK is shut down and documents that apps still using the legacy SDK after that date will no longer report crashes; grounds the sunset-deadline CONTEXT referenced in `STORY-MIG-10-S03` and the rationale for archiving the Fabric organization as the program's terminal record-keeping milestone.
- [Firebase Crashlytics iOS Migration Guide (crashlytics-migration-ios)](https://github.com/FirebaseExtended/crashlytics-migration-ios) — Documents the Xcode Build Phases cleanup (removal of the legacy `Crashlytics` Run Script Build Phase from every target), the removal of `pod 'Fabric'` and `pod 'Crashlytics'` from the `Podfile`, the removal of the Fabric API key dictionary from `Info.plist`, and the analogy that a Firebase project corresponds to a Fabric organization; grounds the iOS-specific scope items in `STORY-MIG-10-S01` and the organizational archival in `STORY-MIG-10-S03`.
- [Migrating from Fabric to Firebase Crashlytics (community guide)](https://medium.com/@hmertel/migrating-from-fabric-to-firebase-crashlytics) — Documents the Android-specific cleanup: removal of the Fabric Maven repository declaration from the root-level `build.gradle`, removal of the Fabric Gradle plugin classpath (`io.fabric:io.fabric.gradle.plugin`) from `buildscript.dependencies`, removal of the `apply plugin: 'io.fabric'` line from module-level `build.gradle`, and the AndroidX prerequisite that frames the broader Android migration; grounds the Android-specific scope items in `STORY-MIG-10-S01`.
- [Firebase Crashlytics Documentation Home](https://firebase.google.com/docs/crashlytics) — Canonical product documentation for Firebase Crashlytics, including the description of the product as a lightweight, realtime crash reporter for Apple, Android, Flutter, and Unity; grounds the framing that crash collection is sourced EXCLUSIVELY from Firebase Crashlytics post-decommission and that no fall-back to Fabric remains.
