# EPIC-MIG-03: Android SDK Migration

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-MIG-03` |
| Theme | `Migration` |
| Phase | `Phase 2 — Platform SDK Swaps` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-MIG-01, EPIC-MIG-02 (predecessors); EPIC-MIG-06, EPIC-MIG-09, EPIC-MIG-10 (successors)` |
| Last Updated | `n/a` |

## Description

This epic migrates every in-scope Android client app from the legacy Fabric Crashlytics SDK to the new Firebase Crashlytics SDK by mechanically swapping the build-system surface: the `fabric.io` Maven repository and the `io.fabric` Gradle plugin are removed from the root-level `build.gradle`, and the Firebase Crashlytics Gradle plugin (`com.google.firebase.crashlytics`) and Google Services plugin (`com.google.gms.google-services`) are added in their place. In the module-level `build.gradle`, the Firebase Android BoM (`com.google.firebase:firebase-bom`) is adopted as the canonical version-management mechanism, the Crashlytics library (`com.google.firebase:firebase-crashlytics`) is declared without an explicit version so the BoM owns resolution, and the Firebase SDK for Google Analytics (`com.google.firebase:firebase-analytics`) is optionally added on the same BoM to enable breadcrumb logs (which also requires the project-side Google Analytics enablement provisioned by `EPIC-MIG-02`). Legacy `Fabric.with(this, new Crashlytics())` initialization and its imports (`io.fabric.sdk.android.Fabric`, `com.crashlytics.android.Crashlytics`) are removed from `Application` subclasses and `Activity.onCreate` callsites; the `google-services` plugin's manifest-merged `ContentProvider` (`FirebaseInitProvider`) takes over initialization automatically. AndroidX migration is a HARD prerequisite — the Firebase Crashlytics SDK uses AndroidX as a dependency, so apps not yet on AndroidX are flagged with risk `R-MIG-01` by `EPIC-MIG-01` and deferred from this epic until their AndroidX work completes. This epic sits in Phase 2 (Platform SDK Swaps) alongside `EPIC-MIG-04` (iOS) and `EPIC-MIG-05` (cross-platform); Phase 1 (`EPIC-MIG-01` inventory and `EPIC-MIG-02` Firebase project provisioning) must complete first because the readiness report scopes which Android apps participate and the Firebase project produces the `google-services.json` configuration files this epic consumes.

## Business Value

The new Firebase Crashlytics Android SDK is the strategic forward path: per the canonical Firebase Blog, it is estimated to capture about 30% more Android crashes than the legacy Fabric SDK and can upload crashes after the app has closed, providing more real-time crash data than the legacy "upload on next launch" model. The Firebase Android BoM consolidates SDK version management across the entire Firebase product surface (Crashlytics, Analytics, Performance, Remote Config, Authentication, and others), reducing version conflict risk and eliminating per-SDK version churn. Breadcrumb logs sourced from Google Analytics give on-call engineers rich user-journey context preceding each crash, accelerating root-cause diagnosis compared with stack traces alone. The new Firebase Crashlytics Gradle plugin is approximately 100 KB versus the legacy 20+ MB Fabric plugin, materially reducing CI download overhead. Roles that benefit include mobile developers (cleaner build, BoM-managed versions, smaller plugin footprint), on-call engineers (richer breadcrumb context in issue cards), release managers (continuity of crash signal across the legacy-SDK sunset), and the migration program lead (a concrete, auditable per-app SDK swap that closes out Android scope in a single epic).

## In Scope

The following items are included in this epic:

