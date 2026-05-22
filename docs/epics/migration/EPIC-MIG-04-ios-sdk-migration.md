# EPIC-MIG-04: iOS SDK Migration

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-MIG-04` |
| Theme | `Migration` |
| Phase | `Phase 2 — Platform SDK Swaps` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-MIG-01, EPIC-MIG-02 (predecessors); EPIC-MIG-06, EPIC-MIG-09 (successors)` |
| Last Updated | `n/a` |

## Description

This epic migrates every in-scope iOS client app (and any companion macOS, tvOS, or watchOS targets sharing the same Xcode project) from the legacy Fabric Crashlytics SDK to the new Firebase Crashlytics SDK by mechanically swapping the Xcode and dependency-manager surface. Per canonical Firebase migration guidance, the migration begins by opening the app in Xcode and removing the legacy `Crashlytics` Run Script Build Phase from the project's Build Phases — the explicit first step, because that phase still invokes the sunset Fabric upload command on every build. The CocoaPods `Podfile` is then updated to drop `pod 'Fabric'` and `pod 'Crashlytics'` and to add `pod 'FirebaseCrashlytics'` (optionally `pod 'FirebaseAnalytics'` for breadcrumb logs); apps moving to Swift Package Manager add the Firebase iOS SDK package (`https://github.com/firebase/firebase-ios-sdk`) and select the `FirebaseCrashlytics` product instead. The `AppDelegate` is updated to call `FirebaseApp.configure()` (Swift) or `[FIRApp configure]` (Objective-C) as the first line of `application(_:didFinishLaunchingWithOptions:)`, replacing the legacy `Fabric.with([Crashlytics.self])` call; SwiftUI apps using the `@main App` struct without an `AppDelegate` perform the same configuration inside the struct's initializer or via an `UIApplicationDelegateAdaptor` shim. Finally, the legacy Fabric API key dictionary is removed from `Info.plist` and `GoogleService-Info.plist` (downloaded from the Firebase Console per `EPIC-MIG-02`) is added to the app bundle as the canonical Firebase configuration source, with one file per bundle identifier where the app supports multiple build variants. This epic sits in Phase 2 (Platform SDK Swaps) alongside `EPIC-MIG-03` (Android) and `EPIC-MIG-05` (cross-platform); Phase 1 (`EPIC-MIG-01` and `EPIC-MIG-02`) must complete first because the readiness report scopes which iOS apps participate and the Firebase project produces the `GoogleService-Info.plist` files this epic consumes.

## Business Value

iOS migration unlocks Firebase Crashlytics' real-time crash reporting across iOS, macOS, tvOS, and watchOS, and the new Firebase Crashlytics SDK can upload crashes after the app has closed — providing more real-time crash data than the legacy "upload on next launch" model. Removing the Fabric `Crashlytics` Run Script Build Phase eliminates a build-time integration point that no longer serves a purpose post-sunset and shortens every Xcode build by removing the legacy upload step from the build graph. Adopting `GoogleService-Info.plist` as the canonical configuration source aligns iOS apps with the rest of the Firebase product suite (Authentication, Cloud Messaging, Remote Config, Performance Monitoring, A/B Testing), simplifying future Firebase product adoption because subsequent products read the same configuration file. The CocoaPods-or-SPM swap performed by this epic is the prerequisite foundation for the iOS dSYM upload integration in `EPIC-MIG-06` and the iOS test-crash validation in `EPIC-MIG-09`; until the new SDK is installed, neither downstream epic can produce a working artifact for iOS apps. Roles that benefit include mobile developers (cleaner Xcode project, modern dependency-manager options), on-call engineers (richer issue cards once breadcrumb logs are enabled), release managers (continuity of crash signal across the legacy-SDK sunset and across all Apple platforms in a single Firebase project view), security/privacy reviewers (configuration sourced from the canonical Firebase config file rather than a stale Fabric API key dictionary), and the migration program lead (a concrete, auditable per-app SDK swap that dovetails with the Android scope owned by `EPIC-MIG-03`).

## In Scope

The following items are included in this epic:

- Removal of the legacy `Crashlytics` Run Script Build Phase from every in-scope iOS app's Xcode project Build Phases (canonical first step per public Firebase iOS migration guidance) — performed via the Xcode UI (Target → Build Phases → click the `x` next to the Crashlytics phase) — followed by a verification grep of `project.pbxproj` for `Crashlytics run`, `Fabric.framework`, and `Crashlytics.framework` confirming zero matches.
- Removal of `pod 'Fabric'` and `pod 'Crashlytics'` (and any `pod 'Crashlytics/<subspec>'` entries) from every in-scope iOS app's `Podfile`, followed by `pod install` to update `Podfile.lock` and prune the `Pods/` directory; non-CocoaPods Fabric integrations (drag-and-dropped frameworks) must be removed manually from Target → Frameworks, Libraries, and Embedded Content.
- Addition of `pod 'FirebaseCrashlytics'` followed by `pod install` OR adoption of Swift Package Manager by adding the Firebase iOS SDK package (`https://github.com/firebase/firebase-ios-sdk`) and selecting the `FirebaseCrashlytics` product against the app target; optional `pod 'FirebaseAnalytics'` (CocoaPods) or `FirebaseAnalytics` SPM product enables breadcrumb logs in iOS issue cards (requires Google Analytics enabled in the project per `EPIC-MIG-02`).
- Addition of `GoogleService-Info.plist` (downloaded from the Firebase Console per `EPIC-MIG-02`) to every in-scope iOS app's Xcode project, included in the app target's Copy Bundle Resources Build Phase, with a per-variant file under each variant's source folder where the project supports multiple bundle identifiers.
- Replacement of the legacy `Fabric.with([Crashlytics.self])` initialization in `AppDelegate` with `FirebaseApp.configure()` (Swift) or `[FIRApp configure]` (Objective-C) as the FIRST line of `application(_:didFinishLaunchingWithOptions:)`, accompanied by `import Firebase` (Swift) or `@import Firebase;` (Objective-C); SwiftUI apps using the `@main App` struct without an `AppDelegate` perform the same configuration inside the struct's `init()` or via an `UIApplicationDelegateAdaptor` shim.
- Removal of the legacy Fabric `import` statements (`import Fabric`, `import Crashlytics`, `@import Fabric;`, `@import Crashlytics;`) from every Swift and Objective-C source file in the project.
- Removal of the Fabric API key dictionary from `Info.plist` — the dictionary key `Fabric` containing the nested `APIKey` string and `Kits` array.
- Verification that a clean iOS release build succeeds via Xcode (Product → Build) and via `xcodebuild`, and that the resulting `.app` bundle launches in the simulator without a Fabric-related crash and emits a Firebase initialization log line in the Xcode console.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- Android SDK migration (Maven repository cleanup, Gradle plugin swap, Firebase Android BoM adoption, `google-services.json` placement) — owned by `EPIC-MIG-03`.
- Cross-platform SDK migration (FlutterFire `firebase_crashlytics`, Unity Firebase plugin, `@react-native-firebase/crashlytics`) — owned by `EPIC-MIG-05`. Flutter, Unity, and React Native iOS targets delegate to the iOS native runtime, so the native Xcode-level changes performed here still apply to their underlying iOS hosts; the cross-platform wiring on top is owned by `EPIC-MIG-05`.
- iOS dSYM upload integration into Firebase Crashlytics (the `${PODS_ROOT}/FirebaseCrashlytics/run` build-phase script, dSYM debug-information format selection, Bitcode-era dSYM download from App Store Connect, fastlane's `upload_symbols_to_crashlytics`) — owned by `EPIC-MIG-06`. The new SDK is INSTALLED in this epic, but the cutover of the symbol-upload pipeline is `EPIC-MIG-06`'s responsibility.
- Translation of Fabric Answers iOS events (`Answers.logCustomEvent`, `Answers.logSignUp`, `Answers.logPurchase`, etc.) to Google Analytics for Firebase predefined or custom events — owned by `EPIC-MIG-07`; this epic only installs the optional `FirebaseAnalytics` SDK so the translation has a runtime destination.
- Test-crash validation (`fatalError("Force Crash")` in Swift, `[[NSException ...] raise]` in Objective-C, cold relaunch, Firebase Console verification within five minutes) and the dual-running validation window across SDKs — owned by `EPIC-MIG-09`.
- Migration of historical Crashlytics data via the Firebase migration page — owned by `EPIC-MIG-08`. Final removal of all `fabric.io` references in non-iOS contexts (CI scripts, fastlane configurations, README files) and archival of the Fabric organization — owned by `EPIC-MIG-10`.
- Provisioning of the Firebase project, linking iOS app bundle identifiers, configuring IAM access, and enabling Google Analytics for Firebase — owned by `EPIC-MIG-02`; this epic CONSUMES the resulting `GoogleService-Info.plist` files but does not produce them.
- Inventory of Fabric usage across all client apps and verification of iOS-specific prerequisites — owned by `EPIC-MIG-01`; this epic operates on the iOS apps enumerated by `EPIC-MIG-01`'s readiness report.

## User Stories

This epic contains 5 user stories. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings (Rule AR-1). Stories live INSIDE their parent epic file to keep each epic self-contained and eliminate broken cross-file links during refactors.

### STORY-MIG-04-S01: Remove Crashlytics Run Script Build Phase from Xcode

**As a** mobile developer working on iOS apps, **I want** the legacy `Crashlytics` Run Script Build Phase removed from every in-scope iOS app's Xcode project, **so that** the Xcode build no longer invokes the sunset Fabric upload command on every build and the Build Phases list reflects only Firebase-era integrations.

#### Acceptance Criteria

- **Given** an in-scope iOS app's Xcode project opened in Xcode, **When** the developer navigates to Target → Build Phases and inspects the list of build phases, **Then** the legacy `Crashlytics` phase (or any equivalent script phase whose body invokes a Fabric or legacy Crashlytics binary) is no longer visible in the Build Phases list.
- **Given** the same iOS app's `project.pbxproj` file, **When** the developer searches for the strings `Crashlytics run`, `Fabric.framework`, `Crashlytics.framework`, `${PODS_ROOT}/Fabric/run`, and `${PODS_ROOT}/Crashlytics/submit`, **Then** zero matches remain across the entire file.
- **Given** the iOS project after the Run Script Build Phase removal, **When** the developer runs `xcodebuild clean build` or builds via Xcode (Product → Build), **Then** the build succeeds without any Fabric-related Run Script step being executed and without the "command not found" or "missing API key" errors that the legacy phase used to emit.
- **Given** the project's build log produced by the build above, **When** the developer searches the log for `Fabric` or `Crashlytics run`, **Then** no log lines reference the legacy Run Script Build Phase, confirming the phase is no longer scheduled by the Xcode build graph.

#### Notes

- Per canonical Firebase iOS migration guidance, removing the `Crashlytics` Run Script Build Phase is the EXPLICIT first step of the iOS migration and is sequenced before any `Podfile` change because the Run Script phase references binaries that may be deleted by a subsequent `pod install`; removing the phase first prevents transient "missing script" errors during the migration window.
- The Build Phases edit should be performed via the Xcode UI (Target → Build Phases → select the phase → click `x`) to preserve the `project.pbxproj` format; hand-editing `project.pbxproj` is error-prone because the file uses an opaque OpenStep dictionary syntax with stable UUIDs that the Xcode UI manages automatically.
- For projects that vendor multiple targets (app + extensions + watchOS companion + tvOS variant) within the same Xcode project, the Run Script Build Phase removal must be repeated PER target — the build phase belongs to a target, not to the project. The verification grep over `project.pbxproj` covers all targets in one pass.

---

### STORY-MIG-04-S02: Drop Fabric and Crashlytics pods from Podfile

**As a** mobile developer, **I want** `pod 'Fabric'` and `pod 'Crashlytics'` removed from every in-scope iOS app's `Podfile` and the resulting `Pods/` directory and `Podfile.lock` cleaned up, **so that** the project's CocoaPods dependency surface no longer carries the legacy SDKs and no project file references the sunset frameworks.

#### Acceptance Criteria

- **Given** an in-scope iOS app's `Podfile`, **When** the developer searches for `pod 'Fabric'`, `pod 'Crashlytics'`, and any subspec form such as `pod 'Crashlytics/Beta'`, **Then** all matching `pod ...` lines are removed and no pod declaration in the file mentions Fabric or legacy Crashlytics.
- **Given** the updated `Podfile`, **When** the developer runs `pod install` (or `pod update` to evict cached artifacts), **Then** the resulting `Podfile.lock` no longer lists `Fabric` or `Crashlytics` under `PODS:` or `SPEC CHECKSUMS:`, and the `Pods/Fabric/` and `Pods/Crashlytics/` directories are removed by CocoaPods.
- **Given** the iOS workspace (`<App>.xcworkspace`) after `pod install`, **When** the developer opens the workspace in Xcode and inspects the project navigator's Pods project, **Then** the `Fabric.framework` and `Crashlytics.framework` entries are no longer present under Pods → Frameworks and the linked libraries on the app target no longer include either framework.
- **Given** the iOS app's source tree, **When** the developer searches for `import Fabric`, `import Crashlytics`, `@import Fabric;`, and `@import Crashlytics;` across all `.swift`, `.m`, and `.mm` files, **Then** every matching import is removed and the project compiles without "no such module" errors after the pod removal.
- **Given** projects that used a non-CocoaPods Fabric integration (drag-and-drop of `Fabric.framework` and `Crashlytics.framework` into the project navigator), **When** the developer inspects Target → General → Frameworks, Libraries, and Embedded Content, **Then** both framework entries are removed manually and the linked binary list contains no Fabric-era artifacts.

#### Notes

- The `Podfile.lock` change should be committed to version control alongside the `Podfile` edit so the dependency snapshot is reproducible across team members and CI workers; skipping the lockfile commit produces silent dependency drift on subsequent `pod install` runs.
- For apps that shipped Bitcode-enabled archives to App Store Connect, those historical archives retain Fabric symbol references; nothing in this story modifies the historical artifacts, which remain symbolicatable via legacy Fabric symbols until the Fabric service sunsets entirely.
- Apps that integrated Fabric via Carthage (`github "Fabric/Fabric"` in `Cartfile`) must perform the analogous removal in `Cartfile`, run `carthage update`, and delete the resulting `Carthage/Build/iOS/Fabric.framework` and `Carthage/Build/iOS/Crashlytics.framework` directories.

---

### STORY-MIG-04-S03: Add Firebase Crashlytics via CocoaPods or Swift Package Manager

**As a** mobile developer, **I want** Firebase Crashlytics added to every in-scope iOS app via CocoaPods (`pod 'FirebaseCrashlytics'`) or Swift Package Manager (the Firebase iOS SDK package at `https://github.com/firebase/firebase-ios-sdk`, with the `FirebaseCrashlytics` product selected), **so that** the new SDK is available to the app at compile time and at runtime and the foundation for downstream dSYM upload and test-crash validation is in place.

#### Acceptance Criteria

- **Given** an iOS app that uses CocoaPods, **When** the developer adds `pod 'FirebaseCrashlytics'` to the relevant target block in the `Podfile` and runs `pod install`, **Then** the Crashlytics framework is installed in `Pods/FirebaseCrashlytics/`, the workspace is regenerated to include the Pods project, and `Podfile.lock` lists `FirebaseCrashlytics` with a concrete resolved version under both `PODS:` and `SPEC CHECKSUMS:`.
- **Given** an iOS app that uses Swift Package Manager, **When** the developer opens File → Add Packages in Xcode, enters `https://github.com/firebase/firebase-ios-sdk` as the package URL, and adds the `FirebaseCrashlytics` product to the app target, **Then** the package resolves successfully (`Package.resolved` records the resolved version) and the app target's "Frameworks, Libraries, and Embedded Content" list includes `FirebaseCrashlytics`.
- **Given** the optional breadcrumb-log integration is desired and Google Analytics is enabled in the owning Firebase project (per `EPIC-MIG-02`), **When** the developer adds `pod 'FirebaseAnalytics'` (CocoaPods) or selects the `FirebaseAnalytics` SPM product alongside `FirebaseCrashlytics`, **Then** the Analytics SDK is available at runtime and breadcrumb logs populate in subsequent Crashlytics issue cards for this iOS app.
- **Given** the iOS project after Firebase Crashlytics is installed via either dependency manager, **When** the developer performs a clean build (Product → Clean Build Folder, then Product → Build), **Then** the build succeeds with no `Undefined symbols for architecture` linker errors and no `'FirebaseCrashlytics/...' file not found` header-search-path errors.
- **Given** the resolved Firebase iOS SDK version, **When** the developer inspects `Podfile.lock` (CocoaPods) or `Package.resolved` (SPM), **Then** the recorded version is the same coordinated release across `FirebaseCrashlytics`, optional `FirebaseAnalytics`, and any other Firebase products linked into the target — preventing silent version drift across the Firebase product surface.

#### Notes

- Per canonical Firebase iOS SDK guidance, the Firebase iOS SDK supports BOTH CocoaPods and Swift Package Manager. SPM is preferred for new projects (native Xcode integration, no `.xcworkspace` overhead); CocoaPods may be retained for existing projects to minimize migration churn when the project already depends on many pods and a partial SPM migration would split the dependency surface.
- Apple silicon (`arm64` simulator) compatibility may require additional Xcode configuration on legacy projects that excluded `arm64` from simulator architectures (`Excluded Architectures = arm64` under "Any iOS Simulator SDK"); for Firebase iOS SDK 8.x and newer this exclusion is no longer required and should be removed.
- For mixed-language projects (Swift + Objective-C) that import Firebase from both languages, ensure the bridging header includes `@import FirebaseCrashlytics;` so Objective-C call sites can reach `FIRCrashlytics`; Swift sources auto-import the module via `import FirebaseCrashlytics`.

---

### STORY-MIG-04-S04: Update AppDelegate to call FirebaseApp.configure()

**As a** mobile developer, **I want** `AppDelegate` updated to call `FirebaseApp.configure()` (Swift) or `[FIRApp configure]` (Objective-C) as the very first line of `application(_:didFinishLaunchingWithOptions:)`, **so that** Firebase Crashlytics initializes at app launch before any other Firebase API is invoked and any subsequent crash is captured by the new SDK.

#### Acceptance Criteria

- **Given** an in-scope iOS app's `AppDelegate.swift` (Swift) or `AppDelegate.m` (Objective-C), **When** the developer adds `FirebaseApp.configure()` (Swift) or `[FIRApp configure];` (Objective-C) as the FIRST statement inside `application(_:didFinishLaunchingWithOptions:)` (Swift) or `application:didFinishLaunchingWithOptions:` (Objective-C), **Then** the call executes before any other Firebase API and before any application-specific code that might rely on Firebase services (Authentication, Cloud Messaging, Remote Config).
- **Given** the same `AppDelegate`, **When** the developer searches for the legacy initialization line `Fabric.with([Crashlytics.self])` and any analogous calls (`Fabric.with([Crashlytics.self, Answers.self])`, `Crashlytics.start(withAPIKey:)`, `[Crashlytics startWithAPIKey:...]`), **Then** every legacy initialization call is removed and the `AppDelegate` references no Fabric or legacy Crashlytics symbol.
- **Given** the top of the `AppDelegate` source file, **When** the developer adds `import Firebase` (Swift) or `@import Firebase;` (Objective-C) and removes `import Fabric`, `import Crashlytics`, `@import Fabric;`, and `@import Crashlytics;`, **Then** the source compiles cleanly with no "no such module" errors and Firebase symbols resolve correctly to the newly installed SDK.
- **Given** the app launches on a simulator or physical device after the configure call is in place, **When** the developer inspects the Xcode console at startup, **Then** a Firebase initialization log line appears (e.g., `[Firebase/Core][I-COR000001] Configuring the default app.`) confirming `FirebaseApp.configure()` succeeded and that `GoogleService-Info.plist` was located and parsed correctly.

#### Notes

- The precedence requirement — `FirebaseApp.configure()` must be called BEFORE any other Firebase API — is a HARD invariant of the Firebase iOS SDK. Calling any other Firebase API first produces a runtime fatal error ("The default Firebase app has not yet been configured."), so this story mandates first-line placement inside `application(_:didFinishLaunchingWithOptions:)`.
- For SwiftUI apps that do NOT use a traditional `AppDelegate` (the `@main App` struct pattern), the same `FirebaseApp.configure()` call is performed inside the `App` struct's `init()` OR via an `UIApplicationDelegateAdaptor`-backed `AppDelegate` that calls `FirebaseApp.configure()` in its own `application(_:didFinishLaunchingWithOptions:)`; either pattern ensures Firebase initializes before any SwiftUI view renders.
- For app extensions (Today widgets, Share extensions, Notification Service extensions) that need their own Firebase initialization, each extension target needs its own `FirebaseApp.configure()` call in its principal entry point because extensions run in their own process and do not inherit the host app's Firebase configuration.

---

### STORY-MIG-04-S05: Remove Fabric API key from Info.plist and add GoogleService-Info.plist

**As a** mobile developer, **I want** the Fabric API key dictionary removed from `Info.plist` and `GoogleService-Info.plist` added to the app bundle as the canonical Firebase configuration source, **so that** the iOS app sources Firebase configuration from the canonical Firebase config file rather than a stale Fabric API key dictionary and the bundle is auditable for residual Fabric references.

#### Acceptance Criteria

- **Given** an in-scope iOS app's `Info.plist`, **When** the developer opens the file (via the Xcode property list editor or as raw XML) and searches for the dictionary key `Fabric` (with its nested `APIKey` string and `Kits` array of kit-name dictionaries), **Then** the entire `Fabric` dictionary entry is removed and `Info.plist` contains no Fabric-related keys.
- **Given** the Firebase Console's iOS app configuration provisioned by `EPIC-MIG-02`, **When** the developer downloads `GoogleService-Info.plist` for the corresponding bundle identifier and drags the file into the Xcode project navigator with "Copy items if needed" enabled and the app target checked, **Then** the file is included in the app target's Copy Bundle Resources Build Phase (verifiable via Target → Build Phases) and its `BUNDLE_ID` key matches the app's `CFBundleIdentifier` from `Info.plist`.
- **Given** the app launches after the `Info.plist` cleanup and `GoogleService-Info.plist` addition, **When** Firebase initializes via the `FirebaseApp.configure()` call introduced in Story 4, **Then** the initialization sources `GoogleService-Info.plist` from the main bundle, produces no "GoogleService-Info.plist not found" warning in the Xcode console, and `FirebaseApp.app()` returns a non-nil instance whose `options.bundleID` matches the app's bundle identifier.
- **Given** a project that supports multiple bundle identifiers across variants (e.g., `com.example.app.debug`, `com.example.app.staging`, `com.example.app`), **When** the developer downloads a `GoogleService-Info.plist` per variant and places each under its source folder (e.g., `App/Variants/Debug/GoogleService-Info.plist`) with target membership scoped to the matching build configuration, **Then** each variant build picks up its own configuration and no bundle-ID mismatch error occurs.
- **Given** app extensions (Today widgets, Share extensions, Notification Service extensions) that initialize Firebase independently, **When** the developer adds `GoogleService-Info.plist` to each extension target's Copy Bundle Resources Build Phase, **Then** each extension's `FirebaseApp.configure()` call succeeds and the extension's `FirebaseApp.app()` resolves to a configured instance.

#### Notes

- `GoogleService-Info.plist` is NOT a secret in the cryptographic sense — it contains the iOS client ID, reversed client ID for URL schemes, API key for client-side services, and the Firebase project ID, all visible in any decompiled IPA. It SHOULD, however, follow the team's source-control convention; many teams commit it, others gitignore and inject during CI from a secure store.
- The Fabric API key dictionary in `Info.plist` causes no functional issue if left in place (the new SDK ignores it), but leaving it is a stale reference that auditors and downstream cleanup automation will flag — this story therefore mandates removal even though the practical impact is cosmetic.
- For App Clips and watchOS companion apps that share the parent app's Firebase project, each clip or companion needs its own `GoogleService-Info.plist` (with the clip's or companion's bundle ID) registered against the Firebase project per `EPIC-MIG-02` and added to that target's Copy Bundle Resources Build Phase.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4). They satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically to the pipeline theme for catalog uniformity.

