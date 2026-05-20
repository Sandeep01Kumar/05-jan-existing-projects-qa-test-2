# EPIC-MIG-05: Cross-Platform SDK Migration

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-MIG-05` |
| Theme | `Migration` |
| Phase | `Phase 2 — Platform SDK Swaps` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-MIG-01, EPIC-MIG-02 (predecessors); EPIC-MIG-06, EPIC-MIG-09 (successors)` |
| Last Updated | `n/a` |

## Description

This epic migrates every in-scope cross-platform client app — Flutter (Dart VM), Unity (C# / IL2CPP), and React Native (JavaScript bridge) — from the legacy Fabric Crashlytics SDK to the new Firebase Crashlytics SDK by adopting the framework-appropriate Crashlytics integration package and wiring framework-appropriate error handlers. Per the canonical Firebase product page, Firebase Crashlytics is available for Apple, Android, Flutter, and Unity as first-class integrations; React Native is covered by the third-party `@react-native-firebase` library that wraps the same underlying native SDKs. The epic covers FlutterFire `firebase_crashlytics` adoption (with `Firebase.initializeApp()` and `FlutterError.onError` binding), Firebase Unity SDK Crashlytics package import (with initialization in an early `MonoBehaviour.Awake()`), and `@react-native-firebase/crashlytics` adoption via React Native autolinking (with `ErrorUtils.setGlobalHandler(...)` forwarding to `crashlytics().recordError(err)`). The epic stops at framework SDK adoption and basic initialization smoke-testing; symbol/source-map upload (`EPIC-MIG-06`), Answers-to-Analytics translation (`EPIC-MIG-07`), and full force-crash validation (`EPIC-MIG-09`) are owned by successor epics so each phase remains independently auditable.

## Business Value

Cross-platform apps require explicit per-framework SDK installation because each framework's runtime model differs materially from native — Flutter runs Dart in the Dart VM with isolate-based error propagation, Unity runs C# in the Mono or IL2CPP runtime with game-loop-driven exception flow, and React Native runs JavaScript in the JS bridge with native modules autolinked into the host platform. The new Firebase Crashlytics SDK can upload crashes after the app has closed (versus the legacy "upload on next launch" model) and is estimated to capture about 30% more Android crashes than the legacy Fabric SDK; both improvements flow transparently to Flutter, Unity, and React Native apps once the framework-appropriate Firebase Crashlytics package is installed. Roles that benefit include mobile developers (consistent Crashlytics surface across client frameworks), on-call engineers (uniform issue cards with breadcrumb logs regardless of originating framework), release managers (continuity of crash signal across every cross-platform app at the legacy-SDK sunset), data analysts (cross-platform crash events in the same BigQuery export per `EPIC-PA-06`), and the migration program lead (an auditable per-app SDK swap closing out cross-platform scope alongside `EPIC-MIG-03` and `EPIC-MIG-04`).

## In Scope

The following items are included in this epic:

- Verification that every cross-platform app is on a Firebase-supported framework version — Flutter (a Dart SDK version compatible with the published `firebase_crashlytics` plugin), Unity (an Editor version compatible with the published Firebase Unity SDK), and React Native (a version compatible with the published `@react-native-firebase/app` and `@react-native-firebase/crashlytics` versions) — sourced from `EPIC-MIG-01`'s readiness report.
- Adoption of the FlutterFire `firebase_crashlytics` plugin (alongside `firebase_core`) in `pubspec.yaml`, with `flutter pub get` resolving cleanly and the dependency surface recorded in `pubspec.lock`.
- Adoption of the Firebase Unity SDK's Crashlytics package via the Unity Package Manager (preferred for Editor versions that support `manifest.json` package management) or via legacy `.unitypackage` import.
- Adoption of `@react-native-firebase/app` and `@react-native-firebase/crashlytics` in `package.json`, with React Native autolinking discovering the packages during the next `pod install` (iOS) and Gradle sync (Android).
- Installation of the FlutterFire global error handler (`FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterError`) and routing of uncaught Dart isolate exceptions via `runZonedGuarded` or `PlatformDispatcher.instance.onError` to `FirebaseCrashlytics.instance.recordError(error, stack, fatal: true)`.
- Installation of the Unity exception handler via the Firebase Unity SDK's Crashlytics API in an early-running `MonoBehaviour.Awake()` or a script-execution-order-controlled bootstrapping entry point.
- Installation of the React Native global error handler — `ErrorUtils.setGlobalHandler(...)` configured to forward to `firebase().crashlytics().recordError(...)` — in the app's entry point (`index.js` or `App.tsx`).
- Initialization smoke-testing on at least one representative Android device (or emulator) and one representative iOS device (or simulator) per cross-platform app, confirming that Firebase initializes successfully and no framework-specific or native crash occurs during the app's first launch with the new SDK in place.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- Native Android SDK migration (Maven repository cleanup, Gradle plugin swap, Firebase Android BoM adoption, `google-services.json` placement) — owned by `EPIC-MIG-03`. The Android build-system cleanup performed there applies to the underlying Android host of each cross-platform app, but the cross-platform plugin wiring on top is this epic's responsibility.
- Native iOS SDK migration (Xcode Build Phases cleanup, CocoaPods/SPM swap, `AppDelegate` initialization changes, `GoogleService-Info.plist` placement) — owned by `EPIC-MIG-04`.
- Symbol and mapping upload — Flutter Dart source maps from `--obfuscate --split-debug-info` builds, Unity IL2CPP symbol files, React Native source maps from the Metro bundler, and underlying NDK native symbols — owned by `EPIC-MIG-06`. The Crashlytics packages are INSTALLED here, but the symbol-upload cutover is `EPIC-MIG-06`'s responsibility.
- Translation of Fabric Answers events to Google Analytics for Firebase predefined or custom events across Dart, C#, and JavaScript codebases — owned by `EPIC-MIG-07`.
- Test-crash validation per framework (`FirebaseCrashlytics.instance.crash()` from Flutter, the Firebase Unity test-crash API, `crashlytics().crash()` from React Native), cold relaunch, Firebase Console verification within five minutes, and the dual-running validation window — owned by `EPIC-MIG-09`.
- Provisioning of the Firebase project, linking cross-platform app bundle identifiers, configuring IAM access, and enabling Google Analytics for Firebase — owned by `EPIC-MIG-02`. This epic CONSUMES the resulting `google-services.json` and `GoogleService-Info.plist` via the underlying native hosts but does not produce them.
- Inventory of Fabric usage across cross-platform apps and per-framework version-compatibility verification — owned by `EPIC-MIG-01`.
- Final removal of all remaining `fabric.io` references in CI scripts, README files, fastlane configurations, and per-framework community Fabric package references (the legacy `fabric_crashlytics` Flutter package, legacy Unity Fabric `.unitypackage` artifacts, the legacy `react-native-fabric` npm package) — owned by `EPIC-MIG-10`.

## User Stories

This epic contains 4 user stories. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings (Rule AR-1). Stories live INSIDE their parent epic file to keep each epic self-contained and eliminate broken cross-file links during refactors.

### STORY-MIG-05-S01: Adopt FlutterFire firebase_crashlytics plugin for Flutter apps

**As a** mobile developer working on Flutter apps, **I want** the FlutterFire `firebase_crashlytics` plugin added to `pubspec.yaml` and initialized at app startup with the FlutterFire error handler bound to Flutter's framework error callback, **so that** Flutter apps report Dart errors and underlying native crashes to Firebase Crashlytics through a single, framework-idiomatic surface.

#### Acceptance Criteria

- **Given** a Flutter app's `pubspec.yaml`, **When** a developer adds the `firebase_crashlytics` and `firebase_core` packages under `dependencies` (at versions documented as compatible in the FlutterFire monorepo's published plugin matrix) and runs `flutter pub get`, **Then** the dependency resolves successfully without version conflicts and the resolved versions are recorded in `pubspec.lock`.
- **Given** the Flutter app's `main.dart`, **When** the developer adds `WidgetsFlutterBinding.ensureInitialized()` followed by `await Firebase.initializeApp()` as the first statements of `main()` before `runApp(...)`, **Then** the app launches in debug, profile, and release modes without an initialization-order assertion failure and Crashlytics is available to all downstream code paths.
- **Given** a `FlutterError` is dispatched by the Flutter framework (for example, a layout assertion or a build-method exception), **When** the FlutterFire error handler bound via `FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterError` is invoked, **Then** the error is forwarded to Firebase Crashlytics with the framework's error details (including the widget tree path where available) preserved.
- **Given** an uncaught Dart isolate exception that does NOT pass through `FlutterError.onError` (for example, an async `Future` failure outside a `try/catch`), **When** the developer routes the failure via `runZonedGuarded(() => runApp(...), (error, stack) => FirebaseCrashlytics.instance.recordError(error, stack, fatal: true))` OR registers `PlatformDispatcher.instance.onError`, **Then** the exception is forwarded to `FirebaseCrashlytics.instance.recordError(...)` and the Dart stack trace is preserved.