- Verification that every Android app in scope has migrated to AndroidX — confirmed by the presence of `android.useAndroidX=true` in `gradle.properties` and the absence of `android.support.*` imports in source — because the Firebase Crashlytics SDK uses AndroidX as a hard dependency.
- Removal of the `fabric.io` Maven repository from `buildscript.repositories` and `allprojects.repositories` blocks in the root-level `build.gradle` (matching the pattern `maven { url 'https://maven.fabric.io/public' }`).
- Removal of the Fabric Gradle plugin classpath (`classpath 'io.fabric.tools:gradle:<version>'`) from the `buildscript.dependencies` block in the root-level `build.gradle`.
- Removal of `apply plugin: 'io.fabric'` (or the equivalent Plugin DSL entry) from the module-level `build.gradle`.
- Addition of the Firebase Crashlytics Gradle plugin classpath (`classpath 'com.google.firebase:firebase-crashlytics-gradle:<latest>'`) to the root-level `build.gradle` `buildscript.dependencies` block.
- Addition of the Google Services plugin classpath (`classpath 'com.google.gms:google-services:<latest>'`) to the root-level `build.gradle` if not already present, because `google-services.json` parsing depends on it.
- Addition of `apply plugin: 'com.google.firebase.crashlytics'` and `apply plugin: 'com.google.gms.google-services'` (or the equivalent Plugin DSL entries) to the module-level `build.gradle`.
- Addition of the Firebase Android BoM as a `platform()` dependency in the module-level `build.gradle` (`implementation platform('com.google.firebase:firebase-bom:<latest>')`) so all Firebase library versions are sourced consistently from a single coordinated release.
- Addition of the Crashlytics library dependency (`implementation 'com.google.firebase:firebase-crashlytics'`) without an explicit version — the BoM owns version resolution.
- Optional addition of the Firebase SDK for Google Analytics (`implementation 'com.google.firebase:firebase-analytics'`) on the same BoM to enable Crashlytics breadcrumb logs — this requires Google Analytics to be enabled in the owning Firebase project, which is established by `EPIC-MIG-02`.
- Removal of legacy Fabric initialization code (e.g., `Fabric.with(this, new Crashlytics())`) and its imports (`io.fabric.sdk.android.Fabric`, `com.crashlytics.android.Crashlytics`) from `Application` subclasses and `Activity.onCreate` callsites.
- Placement of the `google-services.json` configuration file (downloaded from the Firebase Console per `EPIC-MIG-02`) into the `app/` directory of every Android module, with per-variant files where the project supports multiple bundle identifiers.
- A clean release build (`./gradlew clean assembleRelease`) succeeds end-to-end on every Android app in scope after the changes above are committed.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- The AndroidX migration ITSELF for apps not yet on AndroidX — only verification of AndroidX status is in scope; the AndroidX migration work is owned by the app's mobile team and surfaced as risk `R-MIG-01` by `EPIC-MIG-01`, which defers a non-AndroidX app from this epic until its AndroidX work completes.
- iOS SDK migration (Xcode Build Phases cleanup, CocoaPods/SPM swap, `AppDelegate` initialization changes) — owned by `EPIC-MIG-04`.
- Cross-platform SDK migration (FlutterFire `firebase_crashlytics`, Unity Firebase plugin, `@react-native-firebase/crashlytics`) — owned by `EPIC-MIG-05`.
- Configuration of the Firebase Crashlytics Gradle plugin's ProGuard/R8 mapping-file upload behavior (the `mappingFileUploadEnabled` switch, custom mapping-file routing, automated upload on release builds) — the plugin is INSTALLED in this epic but its upload cutover from the legacy 20+ MB Fabric plugin is owned by `EPIC-MIG-06`.
- NDK native symbol upload (the `firebaseCrashlytics { nativeSymbolUploadEnabled true }` block, `uploadCrashlyticsSymbolFile<Variant>` task wiring, ABI-specific archive generation) — owned by `EPIC-MIG-06`.
- Translation of Fabric Answers events to Google Analytics for Firebase predefined or custom events — owned by `EPIC-MIG-07`; this epic only enables the Analytics SDK so the translation has a runtime destination.
- Migration of historical Crashlytics data from the legacy Fabric service via the Firebase migration page — owned by `EPIC-MIG-08`.
- Test-crash validation (`throw new RuntimeException("Force Crash")`, cold relaunch, Firebase Console verification within five minutes) and the dual-running validation window across SDKs — owned by `EPIC-MIG-09`.
- Final removal of all remaining `fabric.io` references in non-Android contexts and the archival of the Fabric organization itself — owned by `EPIC-MIG-10`.
- Provisioning of the Firebase project, linking the Android app bundle, configuring IAM access, and enabling Google Analytics for Firebase — owned by `EPIC-MIG-02`; this epic CONSUMES the resulting `google-services.json` but does not produce it.

