# EPIC-PA-01: Crash Capture and On-Device Buffering

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-PA-01` |
| Theme | `Pipeline` |
| Pipeline Stage | `Stage 1 — Capture (upstream boundary)` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `none (predecessor); EPIC-PA-02, EPIC-PA-09 (successors)` |
| Last Updated | `n/a` |

## Description

This epic owns the on-device crash capture layer of the Crashlytics pipeline — the upstream boundary of the inclusive range "from crash capture to dashboard delivery" stated in the user's first requirement bullet. The Crashlytics SDK installs platform-appropriate crash handlers (uncaught-exception hooks, POSIX signal handlers, NDK signal handlers, and ANR detectors) during initialization so that crash data is captured the moment a crash, ANR, or non-fatal error occurs — before any subsequent pipeline stage can possibly observe it. Four crash classes fall within this epic: unhandled exceptions (Java/Kotlin on Android, `NSException` and Swift errors on iOS), NDK native crashes triggered by POSIX signals such as `SIGSEGV`, `SIGABRT`, `SIGBUS`, `SIGFPE`, and `SIGILL`, Application Not Responding (ANR) events on Android, and non-fatal errors logged explicitly by application code via the platform-appropriate `recordError`/`recordException` API. Capture also includes adjacent contextual signals: out-of-memory (OOM) events where the platform exposes them, main-thread vs. background-thread distinction, and crashes that occur on the main and background threads. Captured payloads are persisted to local on-device storage immediately — crashes occurring at app launch are buffered locally before the process terminates — and remain there until the next successful app launch, at which point `EPIC-PA-02` Upload and Transport takes over. On Android 11 and higher, ANR collection uses the `getHistoricalProcessExitReasons` API, which is more reliable than legacy SIGQUIT- or watchdog-based approaches; pre-Android-11 devices have reduced ANR visibility, and this limitation is surfaced explicitly so triage teams can interpret the data correctly.

## Business Value

On-device capture is the foundation of the entire crash reporting pipeline — if a crash is not captured at the moment it happens, no downstream stage (upload, ingest, grouping, dashboard, alerting) can recover it; the entire user-stated range from crash capture to dashboard delivery starts here, which is why this epic is the upstream boundary. Comprehensive crash-class coverage across unhandled exceptions, NDK native crashes, ANRs, and non-fatal errors ensures that mobile developers can triage every stability issue rather than just the fatal subset — latent defects logged via `recordError` are visible before they escalate into user-impacting fatals, and ANRs are visible alongside crashes so main-thread hangs are not invisible to triage. Local persistence until next launch handles the common case where a crash occurs before the device has network connectivity (for example, immediately at app launch, in airplane mode, or in regions with intermittent connectivity), ensuring no crashes are silently dropped due to network outages between user impact and Firebase ingest. Android 11+ ANR reporting via `getHistoricalProcessExitReasons` provides higher-fidelity ANR data than legacy SIGQUIT- or watchdog-based approaches, improving on-call engineer triage speed for hangs and freezes that previously appeared only as user complaints. Capturing non-fatal errors via `recordError`/`recordException` allows mobile developers to instrument application code with caught-but-noteworthy errors for proactive monitoring, so issues like failed offline queue flushes or unexpected null responses are tracked without waiting for them to crash the app. Roles that benefit: mobile end-user (no silent loss of crash reports), mobile developer (every stability class is visible for triage), on-call engineer (ANRs and non-fatals reduce mean-time-to-detect for stability incidents), release manager (the crash-free-users metric is only as trustworthy as the capture layer beneath it), and security/privacy reviewer (capture honors the collection-enabled gate from `EPIC-PA-09` and never persists payloads when collection is disabled).

## In Scope

The following items are included in this epic:

- SDK initialization that installs the platform-specific crash handlers (uncaught-exception handler on the Android JVM; `NSSetUncaughtExceptionHandler` and POSIX signal handlers on Apple platforms; native signal handlers via the Crashlytics NDK component on Android apps containing native code).
- Capture of unhandled exceptions on the main thread and on background threads — including Java/Kotlin `RuntimeException` subclasses on Android, `NSException` on iOS, and Swift errors that propagate to the runtime.
- Capture of NDK native crashes triggered by POSIX signals: `SIGSEGV`, `SIGABRT`, `SIGBUS`, `SIGFPE`, and `SIGILL` — for Android apps that contain native code via the Android NDK.
- Capture of Application Not Responding (ANR) events on Android, using the `getHistoricalProcessExitReasons` API on Android 11+ devices to read OS-recorded ANR records on the next launch.
- Capture of out-of-memory (OOM) events where the platform exposes them (for example, `lowMemory` and `applicationWillTerminate` adjacent signals on iOS, low-memory `onTrimMemory` callbacks and process-exit reasons on Android).
- Capture of non-fatal errors via explicit `FirebaseCrashlytics.getInstance().recordException(throwable)` (Android) / `Crashlytics.crashlytics().record(error:)` (iOS) / `FirebaseCrashlytics.instance.recordError(...)` and `recordFlutterError(...)` (Flutter) / `crashlytics().recordError(err)` (React Native) API calls.
- Local persistence of captured payloads to on-device storage immediately, before the process terminates — using platform-appropriate atomic write primitives so partial writes cannot corrupt the payload.
- Capture of common context attributes alongside the crash itself: app version, OS version, device model, available memory at time of crash, crashing thread name, custom keys set via `setCustomKey(...)`, and breadcrumb log entries (when Google Analytics for Firebase is enabled and `log(...)` calls have been emitted by application code).
- Crash handler robustness: the capture handlers must not themselves crash the app, must not block the OS-level unwind path, and must complete persistence within the brief window the OS allows between the original crash signal and final process termination.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- Background transport of buffered crashes to Firebase servers (silent next-launch upload, post-app-close upload, retry semantics, payload integrity, transport security) — owned by `EPIC-PA-02` Upload and Transport. This epic PRODUCES the locally buffered payloads that `EPIC-PA-02` consumes.
- Mapping file (iOS dSYM, Android ProGuard/R8 mapping, NDK native symbol) lifecycle and upload — owned by `EPIC-PA-03` Symbolication. Symbolication runs server-side over captured payloads; this epic emits the unsymbolicated stack traces and the ABI metadata that `EPIC-PA-03` needs to symbolicate them.
- Server-side ingest endpoint behavior, schema validation, request authentication, and deduplication of captured payloads — owned by `EPIC-PA-04` Ingestion and Validation. This epic ends at the boundary where a payload is durably persisted on the device.
- Opt-in collection mode (`setCrashlyticsCollectionEnabled(false)`), the install-time `firebase_crashlytics_collection_enabled` flag, and PII redaction policy — owned by `EPIC-PA-09` Privacy and Compliance. This epic OBSERVES the collection-enabled state as a gate but does not own the policy or its runtime controls.
- Capture-rate SLOs, capture-side observability, and the error-budget policy governing how much capture loss is tolerable per release — owned by `EPIC-PA-10` Pipeline Reliability and SLOs. This epic emits the capture-side signals from which those SLOs are derived but does not own their targets.

## User Stories

This epic contains 5 user stories. Each story is derived from [`../templates/story-template.md`](../templates/story-template.md) and embedded inline below using H3 headings. Per the catalog's authoring convention (Rule AR-1), stories live INSIDE their parent epic file rather than as separate files, which keeps each epic self-contained and eliminates broken cross-file links during refactors.

### STORY-PA-01-S01: Install crash handlers at SDK initialization

**As a** mobile developer, **I want** the Crashlytics SDK to install platform-appropriate crash handlers as part of its initialization, **so that** any subsequent crash, ANR, or non-fatal error is captured starting from app launch.

#### Acceptance Criteria

- **Given** an Android app with the Firebase Crashlytics SDK integrated, **When** the application process starts and the SDK initializes via the `google-services` plugin's manifest-merged `ContentProvider`, **Then** an uncaught-exception handler is installed on the JVM main thread and applies to any threads spawned thereafter.
- **Given** an iOS app with the Firebase Crashlytics SDK integrated, **When** `FirebaseApp.configure()` is called in `application(_:didFinishLaunchingWithOptions:)`, **Then** `NSSetUncaughtExceptionHandler` and POSIX signal handlers (`SIGSEGV`, `SIGABRT`, etc.) are installed before the application returns from launch.
- **Given** an Android app containing NDK native code, **When** the SDK initializes, **Then** native crash signal handlers are installed via the Crashlytics NDK component so that native crashes are captured alongside JVM crashes.
- **Given** the SDK has been initialized, **When** a developer queries the SDK status, **Then** the SDK reports `crashlytics collection enabled` (or an opt-out state per `EPIC-PA-09`).

#### Notes

- SDK initialization is typically transparent on Android (via the manifest-merged `ContentProvider` installed by the `google-services` plugin) and explicit on iOS (via `FirebaseApp.configure()` in the AppDelegate).
- Handler installation must be idempotent — calling the SDK initialization function twice (for example, due to a race or a mis-wired secondary init path) must not register the handlers twice or produce duplicate crash events.
- Handler installation must complete synchronously during init; deferring handler registration to a background queue would create a window during which early crashes are missed.

---

### STORY-PA-01-S02: Capture unhandled exceptions on main and background threads

**As a** mobile end-user, **I want** the app to record any unhandled exception that terminates a session, **so that** the mobile developer team has the data needed to fix the bug for me and other users.

#### Acceptance Criteria

- **Given** an unhandled `RuntimeException` is thrown on the Android main thread, **When** the process is about to terminate, **Then** the Crashlytics handler is invoked and the exception (with its full stack trace) is recorded to local on-device storage before the process exits.
- **Given** an unhandled exception is thrown on an Android background thread (for example, inside `Executors.newSingleThreadExecutor().submit(...)`), **When** the thread terminates, **Then** the Crashlytics handler captures the exception with the originating thread name attached.
- **Given** an unhandled `NSException` is raised on iOS, **When** the Crashlytics exception handler is invoked, **Then** the exception class, reason, and stack trace are recorded to local on-device storage.
- **Given** a Swift error is thrown via `try!` and propagates to the runtime, **When** the runtime terminates the process, **Then** the Swift error type and underlying `NSError` details are captured.

#### Notes

- Per canonical Crashlytics guidance, Crashlytics catches crashes on the main and background threads; both thread classes must be covered to avoid blind spots in concurrent code.
- The captured payload includes thread state for ALL threads, not just the crashing thread, to support root-cause analysis where a crash on one thread is caused by a state change on another.

---

### STORY-PA-01-S03: Capture NDK native crashes and ANRs

**As a** mobile developer working on Android apps with native code, **I want** the SDK to capture NDK native crashes and Application Not Responding (ANR) events, **so that** native bugs and main-thread hangs are visible alongside Java/Kotlin exceptions.

#### Acceptance Criteria

- **Given** an Android app with NDK native code, **When** the native code triggers a signal such as `SIGSEGV` (segmentation fault) or `SIGABRT` (abort), **Then** the Crashlytics NDK handler captures the native stack trace and the crashing ABI (for example, `arm64-v8a`).
- **Given** an Android app running on Android 11 or higher, **When** the OS records an Application Not Responding (ANR) event via `getHistoricalProcessExitReasons`, **Then** the Crashlytics SDK reads the ANR record on the next launch and persists it for upload.
- **Given** an Android app running on Android 10 or lower, **When** an ANR occurs, **Then** the SDK records reduced-fidelity ANR data (or no ANR data, if the platform does not expose the necessary signals) and the documentation notes this limitation so triage teams interpret the data correctly.
- **Given** a native crash in an APK that ships multiple ABIs, **When** the crash is captured, **Then** the captured payload includes the ABI of the crashing process so that `EPIC-PA-03` Symbolication can apply the correct symbol file.

#### Notes

- Per canonical Firebase troubleshooting guidance, Crashlytics supports ANR reporting for Android apps from devices that run Android 11 and higher; the underlying API `getHistoricalProcessExitReasons` is more reliable than SIGQUIT- or watchdog-based approaches because it reads OS-recorded process-exit records rather than relying on in-process timers that the ANR itself may have starved.
- This API is available only on Android 11+ devices — apps with a significant pre-Android-11 user base have reduced ANR visibility, and this limitation should be surfaced to PMs and on-call engineers so the ANR metric is not misinterpreted as comprehensive across the entire fleet.
- NDK symbol files for every shipped ABI must be uploaded by `EPIC-PA-03` for the captured native stack traces to be human-readable in the dashboard; otherwise the dashboard shows raw addresses.

---

### STORY-PA-01-S04: Capture non-fatal errors via recordError API

**As a** mobile developer, **I want** an API to record non-fatal errors (caught exceptions that the app handled gracefully but that indicate a defect), **so that** I can track latent bugs without waiting for them to escalate to a fatal crash.

#### Acceptance Criteria

- **Given** Android application code, **When** a developer calls `FirebaseCrashlytics.getInstance().recordException(throwable)` from within a `catch` block, **Then** the exception is recorded as a non-fatal event with its stack trace and the thread on which it was caught, and the surrounding process continues running normally.
- **Given** iOS application code, **When** a developer calls `Crashlytics.crashlytics().record(error:)` with an `NSError` instance, **Then** the error is recorded as a non-fatal event and queued for upload on the next session (or sooner under the new SDK's post-app-close upload path, per `EPIC-PA-02`).
- **Given** Flutter application code, **When** a developer calls `FirebaseCrashlytics.instance.recordError(error, stack, fatal: false)`, **Then** the error is recorded as non-fatal with the provided Dart stack trace.
- **Given** React Native application code, **When** a developer calls `crashlytics().recordError(err)`, **Then** the JavaScript error and its stack are recorded as a non-fatal event for upload.

#### Notes

- Non-fatal events do not terminate the process; they are queued in local on-device storage and uploaded on the next session change (or immediately on the new SDK that supports post-app-close upload per `EPIC-PA-02`).
- Each platform's API name differs slightly — Android uses `recordException`, iOS uses `record(error:)`, Flutter uses `recordError` (and the Flutter-specific `recordFlutterError` for `FlutterError` instances), and React Native uses `crashlytics().recordError` — document the canonical name per platform in the SDK setup guides referenced by the migration epics so cross-platform teams use the right name in each codebase.
- Non-fatal events SHOULD be paired with `setCustomKey(...)` calls and `log(...)` breadcrumbs to give triage engineers the contextual data they need; the API itself only carries the exception object.

---

### STORY-PA-01-S05: Persist captured payloads locally until next launch

**As a** mobile end-user, **I want** crash data to be persisted on the device even if the network is unavailable at crash time, **so that** the crash is not silently dropped and the developer team eventually receives the report.

#### Acceptance Criteria

- **Given** a crash occurs immediately at app launch (before any network connectivity is established), **When** the Crashlytics handler is invoked, **Then** the crash payload is written to local on-device storage before the process terminates.
- **Given** a captured crash payload exists in local storage, **When** the device has no network connectivity for an extended period, **Then** the payload remains in local storage for at least the lifetime of the install with no automatic deletion until a successful upload acknowledgment from `EPIC-PA-02`.
- **Given** the app is cold-relaunched, **When** the SDK initializes, **Then** it discovers any pending crash payloads in local storage and hands them off to `EPIC-PA-02` Upload and Transport for delivery.
- **Given** local storage is full or write-restricted (for example, the device is in low-storage mode), **When** the SDK attempts to persist a crash payload, **Then** the SDK degrades gracefully — it does not itself crash, it does not block the OS unwind path beyond the allotted window, and the failure is recorded for diagnostics.

#### Notes

- Per canonical Crashlytics guidance, crash reports are stored locally if the app crashes immediately, and on the next launch they are silently uploaded to Firebase servers; the local persistence layer is therefore the durable buffer that decouples capture (this epic) from upload (`EPIC-PA-02`).
- The local persistence layer uses platform-specific atomic write primitives (for example, `NSFileManager` atomic write on iOS, atomic rename on Android internal storage) so partial writes cannot corrupt the payload — a half-written payload is worse than no payload because it can poison ingest deduplication.
- The on-device buffer footprint is bounded so the SDK does not consume unbounded storage during extended offline periods; the exact bound and eviction policy are owned by the SDK implementation and documented in Firebase guidance.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic.

- **Given** a release-mode build of an Android, iOS, Flutter, Unity, or React Native app with the Firebase Crashlytics SDK integrated, **When** the app launches, **Then** all platform-appropriate crash handlers (uncaught-exception handler, NDK signal handlers, ANR detector where supported) are installed and active before the application returns from launch.
- **Given** any unhandled exception, NDK signal, or Android ANR, **When** the platform's crash mechanism fires, **Then** a payload describing the event is persisted to local on-device storage before the process terminates, with the crashing thread name and full thread state attached.
- **Given** application code that calls the platform-appropriate `recordError`/`recordException` API, **When** the call returns, **Then** a non-fatal event payload is queued in local storage and the surrounding process continues running normally.
- **Given** the app is killed and cold-relaunched, **When** the SDK initializes, **Then** any pending local payloads are handed off to the upload pipeline (`EPIC-PA-02`) and removed from local storage upon successful server acknowledgment, never re-uploaded.
- **Given** the SDK is running with collection disabled per the `EPIC-PA-09` policy (install-time flag or runtime `setCrashlyticsCollectionEnabled(false)` override), **When** a crash occurs, **Then** no payload is persisted to local storage and the privacy gate takes precedence over the capture pathway.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- All 5 embedded stories (`STORY-PA-01-S01` through `STORY-PA-01-S05`) have their acceptance criteria satisfied across the supported platforms (Android, iOS, Flutter, Unity, React Native).
- All 5 epic-level acceptance criteria above are satisfied.
- A force-crash test on each supported platform produces a payload in local on-device storage before the process exits, verifiable via SDK debug logging or by reading the SDK's local crash-store directory in a development build.
- A non-fatal error recorded via the platform-appropriate `recordError`/`recordException` API results in a queued payload visible via SDK debug logging, without interrupting the surrounding application flow.
- ANR detection is verified on at least one Android 11+ device by simulating a main-thread block of 5+ seconds and confirming the ANR record is captured (via `getHistoricalProcessExitReasons`) and persisted on the next launch.
- No SDK-induced crashes occur during 24+ hours of beta testing across the supported platform matrix — the capture handlers themselves never crash the app or block the OS unwind path beyond the allotted window.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph is acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `none` | This epic is the upstream boundary of the pipeline — the user-stated range explicitly begins with crash capture, so no prior pipeline epic precedes it. |
| `Successor` | `EPIC-PA-02` | Upload and Transport consumes the locally persisted payloads produced by this epic; without capture there is nothing to upload, so capture must complete before transport can deliver anything to the server. |
| `Successor` | `EPIC-PA-09` | Privacy and Compliance gates capture behavior via the install-time `firebase_crashlytics_collection_enabled` flag and the runtime `setCrashlyticsCollectionEnabled` override; this epic OBSERVES the collection-enabled state but does not own the policy. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in the following public Firebase or Crashlytics guidance. Inferred content not directly traceable to a public source is flagged inline as `[inferred — no direct source]`.

- [Firebase Crashlytics — Product Overview](https://firebase.google.com/docs/crashlytics) — Documents that Crashlytics is a lightweight, realtime crash reporter that catches crashes on the main and background threads, including unhandled exceptions, native crashes (NDK), non-fatal issues, OOM errors, and ANRs on Android; grounds the Description, In Scope, and `STORY-PA-01-S02` claims.
- [Firebase Crashlytics — Troubleshooting](https://firebase.google.com/docs/crashlytics/troubleshooting) — Documents that Crashlytics supports ANR reporting for Android apps from devices that run Android 11 and higher via the `getHistoricalProcessExitReasons` API, which is more reliable than SIGQUIT- or watchdog-based approaches; grounds `STORY-PA-01-S03`.
- [Firebase Crashlytics — Customize crash reports](https://firebase.google.com/docs/crashlytics/customize-crash-reports) — Documents `recordException` / `record(error:)` / `recordError` non-fatal logging APIs across the supported platforms, plus the `setCustomKey(...)` and `log(...)` breadcrumb APIs; grounds `STORY-PA-01-S04` and the contextual-attributes In Scope item.
- [Crashlytics Pipeline Guide (ReverseBits)](https://reversebits.tech/blog/firebase-crashlytics-guide) — Documents that crash reports are stored locally if the app crashes immediately and on the next launch are silently uploaded to Firebase servers; grounds `STORY-PA-01-S05`.
- [FlutterFire — Crashlytics Plugin Usage](https://firebase.flutter.dev/docs/crashlytics/usage) — Documents `recordFlutterError` and `recordError` semantics in Flutter, plus the opt-in collection mechanics; grounds the Flutter platform claims in `STORY-PA-01-S04`.
- [React Native Firebase — Crashlytics Usage](https://rnfirebase.io/crashlytics/usage) — Documents `crashlytics().recordError(err)` for React Native, including the JavaScript-stack option; grounds the React Native platform claims in `STORY-PA-01-S04`.