#### Notes

- FlutterFire provides two complementary entry points: `recordFlutterError` is purpose-built for `FlutterError` instances (preserving framework-level error metadata) while `recordError` is the general-purpose entry point for arbitrary Dart `Object` errors. Most Flutter apps install BOTH handlers because `FlutterError` and uncaught isolate exceptions are disjoint error sources. The `firebase_crashlytics` plugin is part of the FlutterFire monorepo and shares its release cadence with `firebase_core`; adopt versions from the same FlutterFire release to avoid the "host-app and plugin disagree on `firebase_core` version" runtime error when versions drift.

---

### STORY-MIG-05-S02: Adopt Firebase Unity SDK for Unity apps

**As a** mobile developer working on Unity-based apps and games, **I want** the Firebase Unity SDK's Crashlytics package imported and initialized in the Unity project with the runtime unhandled-exception path routed through the Firebase Unity API, **so that** Unity apps and games report C# exceptions and underlying native crashes to Firebase Crashlytics across both Android and iOS export targets.

#### Acceptance Criteria

- **Given** a Unity project, **When** the developer imports the Firebase Unity SDK's Crashlytics package (`FirebaseCrashlytics.unitypackage` via Assets → Import Package → Custom Package, OR by adding the Firebase package under `Packages/manifest.json` for Unity Editor versions that support Unity Package Manager-based Firebase integration), **Then** the import completes without Unity Editor console errors and the Firebase assemblies appear under `Assets/Firebase/` (legacy `.unitypackage` path) or under `Packages/com.google.firebase.crashlytics/` (UPM path).
- **Given** the Unity project, **When** the developer initializes Firebase via `Firebase.FirebaseApp.CheckAndFixDependenciesAsync()` followed by Crashlytics initialization in an early-running `MonoBehaviour.Awake()` (or via a script-execution-order-controlled bootstrapping component placed in the first scene), **Then** Crashlytics is initialized before any game logic runs and the Firebase initialization log line appears in the Unity Editor Console (Play mode) or in the device logs (on-device builds).
- **Given** an unhandled C# exception is thrown during gameplay (for example, from a `MonoBehaviour.Update()` callback or an async game-loop task), **When** the Unity runtime's exception handler is invoked, **Then** the exception is forwarded to Firebase Crashlytics via the Firebase Unity API with the C# stack trace preserved (including managed and IL2CPP-transpiled frames where applicable).
- **Given** the Unity project's Player Settings target both Android and iOS export targets, **When** the app is exported (File → Build Settings → Build) and the resulting native projects are built (`./gradlew assembleRelease` for Android, `xcodebuild` for iOS), **Then** Crashlytics initialization works on both targets without target-specific manual configuration beyond the standard Firebase Unity SDK setup steps.