## User Stories

This epic contains 5 user stories. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings (Rule AR-1). Stories live INSIDE their parent epic file to keep each epic self-contained and eliminate broken cross-file links during refactors.

### STORY-MIG-03-S01: Verify AndroidX migration prerequisite

**As a** mobile developer, **I want** to verify that the Android app has migrated to AndroidX, **so that** the Firebase Crashlytics SDK (which depends on AndroidX) can be safely adopted without runtime classpath conflicts.

#### Acceptance Criteria

- **Given** the Android app's `gradle.properties` file, **When** the developer inspects it, **Then** the line `android.useAndroidX=true` is present and the line `android.enableJetifier=true` is present if the app still depends on third-party libraries that have not migrated to AndroidX.
- **Given** the app's `build.gradle` files (root-level and module-level), **When** the developer searches for support-library imports (e.g., `com.android.support:appcompat-v7`, `com.android.support:design`, `com.android.support:recyclerview-v7`), **Then** no support-library references remain in the build graph.
- **Given** the app's source code (Java and Kotlin), **When** the developer searches for `android.support.*` package references (for example, `android.support.v7.app.AppCompatActivity`), **Then** zero matches are found and every analogous symbol resolves under the `androidx.*` namespace instead.
- **Given** an Android app that has NOT migrated to AndroidX at the time `EPIC-MIG-01` inventory completes, **When** the migration program lead reviews the readiness report for this app, **Then** the app is flagged with risk `R-MIG-01` (AndroidX migration prerequisite) and explicitly deferred from this epic until the AndroidX migration completes, with the deferral and re-entry path recorded against the app's readiness entry.

#### Notes

- Android Studio's `Refactor → Migrate to AndroidX` command performs the migration automatically for most apps; custom libraries or third-party SDKs without AndroidX-compatible artifacts may require manual handling and `android.enableJetifier=true` as a transitional bridge.
- This story is a VERIFICATION step, not the AndroidX migration itself. Per canonical Firebase migration guidance, the Firebase Crashlytics SDK uses AndroidX as a hard prerequisite; if AndroidX is incomplete for an app, the app is removed from this epic's scope and tracked under risk `R-MIG-01` by `EPIC-MIG-01`'s readiness report.

---

### STORY-MIG-03-S02: Remove Fabric Maven repository and Gradle plugin classpath

**As a** mobile developer, **I want** the `fabric.io` Maven repository and the Fabric Gradle plugin classpath removed from the root-level `build.gradle` and the `io.fabric` plugin application removed from the module-level `build.gradle`, **so that** the build no longer references the sunset Fabric distribution and stops attempting to resolve the legacy Fabric plugin.

#### Acceptance Criteria

- **Given** the root-level `build.gradle`, **When** the developer inspects the `buildscript.repositories` block, **Then** the entry `maven { url 'https://maven.fabric.io/public' }` is removed.
- **Given** the root-level `build.gradle`, **When** the developer inspects the `allprojects.repositories` block (some projects declare Fabric in both locations), **Then** the Fabric Maven repository entry is removed from this block as well.
- **Given** the root-level `build.gradle`, **When** the developer inspects the `buildscript.dependencies` block, **Then** the entry `classpath 'io.fabric.tools:gradle:<version>'` is removed.
- **Given** the module-level `build.gradle`, **When** the developer searches for `apply plugin: 'io.fabric'` and for any Plugin DSL equivalent under the `plugins { ... }` block (e.g., `id 'io.fabric'`), **Then** every match is removed.
- **Given** the project after these changes, **When** the developer runs `./gradlew clean assembleRelease`, **Then** the build succeeds without any "Could not resolve" errors mentioning `io.fabric`, `fabric.io`, or `io.fabric.tools:gradle`.