- **Given** every in-scope iOS client app's Xcode project at the time the epic is audited, **When** a developer inspects Target → Build Phases for every target in the project, **Then** no `Crashlytics` Run Script Build Phase (or any Fabric/legacy-Crashlytics-equivalent script phase) is present, and a grep of `project.pbxproj` for `Crashlytics run`, `Fabric.framework`, and `Crashlytics.framework` returns zero matches.
- **Given** every in-scope iOS client app's `Podfile` (for CocoaPods projects) or `Package.swift` / Xcode package dependencies (for SPM projects), **When** a developer searches for `pod 'Fabric'`, `pod 'Crashlytics'`, and any `Fabric`/`Crashlytics` SPM product references, **Then** zero matches are returned AND either `pod 'FirebaseCrashlytics'` (CocoaPods) OR the `FirebaseCrashlytics` SPM product from `https://github.com/firebase/firebase-ios-sdk` is present.
- **Given** every in-scope iOS client app's `AppDelegate` (or `@main App` struct for SwiftUI apps), **When** the developer inspects the entry-point handler (`application(_:didFinishLaunchingWithOptions:)` or the `App.init()` for SwiftUI), **Then** `FirebaseApp.configure()` (Swift) or `[FIRApp configure]` (Objective-C) is the FIRST Firebase initialization call, and no legacy `Fabric.with(...)` or `Crashlytics.start(...)` call remains in the project.
- **Given** every in-scope iOS client app's source tree (Swift, Objective-C, Objective-C++), **When** the developer searches for `import Fabric`, `import Crashlytics`, `@import Fabric;`, and `@import Crashlytics;`, **Then** zero matches are returned and every analogous import resolves to `import Firebase` or `@import Firebase;`.
- **Given** every in-scope iOS client app's bundle AND a release build executed via `xcodebuild -configuration Release` (or Xcode Product → Archive), **When** a developer inspects the bundle and the build log, **Then** `GoogleService-Info.plist` is present at the bundle root (one file per variant) with `BUNDLE_ID` matching the app's `CFBundleIdentifier`, the `Fabric` dictionary key has been removed from `Info.plist`, the build succeeds with no linker errors, the resulting `.app` launches in the simulator without a Fabric-related crash, and the Xcode console emits the Firebase initialization log line.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 5 embedded stories' acceptance criteria are satisfied.
- All 5 epic-level acceptance criteria are satisfied.
- Every in-scope iOS client app (as enumerated by `EPIC-MIG-01`'s readiness report) has had the legacy `Crashlytics` Run Script Build Phase removed from every target in its Xcode project.
- Every in-scope iOS client app's `Podfile` (CocoaPods) or Xcode SPM configuration (SPM) references `FirebaseCrashlytics` and no longer references `pod 'Fabric'`, `pod 'Crashlytics'`, or any equivalent SPM/Carthage Fabric integration.
- Every in-scope iOS client app's `AppDelegate` (or SwiftUI `@main App` struct) calls `FirebaseApp.configure()` as the FIRST Firebase API call inside the launch handler, no legacy `Fabric.with(...)` or `Crashlytics.start(...)` call remains anywhere in the project, and the source tree is free of `import Fabric`, `import Crashlytics`, `@import Fabric;`, and `@import Crashlytics;` references.
- Every in-scope iOS client app's bundle contains `GoogleService-Info.plist` matching the Firebase project provisioned by `EPIC-MIG-02`, with per-variant overrides placed where the project supports multiple bundle identifiers, and `Info.plist` no longer contains the legacy `Fabric` dictionary key.
- A clean iOS release build succeeds via Xcode (Product → Archive) and via `xcodebuild -workspace <App>.xcworkspace -scheme <App> -configuration Release` on every iOS app in scope, with no linker errors and no Fabric-related console errors at launch.
- The migration program documentation records, for every iOS app in scope, the migrated state with a per-app boolean indicating the iOS SDK swap has completed and noting the dependency-manager choice (CocoaPods or SPM) so downstream epics (`EPIC-MIG-06`, `EPIC-MIG-09`) can target the correct integration pathway.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-MIG-01` | Inventory and readiness must identify the iOS apps in scope, enumerate companion targets (macOS, tvOS, watchOS), record dependency-manager choices (CocoaPods, SPM, Carthage), and surface non-standard Fabric integrations (drag-and-drop frameworks, custom Run Script bodies) that require additional handling. Without the readiness report, this epic cannot scope which iOS apps to migrate. |
| `Predecessor` | `EPIC-MIG-02` | The Firebase project and the iOS app binding (bundle identifiers per variant, optional App Store IDs, optional Apple Team IDs) must exist before `GoogleService-Info.plist` can be downloaded for each variant, and Google Analytics for Firebase must be enabled in the project before the optional breadcrumb-log integration in `STORY-MIG-04-S03` can produce breadcrumbs at runtime. |
| `Successor` | `EPIC-MIG-06` | iOS dSYM upload integration (the `${PODS_ROOT}/FirebaseCrashlytics/run` script phase, the Crashlytics SPM upload tooling, or fastlane's `upload_symbols_to_crashlytics` action) depends on Firebase Crashlytics being INSTALLED in the iOS project; this epic produces that installation and `EPIC-MIG-06` configures symbol-upload end-to-end. |
| `Successor` | `EPIC-MIG-09` | iOS test-crash validation (`fatalError("Force Crash")` in Swift, `[[NSException ...] raise]` in Objective-C, cold relaunch, Firebase Console verification within five minutes) requires the Firebase Crashlytics SDK to be installed AND `FirebaseApp.configure()` to have been called at startup — both prerequisites are produced by this epic. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance. Where canonical guidance does not address a specific configuration choice (e.g., committing `GoogleService-Info.plist` to source control), this epic notes the project-level discretion explicitly rather than inferring a single answer.

- [Firebase Crashlytics iOS Migration Guide (`crashlytics-migration-ios`)](https://github.com/FirebaseExtended/crashlytics-migration-ios) — Canonical iOS migration starting point (open the app in Xcode and remove Fabric from project settings) and the explicit first step of removing the `Crashlytics` Run Script Build Phase from the project's Build Phases.
- [Get started with Firebase Crashlytics for Apple platforms](https://firebase.google.com/docs/crashlytics/get-started?platform=ios) — Canonical iOS setup instructions covering CocoaPods and SPM installation, the `FirebaseApp.configure()` initialization call in `AppDelegate`, the placement of `GoogleService-Info.plist` in the app bundle, and the force-crash convention for validating setup.
- [Add Firebase to your Apple project](https://firebase.google.com/docs/ios/setup) — Documents the Firebase iOS SDK installation flow, the requirement that `FirebaseApp.configure()` precede any other Firebase API call, and the per-bundle-identifier configuration model that supports multiple variants.
- [Firebase iOS SDK on GitHub](https://github.com/firebase/firebase-ios-sdk) — Swift Package Manager and CocoaPods installation reference, including the canonical SPM package URL and the list of available products (`FirebaseCrashlytics`, `FirebaseAnalytics`, and others).
- [It's time to upgrade to the new Firebase Crashlytics SDK — Firebase Blog](https://firebase.blog/posts/2020/10/its-time-to-upgrade-to-new-firebase/) — Documents the new SDK's post-app-close upload capability (more real-time crash data than the legacy "upload on next launch" model) and the November 15 legacy Fabric SDK sunset that motivates this migration program.