#### Notes

- The Firebase Unity SDK's Crashlytics package transparently uses the underlying Android and iOS native Firebase Crashlytics SDKs at runtime, so Unity apps automatically inherit the same crash-capture, transport, and post-app-close upload behavior as native apps once the package is installed and the underlying native hosts have been cleaned up by `EPIC-MIG-03` and `EPIC-MIG-04`. Unity IL2CPP builds produce native binaries for both Android (`libil2cpp.so` per ABI) and iOS (the IL2CPP-transpiled Objective-C++ static library); NDK and IL2CPP symbol files require separate upload, owned by `EPIC-MIG-06`. Until that epic completes, Unity crash reports may appear with obfuscated or address-only frames in the Firebase Console.

---

### STORY-MIG-05-S03: Adopt @react-native-firebase/crashlytics with autolinking

**As a** mobile developer working on React Native apps, **I want** `@react-native-firebase/app` and `@react-native-firebase/crashlytics` installed with React Native autolinking and the React Native global error handler configured to forward JavaScript exceptions to Crashlytics, **so that** React Native apps report JavaScript errors and native crashes to Firebase Crashlytics without manual native-module wiring beyond the autolinking-required steps.

#### Acceptance Criteria

- **Given** a React Native app's `package.json`, **When** the developer runs `npm install @react-native-firebase/app @react-native-firebase/crashlytics` (or the equivalent `yarn add` / `pnpm add` invocation) and re-runs `pod install` in the `ios/` directory and re-syncs Gradle for the `android/` directory, **Then** the packages install successfully, autolinking metadata is generated, and the React Native CLI's `npx react-native config` output lists both packages as autolinked.
- **Given** a release-mode Android build (`./gradlew assembleRelease`) or iOS build (`xcodebuild -configuration Release`) after autolinking has been applied, **When** the app launches on a device, **Then** Firebase initializes via the autolinked native modules without requiring manual `MainApplication.java`, `MainApplication.kt`, or `AppDelegate.m`/`.mm` modifications beyond the autolinking-required setup (which typically reduces to ensuring `google-services.json` is present in `android/app/` and `GoogleService-Info.plist` is present in `ios/<App>/`).
- **Given** a JavaScript runtime error in a screen component (for example, an exception thrown inside a React component's render path or an `async` action thunk), **When** the developer calls `import crashlytics from '@react-native-firebase/crashlytics';` and then `crashlytics().recordError(err)` from an error boundary or async error handler, **Then** the error is forwarded to Firebase Crashlytics with the JavaScript stack trace and the resulting issue appears in the Firebase Console grouped by the JS stack trace fingerprint.
- **Given** the React Native `ErrorUtils.setGlobalHandler((error, isFatal) => { crashlytics().recordError(error); originalHandler(error, isFatal); })` global handler is configured in the app's entry point (`index.js` or `App.tsx`), **When** an unhandled JavaScript exception occurs anywhere in the JS thread, **Then** the handler forwards the error to `crashlytics().recordError(...)` BEFORE delegating to the original handler so the platform's default crash-handling path remains intact and the error is captured exactly once.

#### Notes

- React Native Firebase Crashlytics surfaces JavaScript stack traces directly in Firebase Console issue cards alongside native frames; native crashes originating in the host platform (Java/Kotlin on Android, Objective-C/Swift on iOS) continue to be handled by the underlying native Firebase Crashlytics SDK as configured by `EPIC-MIG-03` and `EPIC-MIG-04`. The NDK option for Android React Native apps is exposed via `@react-native-firebase/crashlytics`'s native module configuration (typically a Gradle property or a `react-native-firebase.json` flag); NDK symbol upload is owned by `EPIC-MIG-06`. React Native autolinking is available from React Native 0.60+; older versions require manual `react-native link` invocation, flagged as risk `R-MIG-RN-LINK` by `EPIC-MIG-01`.

---

### STORY-MIG-05-S04: Validate each cross-platform app launches and initializes Firebase Crashlytics

**As a** release manager, **I want** to verify that every cross-platform app launches successfully with Firebase Crashlytics initialized on at least one representative Android device and one representative iOS device, **so that** any framework-specific or platform-specific integration issue is detected during this epic's smoke test before the full force-crash validation runs in `EPIC-MIG-09`.

#### Acceptance Criteria

- **Given** a Flutter release build (`flutter build apk --release` and `flutter build ipa --release`) installed on an Android device (or emulator) and an iOS device (or simulator), **When** the app launches and the developer inspects `adb logcat` (Android) or the Console app / Xcode Devices and Simulators window (iOS), **Then** the Firebase initialization log line is emitted (typically including `FirebaseApp initialization successful` or the platform-specific Firebase Core log line) and no Dart or native crash occurs during initialization.
- **Given** a Unity release build (exported via File → Build Settings → Build for Android and Build for iOS, then built with `./gradlew assembleRelease` and `xcodebuild` respectively) installed on representative Android and iOS test devices, **When** the app launches and the developer inspects the device console (`adb logcat` for Android, Xcode device logs for iOS), **Then** the Firebase initialization log line is emitted in the device logs and no managed C# exception or native crash is thrown during the bootstrap scene's `Awake()` phase.
- **Given** a React Native release build (`./gradlew assembleRelease` for Android, `xcodebuild -configuration Release` for iOS) installed on representative Android and iOS test devices, **When** the app launches and the developer inspects `adb logcat` (Android) or `Console.app` / Xcode device logs (iOS), **Then** the Firebase initialization log line is emitted from the autolinked native modules and no JavaScript-bridge error or native module-resolution error appears in the logs.
- **Given** any cross-platform app for which the framework-specific Firebase initialization log line is missing on either Android or iOS, **When** the release manager investigates, **Then** the root cause is identified (commonly: missing `google-services.json` in `android/app/` for Android, missing `GoogleService-Info.plist` in the iOS target's Copy Bundle Resources Build Phase, an incorrect bundle ID-to-Firebase-app binding from `EPIC-MIG-02`, or a per-framework configuration step omitted from this epic), documented against the app's readiness entry, and remediated before the app is signed off as ready for `EPIC-MIG-09`.

#### Notes

- This story is intentionally a SMOKE TEST rather than a full end-to-end test — it verifies that initialization succeeds and no integration-error crash occurs at launch, but it does NOT force a crash and confirm dashboard receipt (owned by `EPIC-MIG-09`). Smoke-testing here surfaces integration defects (typos in package names, missing configuration files, autolinking failures) that would otherwise pollute the `EPIC-MIG-09` test-crash validation results. For projects whose CI runs an instrumented "smoke launch" job per build (for example, a Firebase Test Lab Robo run or a Detox `device.launchApp()` invocation), this story's acceptance criteria can be satisfied automatically by extending the existing job to assert presence of the Firebase initialization log line in the captured device logs.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic (Rule AR-4). They satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically to the pipeline theme for catalog uniformity.

- **Given** every in-scope Flutter app's `pubspec.yaml` and `main.dart` at the time the epic is audited, **When** a developer runs `flutter pub get` followed by `flutter run` (or `flutter build apk --release` / `flutter build ipa --release`), **Then** `firebase_core` and `firebase_crashlytics` are declared dependencies that resolve cleanly, `Firebase.initializeApp()` is called before `runApp(...)`, `FlutterError.onError` is bound to `FirebaseCrashlytics.instance.recordFlutterError`, and uncaught Dart isolate exceptions are routed via `runZonedGuarded` or `PlatformDispatcher.instance.onError` to `FirebaseCrashlytics.instance.recordError`.
- **Given** every in-scope Unity app's project at the time the epic is audited, **When** a developer builds the project for the Android and iOS export targets via Unity's Build Settings and the resulting native projects via `./gradlew assembleRelease` and `xcodebuild`, **Then** the Firebase Unity SDK's Crashlytics package is imported, Crashlytics is initialized in an early `MonoBehaviour.Awake()` or equivalent bootstrapping component, the Unity runtime's unhandled-exception path forwards to the Firebase Unity API, and both export targets produce release builds that include the Firebase Crashlytics native binaries.
- **Given** every in-scope React Native app's `package.json` and entry point at the time the epic is audited, **When** a developer runs `npm install` followed by `pod install` (iOS) and a Gradle sync (Android) and rebuilds, **Then** `@react-native-firebase/app` and `@react-native-firebase/crashlytics` are declared dependencies that autolink to native modules without manual wiring, the `ErrorUtils.setGlobalHandler(...)` global JS error handler forwards to `crashlytics().recordError(...)`, and the app initializes Firebase via the autolinked native modules at launch.
- **Given** any cross-platform app initialization fails on Android or iOS during the smoke test, **When** the release manager triages the failure, **Then** the root cause is documented against the app's readiness entry (commonly: missing platform-specific Firebase configuration file, incorrect bundle ID binding from `EPIC-MIG-02`, framework version incompatibility flagged but not blocked by `EPIC-MIG-01`, or an autolinking failure on legacy React Native versions) and resolved before the app proceeds to `EPIC-MIG-09` validation.
- **Given** all 4 embedded stories' acceptance criteria are satisfied for every cross-platform app in scope, **When** the migration program lead audits the epic against the readiness report from `EPIC-MIG-01`, **Then** every cross-platform app is marked ready for the symbol- and source-map-upload cutover in `EPIC-MIG-06` and the test-crash validation in `EPIC-MIG-09`, with the per-app framework-choice recorded so downstream epics target the correct integration pathway.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 4 embedded stories' acceptance criteria are satisfied for every cross-platform app in scope.
- All 5 epic-level acceptance criteria are satisfied.
- Every in-scope Flutter app has `firebase_crashlytics` and `firebase_core` declared in `pubspec.yaml` at coordinated FlutterFire-monorepo versions, with `pubspec.lock` recording resolved versions and `flutter pub get` completing cleanly.
- Every in-scope Unity app has the Firebase Unity SDK's Crashlytics package imported (either as a `.unitypackage` under `Assets/Firebase/` or via Unity Package Manager under `Packages/`), with Firebase initialization wired into an early `MonoBehaviour.Awake()` (or equivalent bootstrapping component) before any game logic runs.
- Every in-scope React Native app has `@react-native-firebase/app` and `@react-native-firebase/crashlytics` declared in `package.json` with autolinking confirmed (`npx react-native config` lists both packages as autolinked) and no manual native-module wiring beyond the autolinking-required setup steps.
- Each cross-platform app's framework-appropriate error-handler hook is registered: Flutter's `FlutterError.onError` is bound to `FirebaseCrashlytics.instance.recordFlutterError`, Flutter's `PlatformDispatcher.instance.onError` (or `runZonedGuarded`) forwards uncaught isolate exceptions to `FirebaseCrashlytics.instance.recordError`, Unity's unhandled-exception path forwards through the Firebase Unity API, and React Native's `ErrorUtils.setGlobalHandler` forwards to `crashlytics().recordError`.
- Each cross-platform app launches successfully on at least one representative Android device (or emulator) and one representative iOS device (or simulator), emitting the framework-appropriate Firebase initialization log line and producing no framework-specific or native crash during initialization.
- The migration program documentation records, for every cross-platform app in scope, the migrated state with a per-app boolean indicating the cross-platform SDK swap has completed and the chosen framework (Flutter, Unity, or React Native) so downstream epics (`EPIC-MIG-06`, `EPIC-MIG-09`) can target the correct integration pathway.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-MIG-01` | Inventory and readiness must identify which cross-platform frameworks each app uses (Flutter, Unity, React Native, or a combination), enumerate framework-version compatibility against the published FlutterFire / Firebase Unity SDK / `@react-native-firebase` version matrices, and surface non-standard cross-platform Fabric integrations (community plugin shims, custom Unity Fabric packages, the legacy `react-native-fabric` npm package) that require additional handling. |
| `Predecessor` | `EPIC-MIG-02` | The Firebase project and the per-platform app binding (Android `applicationId`, iOS bundle ID, optional Web App ID for Flutter Web targets) must exist before cross-platform SDKs can be initialized, and the resulting `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) files must be available for the underlying native hosts that each cross-platform framework delegates to at runtime. |
| `Successor` | `EPIC-MIG-06` | Symbol and mapping upload covers per-framework artifacts produced ONLY after the cross-platform Crashlytics package is installed: Flutter Dart source maps (`app.android-*.symbols`, `app.ios-*.symbols` from `--obfuscate --split-debug-info` builds), Unity IL2CPP symbol files per ABI, and React Native source maps (Metro bundler output). |
| `Successor` | `EPIC-MIG-09` | Cross-platform test-crash validation (`FirebaseCrashlytics.instance.crash()` from Flutter, the Firebase Unity test-crash API, `crashlytics().crash()` from React Native, cold relaunch, Firebase Console verification within five minutes) requires the framework Crashlytics package to be installed AND Firebase initialization to have succeeded at startup — both prerequisites are produced by this epic. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance. Where canonical guidance varies across framework versions (for example, the `runZonedGuarded` vs. `PlatformDispatcher.instance.onError` Dart error-routing patterns), this epic notes both supported approaches rather than prescribing a single answer.

- [Firebase Crashlytics Product Page](https://firebase.google.com/products/crashlytics) — Documents that Firebase Crashlytics is a real-time crash reporter available for Apple, Android, Flutter, and Unity as first-class integrations, grounding the per-framework scope of this epic.
- [FlutterFire — Crashlytics Plugin Documentation](https://firebase.flutter.dev/docs/crashlytics/usage) — Canonical FlutterFire reference documenting `Firebase.initializeApp()`, `FirebaseCrashlytics.instance.recordFlutterError`, `FirebaseCrashlytics.instance.recordError`, the `runZonedGuarded` and `PlatformDispatcher.instance.onError` Dart error-routing patterns, opt-in collection, and the `setCrashlyticsCollectionEnabled` API.
- [React Native Firebase — Crashlytics Documentation](https://rnfirebase.io/crashlytics/usage) — Canonical `@react-native-firebase/crashlytics` reference documenting `crashlytics().recordError(...)`, the JavaScript stack-trace surface in Firebase Console issue cards, the NDK option for Android, and the `ErrorUtils.setGlobalHandler(...)` integration pattern.
- [Add Firebase to your Unity project](https://firebase.google.com/docs/unity/setup) — Canonical Firebase Unity SDK setup reference documenting the `.unitypackage` import path, the Unity Package Manager-based integration path, and the `Firebase.FirebaseApp.CheckAndFixDependenciesAsync()` initialization sequence consumed by Firebase Crashlytics for Unity.
- [Migrating from Fabric to Firebase Crashlytics on Flutter](https://rechor.medium.com/migrating-from-fabric-to-firebase-crashlytics-on-flutter) — Practical Flutter migration walkthrough that documents the FlutterFire plugin adoption path, version-compatibility considerations, and the `FlutterError.onError` binding pattern.
- [It's time to upgrade to the new Firebase Crashlytics SDK — Firebase Blog](https://firebase.blog/posts/2020/10/its-time-to-upgrade-to-new-firebase-crashlytics) — Documents the new SDK's post-app-close upload capability and the ~30% additional Android crash capture rate that flow transparently to Flutter, Unity, and React Native apps.