#### Notes

- Some legacy projects declare the Fabric repository in `buildscript.repositories` only, others in `allprojects.repositories` only, and others in BOTH; the verification grep must cover both locations. After removal, a one-time `./gradlew --refresh-dependencies` may be required on CI workers and developer machines to evict cached Fabric artifacts.
- The repository-wide `fabric.io` cleanup across non-Android contexts (iOS, Flutter, Unity, React Native, CI scripts) is owned by `EPIC-MIG-10`; this story only addresses the Android `build.gradle` surface.

---

### STORY-MIG-03-S03: Add Firebase Crashlytics Gradle plugin classpath and apply plugins

**As a** mobile developer, **I want** the Firebase Crashlytics Gradle plugin classpath and the Google Services plugin classpath added to the root-level `build.gradle` and both plugins applied in the module-level `build.gradle`, **so that** Crashlytics build tasks (mapping upload, symbol upload) and Firebase configuration loading are wired into the build pipeline.

#### Acceptance Criteria

- **Given** the root-level `build.gradle`, **When** the developer adds `classpath 'com.google.firebase:firebase-crashlytics-gradle:<latest>'` to the `buildscript.dependencies` block, **Then** the Firebase Crashlytics Gradle plugin is available to apply in module-level `build.gradle` files.
- **Given** the root-level `build.gradle`, **When** the developer ensures `classpath 'com.google.gms:google-services:<latest>'` is also present in `buildscript.dependencies` (required for `google-services.json` parsing), **Then** Firebase configuration is wired in and the `google-services` plugin can read the configuration file at build time.
- **Given** the module-level `build.gradle`, **When** the developer adds both `apply plugin: 'com.google.firebase.crashlytics'` and `apply plugin: 'com.google.gms.google-services'` (or the equivalent Plugin DSL entries under `plugins { ... }`), **Then** the plugins activate at sync time and contribute their tasks to the variant graph.
- **Given** the project after these changes, **When** the developer runs `./gradlew tasks --all` and filters for Crashlytics, **Then** the output lists per-variant Crashlytics tasks such as `uploadCrashlyticsMappingFile<Variant>` (one task per build variant), confirming the plugin is correctly attached.

#### Notes

- The Firebase Crashlytics Gradle plugin is approximately 100 KB versus the legacy 20+ MB Fabric plugin per the canonical Firebase Blog. For projects on Gradle 6.5+ using the Plugin DSL, the equivalent syntax is `plugins { id 'com.google.firebase.crashlytics' version '<version>' }` and `plugins { id 'com.google.gms.google-services' version '<version>' }`; both forms are valid and this catalog does not prescribe one over the other (Rule AR-6).
- The Crashlytics mapping-upload tasks are PRESENT after this story completes, but their END-TO-END cutover from the legacy Fabric upload pipeline is owned by `EPIC-MIG-06`.

---

### STORY-MIG-03-S04: Add Firebase Android BoM and Crashlytics library dependency

**As a** mobile developer, **I want** the Firebase Android BoM and the Crashlytics library dependency added to the module-level `build.gradle`, **so that** Firebase SDK versions are consistently managed from a single coordinated release across every Firebase product and the Crashlytics SDK is available to the application at runtime.

#### Acceptance Criteria

