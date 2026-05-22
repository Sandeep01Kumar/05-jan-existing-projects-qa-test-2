# EPIC-PA-03: Symbolication

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-PA-03` |
| Theme | `Pipeline` |
| Pipeline Stage | `Stage 3 — Symbolication (parallel to Ingestion)` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-PA-02 (predecessor, runtime payload arrival); EPIC-PA-04, EPIC-PA-05 (successors)` |
| Last Updated | `n/a` |

## Description

This epic owns the symbolication stage of the Crashlytics pipeline: the production, upload, and server-side application of mapping artifacts that transform obfuscated or stripped binary stack frames into human-readable code references. Per canonical Firebase guidance, Crashlytics uses mapping information for the app's build (for example, dSYM files for Apple platforms) to create human-readable crash reports; without these artifacts, the Firebase Console would render obfuscated Android tokens such as `a.b.c.d` or raw hex addresses such as `0x10004a2b8`. Three artifact classes are covered: Android ProGuard/R8 mapping files for Java/Kotlin obfuscation reversal, iOS dSYM files for Swift/Objective-C symbol resolution, and NDK native symbol files for C/C++ debugging information. Mapping artifacts are produced at BUILD time — CI uploads them via the new Crashlytics Gradle plugin tasks (`uploadCrashlyticsMappingFile<Variant>`, `uploadCrashlyticsSymbolFile<Variant>`) on Android, and via an Xcode Run Script Build Phase or Fastlane `upload_symbols_to_crashlytics` on iOS. Per the Firebase Blog, the new Crashlytics Gradle Plugin was streamlined with a new API in `build.gradle` for managing mapping and native symbol files, and the plugin's total size was reduced from over 20 MB to approximately 100 KB. Symbolication is applied server-side after `EPIC-PA-04` Ingestion accepts a payload but before `EPIC-PA-05` Issue Grouping fingerprints it — the human-readable frames are the deterministic input to grouping.

## Business Value

Symbolicated stack traces are the difference between an actionable crash report and an unprioritizable opaque token — mobile developers cannot triage crashes whose user-code frames are obfuscated tokens or hex addresses. The streamlined Crashlytics Gradle plugin reduces CI complexity by replacing the legacy Fabric configuration (which required `fabric.io` credentials and per-target plumbing) with conventional Gradle tasks. The plugin size reduction from over 20 MB to approximately 100 KB lowers CI image size and Gradle dependency download time — a recurring cost that compounds across every workstation Gradle sync and every cold-cache CI build. NDK native symbol upload enables symbolicated stack traces for C/C++ crashes, expanding crash visibility to game engines, AR/VR apps, and any app with performance-critical native code, unlocking root-cause diagnosis for segfaults, ABI mismatches, and JNI-boundary failures. iOS dSYM upload integration eliminates the legacy Fabric Run Script Build Phase, simplifying the iOS build configuration and providing the canonical prerequisite for the `EPIC-MIG-10` Fabric decommission step.

## In Scope

The following items are included in this epic:

- Android ProGuard/R8 mapping file generation at build time, triggered when the release build type has `minifyEnabled true`, with output at the canonical Gradle location (typically `app/build/outputs/mapping/release/mapping.txt`).
- Upload of Android mapping files via the Firebase Crashlytics Gradle plugin task `uploadCrashlyticsMappingFile<Variant>`, registered when `apply plugin: 'com.google.firebase.crashlytics'` is applied.
- iOS dSYM file generation at build time via Xcode's `DWARF with dSYM File` debug information format for release configurations.
- Upload of iOS dSYMs via the Firebase Crashlytics Run Script Build Phase (`${PODS_ROOT}/FirebaseCrashlytics/upload-symbols` for CocoaPods, equivalent SPM-resolved path for Swift Package Manager) or the Fastlane `upload_symbols_to_crashlytics` action.
- NDK native symbol file generation for Android apps with native code, producing unstripped `.so` files per supported ABI (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`).
- Upload of NDK native symbols via `uploadCrashlyticsSymbolFile<Variant>`, gated by `firebaseCrashlytics { nativeSymbolUploadEnabled true }` in the module-level `build.gradle`.
- Server-side application of mapping artifacts to runtime crash payloads, producing human-readable stack frames that are the deterministic input to `EPIC-PA-05` Issue Grouping.
- CI/CD pipeline integration: mapping and symbol uploads happen as part of every release build automatically, with a non-empty registered-file summary in the build log so silent upload failures surface immediately.

## Out of Scope

The following items are explicitly excluded from this epic:

- On-device crash capture (unhandled exceptions, NDK native crashes, ANRs, non-fatal errors) and local persistence until next launch — owned by `EPIC-PA-01`.
- SDK-side transport, retries, HTTPS transport security, and post-app-close uploads — owned by `EPIC-PA-02`. Mapping and symbol artifacts move on a separate build-time upload pathway, not via runtime SDK transport.
- Server-side payload ingestion, schema validation, request authentication, and deduplication — owned by `EPIC-PA-04`. This epic produces symbolicated frames that `EPIC-PA-04` stores but does not own the ingest contract.
- Stack-trace fingerprinting, issue lifecycle, and merge/split workflows — owned by `EPIC-PA-05`. Issue grouping consumes the symbolicated frames produced here; symbolication is a precondition rather than an integration point.
- The one-time CUTOVER of mapping/symbol uploads from the legacy 20+ MB Fabric Gradle plugin to the new approximately 100 KB Firebase Crashlytics Gradle plugin — owned by [`EPIC-MIG-06`](../migration/EPIC-MIG-06-symbol-and-mapping-upload-cutover.md). This pipeline epic describes STEADY-STATE symbolication after migration is complete.

## User Stories

This epic contains 4 user stories embedded inline using H3 headings (Rule AR-1). They partition symbolication into the three artifact-class upload pathways (`STORY-PA-03-S01` Android ProGuard/R8, `STORY-PA-03-S02` iOS dSYM, `STORY-PA-03-S03` NDK native symbols) plus the server-side application pathway (`STORY-PA-03-S04`) that ties them together. Each story is derived from [`../templates/story-template.md`](../templates/story-template.md).

### STORY-PA-03-S01: Upload Android ProGuard/R8 mapping files via Gradle plugin

**As a** mobile developer working on Android, **I want** ProGuard/R8 mapping files uploaded to Firebase Crashlytics for every release build, **so that** the Firebase Console displays symbolicated Android stack traces with original class and method names rather than obfuscated tokens.

#### Acceptance Criteria

- **Given** an Android module's `build.gradle` has `minifyEnabled true` for the release build type, **When** the developer runs `./gradlew assembleRelease`, **Then** a mapping file is produced at the canonical Gradle output location (typically `app/build/outputs/mapping/release/mapping.txt`).
- **Given** the Firebase Crashlytics Gradle plugin is applied (`apply plugin: 'com.google.firebase.crashlytics'`), **When** the developer or CI runs `./gradlew uploadCrashlyticsMappingFile<Variant>`, **Then** the mapping file is uploaded and the task completes successfully with a non-empty registered-file summary in the build log.
- **Given** a release build is deployed and a real obfuscated crash occurs in production, **When** the on-call engineer opens the crash in the Firebase Console, **Then** the stack trace renders with original class, method, and source-file references (for example, `com.example.app.MainActivity.onCreate(MainActivity.kt:42)`) rather than obfuscated tokens (for example, `a.b.c(d.kt:1)`).
- **Given** a CI release pipeline executes the standard release build, **When** it runs the configured Gradle task chain, **Then** the mapping upload runs automatically with no manual step, and silent upload failures surface immediately in the CI build log.

#### Notes

- The streamlined Gradle plugin API (per the Firebase Blog announcement) simplifies configuration compared to the legacy Fabric plugin, replacing `fabric.io`-credentialed upload calls with conventional Gradle tasks.
- For DexGuard or other non-standard obfuscators (a known risk surfaced by `EPIC-MIG-01`), the upload procedure may differ from the standard R8 path; refer to Firebase troubleshooting guidance rather than assuming the default flow applies.

---

### STORY-PA-03-S02: Upload iOS dSYM files via Run Script or Fastlane

**As a** mobile developer working on iOS, **I want** dSYM files uploaded to Firebase Crashlytics for every release build, **so that** the Firebase Console displays symbolicated iOS stack traces with original Swift and Objective-C symbol names rather than hex addresses.

#### Acceptance Criteria

- **Given** an iOS Xcode project has Debug Information Format set to `DWARF with dSYM File` for the release configuration, **When** the project is built via `xcodebuild archive` or Xcode's Archive action, **Then** dSYM files are produced inside the build's `DerivedData` directory and are accessible to the upload script.
- **Given** a Firebase-targeted Run Script Build Phase (`${PODS_ROOT}/FirebaseCrashlytics/upload-symbols` for CocoaPods, the SPM-resolved equivalent for Swift Package Manager) or a Fastlane lane invoking `upload_symbols_to_crashlytics`, **When** the release build completes, **Then** the dSYMs are uploaded to Firebase and registered against the build's UUID with a non-empty success summary in the build log.
- **Given** an iOS crash with originally stripped symbol references occurs in production, **When** an on-call engineer inspects it in the Firebase Console, **Then** the stack trace renders with original Swift and Objective-C symbol names (for example, `MyApp.ViewController.viewDidLoad() (ViewController.swift:33)`) rather than hex addresses (for example, `0x10004a2b8`).
- **Given** the app was distributed via App Store Connect with Bitcode enabled (where Apple recompiles the binary and emits new dSYMs), **When** the developer downloads the recompiled dSYMs via Xcode → Organizer → Downloads → "Download dSYMs..." or via `fastlane download_dsyms` and re-runs the Firebase upload command, **Then** the post-recompile dSYMs are also registered and crashes from devices running the recompiled binary are symbolicated.

#### Notes

- Per canonical Firebase guidance, Crashlytics uses mapping information for the app's build (for example, dSYM files for Apple platforms) to create human-readable crash reports; iOS symbolication is the documented baseline expectation.
- Bitcode was deprecated by Apple as of Xcode 14, so the recompilation pathway is decreasingly relevant for new projects; legacy apps shipping Bitcode-enabled builds must continue to apply the post-recompile dSYM upload step until Bitcode is fully removed.

---

### STORY-PA-03-S03: Upload NDK native symbol files for Android native crashes

**As a** mobile developer working on Android apps with native (C/C++) code, **I want** NDK native symbol files uploaded to Firebase Crashlytics for every release build, **so that** native crashes show symbolicated function names and source-file/line references rather than raw hex addresses.

#### Acceptance Criteria

- **Given** an Android app with NDK native code and the Crashlytics Gradle plugin's `firebaseCrashlytics { nativeSymbolUploadEnabled true }` extension applied in the module-level `build.gradle`, **When** the developer or CI runs `./gradlew uploadCrashlyticsSymbolFile<Variant>`, **Then** unstripped `.so` symbol files (one per supported ABI) are uploaded to Firebase and registered against the build's ABI-specific symbol identifier.
- **Given** the app's APK or App Bundle includes the supported ABIs `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`, **When** the symbol upload task runs, **Then** symbols for EACH ABI are uploaded separately and registered against the build's ABI-specific symbol UUID, and a crash from any supported ABI resolves to symbolicated frames against the matching ABI's symbol file.
- **Given** a native crash occurs in production (for example, a segfault from a JNI function), **When** the on-call engineer inspects it in the Firebase Console, **Then** the native stack trace renders with original C/C++ function names and source-file/line references (for example, `myNativeFunction (jni_bridge.cpp:127)`) rather than hex addresses (for example, `0x7f2a4b8e10`), and the symbolicated chain extends across the JNI boundary.

#### Notes

- NDK ABI-specific symbol uploads can be sizeable (tens of megabytes per ABI for large native libraries), so CI cache configuration may need tuning to keep release build times acceptable.
- The new Crashlytics Gradle Plugin's API for native symbol files was streamlined per the Firebase Blog; for many apps migrating from Fabric, this is the FIRST time native crash symbolication is available end-to-end — see `EPIC-MIG-06` for the cutover.

---

### STORY-PA-03-S04: Apply mapping artifacts server-side to produce human-readable reports

**As an** on-call engineer, **I want** Firebase to apply uploaded mapping artifacts to incoming crash payloads server-side, **so that** crash reports in the Firebase Console are always displayed in their human-readable form without manual deobfuscation on my part.

#### Acceptance Criteria

- **Given** a crash payload arrives at the ingest endpoint with the build's UUID and version identifiers, **When** the server looks up the corresponding mapping artifact registered by `STORY-PA-03-S01`, `S02`, or `S03`, **Then** the artifact is applied to each frame to produce human-readable symbol names, and the symbolicated frames are stored as the input to `EPIC-PA-05` Issue Grouping.
- **Given** a crash payload arrives for a build whose mapping artifact has NOT YET been uploaded (a late upload caused by CI delay or out-of-order sequence), **When** the artifact is later uploaded, **Then** the previously ingested crashes from the matching build are retroactively symbolicated and the Firebase Console issue cards re-render with the resolved symbol names.
- **Given** a crash payload references a build for which NO mapping artifact will ever be uploaded (a debug build without minification, an internal pre-release build, or a release build where upload failed and was never re-run), **When** the server processes the payload, **Then** the report displays raw frame data with an explicit indicator that symbolication is unavailable.
- **Given** an NDK crash with an ABI marker on the payload, **When** the server symbolicates the native frames, **Then** the correct ABI's symbol file is selected based on the payload's ABI marker (for example, `arm64-v8a` for an ARM64 device crash) rather than the wrong ABI's symbols being applied.

#### Notes

- Retroactive symbolication ensures that out-of-order build-vs-upload sequences still produce useful reports; persistent symbolication gaps should be treated as a CI pipeline timing issue to remediate rather than an accepted steady state.
- The actual symbolication algorithm and artifact storage are owned by Firebase infrastructure; this story documents EXPECTED BEHAVIOR from the consumer perspective rather than implementation.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories (Rule AR-4).

- **Given** every release build of an Android client app with `minifyEnabled true`, **When** the CI release pipeline runs, **Then** the build emits a ProGuard/R8 mapping file AND uploads it to Firebase via `uploadCrashlyticsMappingFile<Variant>`, verified by a non-empty registered-file summary in the build log.
- **Given** every release build of an iOS client app, **When** the CI release pipeline runs, **Then** the build emits dSYM files AND uploads them to Firebase via the Crashlytics Run Script Build Phase or Fastlane `upload_symbols_to_crashlytics` action, with Bitcode-enabled builds additionally triggering the post-recompile dSYM upload step.
- **Given** every release build of an Android client app with NDK native code, **When** the CI release pipeline runs, **Then** unstripped `.so` symbol files for every supported ABI are uploaded via `uploadCrashlyticsSymbolFile<Variant>`, and per-ABI registration is verified in the Firebase symbol upload summary.
- **Given** a representative crash on each platform (one Android obfuscated crash, one iOS release-configuration crash, one NDK native crash), **When** an on-call engineer opens the corresponding issue card in the Firebase Console, **Then** the stack trace is rendered in human-readable form with no obfuscated tokens (Android), no hex addresses (iOS, NDK), and the user-code portion is symbolicated end-to-end.
- **Given** a mapping artifact uploaded AFTER the corresponding crash payload was ingested, **When** the server reprocesses the affected payloads, **Then** the previously ingested crashes are retroactively symbolicated and the Firebase Console issue cards re-render with the resolved symbol names.

## Definition of Done

The epic is complete when ALL of the following observable conditions are simultaneously true:

- All 4 embedded stories (`STORY-PA-03-S01` through `STORY-PA-03-S04`) have their acceptance criteria satisfied.
- All 5 epic-level acceptance criteria above are satisfied.
- A force-crash on Android (against a minified release build after its mapping file is uploaded) produces a symbolicated stack trace with original class, method, and source-file names rather than obfuscated tokens.
- A force-crash on iOS (against a release build after its dSYMs are uploaded) produces a symbolicated stack trace with original Swift or Objective-C symbol names rather than hex addresses.
- A force-crash in NDK native code (a deliberate null-dereference or controlled segfault inside a JNI function in a release build with native symbols uploaded) produces a symbolicated stack trace with C/C++ function names and source-file/line references, with the chain extending across the JNI boundary.
- CI release pipelines for all in-scope client apps run the appropriate symbol upload step automatically as part of the release build.
- Retroactive symbolication is verified by delaying a mapping upload until after a corresponding test crash has been ingested, then uploading the artifact and confirming the issue card re-renders with the resolved symbol names.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph remains acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-PA-02` | A runtime crash payload must arrive at the server before symbolication can be applied to its frames; symbol upload itself is parallel and asynchronous to the runtime path, but server-side symbolication requires a runtime payload to act on. |
| `Successor` | `EPIC-PA-04` | Ingestion stores the symbolicated frames produced by this stage as part of the validated, deduplicated payload record; without symbolication, the stored payload would carry only obfuscated frames and grouping would be unstable. |
| `Successor` | `EPIC-PA-05` | Issue grouping fingerprints stack traces to produce stable issues across builds, devices, and locales; symbolicated frames are the deterministic input to fingerprinting, and obfuscated frames would produce noisy and unstable groupings. |

## References

Per Rule AR-5 (Source Grounding), this epic is grounded in public Firebase or Crashlytics guidance. Inferred content not directly traceable to a public source is flagged inline as `[inferred — no direct source]`.

- [Firebase Crashlytics — Product Overview](https://firebase.google.com/docs/crashlytics) — Documents that Crashlytics uses mapping information for the app's build (for example, dSYM files for Apple platforms) to create human-readable crash reports.
- [Firebase Blog — It's time to upgrade to the new Firebase Crashlytics SDK](https://firebase.blog/posts/2020/10/its-time-to-upgrade-to-new-firebase-crashlytics) — Documents the streamlined Crashlytics Gradle Plugin's new API for mapping and native symbol files, and the size reduction from over 20 MB to approximately 100 KB.
- [Firebase Crashlytics — Get deobfuscated reports (Android)](https://firebase.google.com/docs/crashlytics/get-deobfuscated-reports) — Canonical ProGuard/R8 mapping upload procedure; grounds `STORY-PA-03-S01`.
- [Firebase Crashlytics — Get deobfuscated reports (iOS)](https://firebase.google.com/docs/crashlytics/get-deobfuscated-reports?platform=ios) — Canonical dSYM upload procedure; grounds `STORY-PA-03-S02` including the Run Script Build Phase, Fastlane invocations, and the Bitcode-recompile flow.
- [Firebase Crashlytics — NDK reports](https://firebase.google.com/docs/crashlytics/ndk-reports) — NDK native symbol upload procedure; grounds `STORY-PA-03-S03` including the `nativeSymbolUploadEnabled` extension and per-ABI upload via `uploadCrashlyticsSymbolFile<Variant>`.