- **Given** the module-level `build.gradle`, **When** the developer adds `implementation platform('com.google.firebase:firebase-bom:<latest>')` to the `dependencies` block, **Then** Firebase SDK versions are sourced from the BoM and no Firebase library declares an explicit version inside the same `dependencies` block.
- **Given** the same `dependencies` block, **When** the developer adds `implementation 'com.google.firebase:firebase-crashlytics'` WITHOUT an explicit version (so the BoM provides it), **Then** the Crashlytics library resolves correctly at sync time and a `./gradlew :app:dependencies` query lists `com.google.firebase:firebase-crashlytics:<resolved-version>` matching the BoM-coordinated release.
- **Given** the optional breadcrumb log integration is desired and Google Analytics is enabled in the owning Firebase project (per `EPIC-MIG-02`), **When** the developer adds `implementation 'com.google.firebase:firebase-analytics'` on the same BoM, **Then** the Analytics SDK is available at runtime and breadcrumb logs populate in subsequent Crashlytics issue cards.
- **Given** the project after these changes, **When** the developer runs `./gradlew assembleRelease`, **Then** the build succeeds, the resulting APK or AAB includes the Crashlytics SDK classes (verifiable via `unzip -l app-release.apk | grep firebase-crashlytics`), and no version conflict warnings are emitted for Firebase libraries.

#### Notes

- Per canonical Firebase guidance, the Firebase Android BoM is the RECOMMENDED dependency management approach because it coordinates every Firebase SDK version against a single tested release, eliminating per-SDK version drift across `firebase-crashlytics`, `firebase-analytics`, `firebase-perf`, and any other Firebase products. For apps that already declare other Firebase products with explicit versions, those explicit versions should be removed when the BoM is introduced; mixing BoM-managed and explicitly-versioned Firebase libraries can produce silent version drift.
- To take advantage of breadcrumb logs, BOTH the project-side enablement (Google Analytics enabled in the Firebase project — owned by `EPIC-MIG-02`) AND the SDK-side dependency (`firebase-analytics` declared in the app — owned by THIS story) must be in place; enabling only one side leaves breadcrumb logs absent from issue cards.

---

### STORY-MIG-03-S05: Replace legacy initialization code and add google-services.json

**As a** mobile developer, **I want** the legacy Fabric initialization (`Fabric.with(this, new Crashlytics())`) and its imports removed from `Application` subclasses and `Activity.onCreate` callsites and `google-services.json` placed in the `app/` directory, **so that** the Android app initializes Firebase Crashlytics via the canonical Firebase pathway and no longer depends on the sunset Fabric initialization API.

#### Acceptance Criteria

- **Given** the Android app's `Application` class and every `Activity.onCreate` callsite, **When** the developer removes calls to `Fabric.with(this, new Crashlytics())` and any analogous `Crashlytics.start(...)` or `Crashlytics.getInstance()` initialization, **Then** no Fabric initialization remains in the app's startup path.
- **Given** the Android app's source code (Java and Kotlin), **When** the developer searches for `import io.fabric.sdk.android.Fabric`, `import com.crashlytics.android.Crashlytics`, and `import com.crashlytics.android.answers.Answers`, **Then** zero imports remain and the source compiles cleanly without unresolved-symbol errors.
- **Given** the Firebase Console's Android app configuration (provisioned by `EPIC-MIG-02`), **When** the developer downloads `google-services.json` and places it in the `app/` directory of every Android module (one file per module; per-variant files where the project has multiple bundle identifiers, placed under `app/src/<variant>/google-services.json`), **Then** the `google-services` plugin reads it at build time and merges Firebase configuration into the manifest and resources.
- **Given** the app's `Application.onCreate()`, **When** the app launches on a device or emulator, **Then** `FirebaseApp.initializeApp(context)` is invoked automatically by the `google-services` plugin via a manifest-merged `ContentProvider`, Crashlytics begins capturing crashes immediately, and a release build's manifest (verifiable via `aapt2 dump xmltree`) contains a `FirebaseInitProvider` entry under the application node.

#### Notes

- The `google-services` plugin auto-initializes Firebase via a manifest-merged `ContentProvider` (`com.google.firebase.provider.FirebaseInitProvider`); explicit `FirebaseApp.initializeApp(context)` calls in `Application.onCreate()` are only required for non-standard patterns such as hosting multiple Firebase apps via `FirebaseApp.initializeApp(context, options, name)`.
- Any legacy `Crashlytics.getInstance().crash()` test calls in pre-release builds can be replaced with `throw new RuntimeException("Force Crash")` (Kotlin: `throw RuntimeException("Force Crash")`) per the test-crash convention adopted by `EPIC-MIG-09`; the `google-services.json` file is not a secret but should follow the team's source-control convention.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4). They satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically to the pipeline theme for catalog uniformity.

- **Given** every Android client app's `gradle.properties` file at the time the epic is audited, **When** the developer inspects it, **Then** `android.useAndroidX=true` is present, confirming the AndroidX prerequisite is satisfied for every app this epic claims to have migrated.
- **Given** every Android client app's root-level `build.gradle`, **When** the developer searches for `fabric.io` and `io.fabric.tools:gradle` across both `buildscript.repositories`, `allprojects.repositories`, and `buildscript.dependencies` blocks, **Then** zero matches are returned and the Firebase Crashlytics Gradle plugin classpath (`com.google.firebase:firebase-crashlytics-gradle`) is present alongside the Google Services plugin classpath (`com.google.gms:google-services`).
- **Given** every Android client app's module-level `build.gradle`, **When** the developer searches for `apply plugin: 'io.fabric'` and for any Plugin DSL `id 'io.fabric'` entry, **Then** zero matches are returned and both `apply plugin: 'com.google.firebase.crashlytics'` and `apply plugin: 'com.google.gms.google-services'` (or their Plugin DSL equivalents) are present.
- **Given** every Android client app's source tree, **When** the developer searches for legacy Fabric imports (`io.fabric.sdk.android.*`, `com.crashlytics.android.*`, `com.crashlytics.android.answers.*`), **Then** zero matches are returned and every initialization callsite uses the canonical Firebase pathway (auto-initialization via the `google-services` plugin's manifest-merged `ContentProvider`, or explicit `FirebaseApp.initializeApp(context)` only where required by non-standard setups).
- **Given** every Android client app's `app/` directory (with per-variant overrides where applicable), **When** the developer inspects it, **Then** `google-services.json` is present, the file's `project_info.project_id` matches the Firebase project ID recorded in the migration program documentation by `EPIC-MIG-02`, and the file's `client[].client_info.android_client_info.package_name` matches the Android package name registered in the Firebase Console.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 5 embedded stories' acceptance criteria are satisfied.
- All 5 epic-level acceptance criteria are satisfied.
- Every Android client app in scope (as enumerated by `EPIC-MIG-01`'s readiness report, minus any apps deferred under risk `R-MIG-01` AndroidX prerequisite) has its root-level `build.gradle` referencing the Firebase Crashlytics Gradle plugin classpath and the Google Services plugin classpath.
- Every Android client app's module-level `build.gradle` applies both `com.google.firebase.crashlytics` and `com.google.gms.google-services` plugins, declares `implementation platform('com.google.firebase:firebase-bom:<latest>')`, and declares `implementation 'com.google.firebase:firebase-crashlytics'` without an explicit version.
- Every Android client app's source code is free of Fabric and legacy Crashlytics imports (`io.fabric.sdk.android.*`, `com.crashlytics.android.*`).
- Every Android client app's bundle contains `google-services.json` matching the Firebase project provisioned by `EPIC-MIG-02`, with per-variant overrides placed where the project supports multiple bundle identifiers.
- A clean Android release build succeeds via `./gradlew clean assembleRelease` on every app in scope, with no "Could not resolve" errors mentioning `io.fabric` and no version-conflict warnings for Firebase libraries.
- `./gradlew tasks --all` lists the per-variant Crashlytics upload tasks (e.g., `uploadCrashlyticsMappingFileRelease`, `uploadCrashlyticsMappingFileDebug`) confirming the Firebase Crashlytics Gradle plugin is correctly attached, even though the END-TO-END mapping-upload cutover is owned by `EPIC-MIG-06`.
- The migration program documentation records, for every app in scope, the migrated state with a per-app boolean indicating the Android SDK swap has completed.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-MIG-01` | Inventory and readiness must identify the Android apps in scope, verify AndroidX migration status per app, and surface custom integrations and risk factors. Without the readiness report, this epic cannot scope which apps to migrate or which to defer under risk `R-MIG-01`. |
| `Predecessor` | `EPIC-MIG-02` | The Firebase project and the Android app binding (Android package name, optional SHA-1/SHA-256 certificate fingerprints) must exist before `google-services.json` can be downloaded, and Google Analytics for Firebase must be enabled in the project before the optional breadcrumb-log integration in `STORY-MIG-03-S04` can produce breadcrumbs at runtime. |
| `Successor` | `EPIC-MIG-06` | Android ProGuard/R8 mapping upload and NDK native symbol upload cutover depend on the Firebase Crashlytics Gradle plugin being installed by this epic; `EPIC-MIG-06` configures the plugin's upload behavior end-to-end. |
| `Successor` | `EPIC-MIG-09` | Android test-crash validation (`throw new RuntimeException("Force Crash")`, cold relaunch, Firebase Console verification within five minutes) requires the Firebase Crashlytics SDK to be installed and initialized — both prerequisites are produced by this epic. |
| `Successor` | `EPIC-MIG-10` | Final Fabric SDK decommission depends on every Android app having completed its SDK swap so the residual repository-wide grep for `fabric.io` returns zero non-comment matches; this epic produces that zero-match state for the Android surface. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance. Where canonical guidance does not address a specific configuration choice, this epic notes the project-level discretion explicitly rather than inferring a single answer.

- [Get started with Firebase Crashlytics for Android](https://firebase.google.com/docs/crashlytics/get-started?platform=android) — Canonical instructions for adding the Crashlytics library dependency in the module-level `build.gradle`, the recommendation to use the Firebase Android BoM for controlling library versioning, the optional addition of the Firebase SDK for Google Analytics to enable breadcrumb logs, and the prerequisite that Google Analytics be enabled in the Firebase project.
- [Migrating from Fabric to Firebase Crashlytics](https://firebase.google.com/docs/crashlytics/upgrade-from-fabric?platform=android) — Documents the canonical Android migration steps, including removal of the Fabric Maven repository and the Fabric Gradle plugin, the AndroidX prerequisite (the Firebase Crashlytics SDK uses AndroidX as a dependency), and the addition of the Firebase Crashlytics Gradle plugin classpath in place of the legacy Fabric plugin.
- [It's time to upgrade to the new Firebase Crashlytics SDK — Firebase Blog](https://firebase.blog/posts/2020/10/its-time-to-upgrade-to-new-firebase-crashlytics) — Documents the +30% Android crash capture improvement, the post-app-close upload behavior, the Gradle plugin size reduction from 20+ MB to approximately 100 KB, and the November 15 legacy Fabric SDK sunset that motivates this migration program.
- [Firebase Android BoM Documentation](https://firebase.google.com/docs/android/learn-more#bom) — Documents the Firebase Android BoM (`com.google.firebase:firebase-bom`) as the recommended mechanism for coordinating Firebase SDK versions across the Firebase product surface.
- [Add Firebase to your Android project](https://firebase.google.com/docs/android/setup) — Documents the `google-services` plugin classpath, the `apply plugin: 'com.google.gms.google-services'` directive, and the placement of `google-services.json` in the `app/` directory; also documents the `FirebaseInitProvider` auto-initialization mechanism.

