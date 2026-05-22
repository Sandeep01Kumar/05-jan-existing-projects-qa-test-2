# EPIC-PA-02: Upload and Transport

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-PA-02` |
| Theme | `Pipeline` |
| Pipeline Stage | `Stage 2 — Upload and Transport` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-PA-01 (predecessor); EPIC-PA-04 (successor)` |
| Last Updated | `n/a` |

## Description

This epic owns the transport stage of the Crashlytics pipeline — the SDK-side responsibility of moving locally buffered crash payloads produced by `EPIC-PA-01` from the device to Firebase servers reliably, where `EPIC-PA-04` Ingestion and Validation takes over. Per canonical guidance, crash reports are stored locally if the app crashes immediately and on the next launch are silently uploaded to Firebase servers; this is the baseline transport behavior every supported platform implements. The new Firebase Crashlytics SDK additionally introduces post-app-close upload that allows crash data to be received in more real time on Android — a major contributor to the estimated 30% increase in Android crashes captured by the new SDK relative to the legacy Fabric SDK. Transport must be resilient to network outages, intermittent connectivity, and brief Firebase-side outages; the SDK retries failed uploads with exponential backoff and preserves payloads in local storage across retries so a transient failure does not lose crash data. Every outbound upload uses HTTPS with server certificate validation and includes a payload integrity field the server validates, so man-in-the-middle interception or tampering is rejected. Upload behavior also respects the runtime collection-enabled flag from `EPIC-PA-09` — if collection is disabled by an install-time `AndroidManifest.xml` / `Info.plist` flag or a runtime `setCrashlyticsCollectionEnabled(false)` call, no upload is attempted even if payloads remain in local storage.

## Business Value

Reliable transport is the difference between a captured crash and a triaged crash — without upload, a captured payload remains trapped on the device. Post-app-close upload on the new SDK improves the time-to-dashboard metric on Android by uploading within the brief OS-provided background window after process termination rather than waiting for relaunch, reducing the lag between user impact and team awareness. The estimated 30% Android crash capture improvement on the new SDK is largely a transport reliability gain — more aggressive retry, post-close upload, and more graceful handling of transient network errors than the legacy Fabric SDK. Exponential backoff with jitter prevents thundering-herd retry storms when connectivity returns after a widespread outage, protecting both device battery and Firebase's regional ingest capacity from synchronized retry spikes. HTTPS-with-certificate-validation plus payload integrity verification satisfies enterprise security review for crash telemetry pipelines. Roles that benefit: mobile end-user (silent uploads, no UX disruption), on-call engineer (post-close upload reduces detection lag), mobile developer (+30% capture makes triage data more representative), security/privacy reviewer (HTTPS plus integrity is auditable), release manager (reliable transport is the prerequisite for trustworthy crash-free-users metrics).

## In Scope

The following items are included in this epic:

- Silent upload of locally buffered payloads on the next app cold-launch — canonical Crashlytics behavior across every supported platform, with no user-visible prompt or progress indicator.
- Post-app-close upload using the new Firebase Crashlytics SDK on Android — uploading after process termination within the OS-provided background window, with graceful fallback to next-launch upload if the window expires.
- Retry semantics for transient transport failures: exponential backoff with jitter (for example, 30s → 60s → 120s → 240s → …) up to a documented maximum, with payloads preserved in local storage across retries and re-attempted on next launch if the in-session maximum is reached.
- HTTP status-code semantics distinguishing PERMANENT failures (4xx — drop with diagnostic, never retry) from TRANSIENT failures (5xx and network errors — retry with backoff), consistent with the `EPIC-PA-04` ingest contract.
- Payload integrity: end-to-end content-hash or signature field that the server validates upon receipt, rejecting payloads modified in transit.
- Transport security: HTTPS (TLS) with server certificate validation using the platform's standard TLS stack, plus optional Firebase SDK-level certificate pinning to reduce CA-compromise risk.
- Network condition awareness: configurable per-platform deferral of uploads on metered cellular connections using `ConnectivityManager.isActiveNetworkMetered()` on Android and `NWPath.isExpensive` on iOS.
- Local storage hygiene: removal of persisted payloads upon successful acknowledgment, with a documented upper bound on on-device buffer footprint to prevent unbounded growth during extended offline periods.
- Background execution discipline: transport work runs on a background thread or queue so foreground UI responsiveness is unaffected while uploads are in flight.
- Diagnostic logging: an SDK debug logging mode that surfaces transport state (attempted, retried, succeeded, dropped) per Firebase Crashlytics troubleshooting guidance.

## Out of Scope

The following items are explicitly excluded from this epic and are owned by sibling or successor epics:

- On-device crash capture (unhandled exceptions, NDK native crashes, ANRs, non-fatal errors) and local persistence until next launch — owned by `EPIC-PA-01`. This epic CONSUMES the locally buffered payloads capture produced.
- Server-side ingestion endpoint behavior, schema validation, request authentication, deduplication, and acknowledgment semantics — owned by `EPIC-PA-04`. This epic interfaces with the contract but does not own the server-side response logic.
- Mapping file uploads (ProGuard/R8, iOS dSYM, NDK native symbols) — owned by `EPIC-PA-03`. Mapping artifacts are uploaded at BUILD time by CI through a separate Gradle/Xcode pathway, not at RUNTIME by the SDK transport this epic owns.
- User-facing opt-in / opt-out controls, the install-time `firebase_crashlytics_collection_enabled` flag, and the runtime `setCrashlyticsCollectionEnabled` API behavior — owned by `EPIC-PA-09`. This epic OBSERVES the collection-enabled state as a gate but does not own the policy.
- End-to-end pipeline SLOs, error-budget policy, capture-rate and time-to-dashboard metrics — owned by `EPIC-PA-10`. This epic EMITS transport-stage telemetry from which reliability metrics are computed but does not own SLO targets.

## User Stories

This epic contains 5 user stories embedded inline using H3 headings (Rule AR-1). They partition the transport stage into the canonical next-launch upload (`STORY-PA-02-S01`), the new-SDK post-app-close upload (`STORY-PA-02-S02`), retry-and-backoff resilience (`STORY-PA-02-S03`), transport-security and payload-integrity (`STORY-PA-02-S04`), and the metered-network deferral configurable (`STORY-PA-02-S05`). Each story is derived from [`../templates/story-template.md`](../templates/story-template.md).

### STORY-PA-02-S01: Upload buffered crashes silently on next launch

**As a** mobile end-user, **I want** crash data uploaded silently in the background after I relaunch a crashed app, **so that** the developer team receives my crash report without any visible disruption to me.

#### Acceptance Criteria

- **Given** the device has at least one pending crash payload in local storage, **When** the app is cold-launched, **Then** the SDK initiates background upload without prompting the user and without showing any progress indicator.
- **Given** a successful upload, **When** the server returns a 2xx acknowledgment per the `EPIC-PA-04` ingest contract, **Then** the corresponding payload is removed from local on-device storage so it is not re-uploaded on subsequent launches.
- **Given** multiple pending payloads accumulated from prior crashes, **When** the SDK uploads them, **Then** uploads are batched or sequenced to minimize battery and bandwidth impact rather than firing all simultaneously.
- **Given** the app is foregrounded while uploads are in progress, **When** the user interacts with the UI, **Then** UI responsiveness is unaffected because the upload work runs on a background thread or queue.

#### Notes

- Per canonical Crashlytics guidance, on the next launch crash reports are silently uploaded to Firebase servers; this is the baseline behavior every supported platform implements.
- The silent-upload property is critical for non-disruptive UX — no permission prompts, no progress indicators. Any breach of this property would be a regression on user trust.

---

### STORY-PA-02-S02: Upload crashes after app has closed (new SDK capability)

**As a** responding on-call engineer, **I want** crashes to be uploaded after the app has closed rather than only at next launch, **so that** I receive crash data in more real time and can detect emerging issues sooner.

#### Acceptance Criteria

- **Given** an Android device with the new Firebase Crashlytics SDK integrated, **When** the app crashes and the process terminates, **Then** the SDK attempts to upload the crash payload immediately within the brief OS-provided background work window, without waiting for the user to relaunch.
- **Given** the upload-after-close attempt succeeds, **When** the on-call engineer queries the Firebase Console, **Then** the crash appears with substantially reduced lag relative to the legacy "upload only on next launch" model, supporting the documented +30% Android capture improvement.
- **Given** the upload-after-close window expires before completion (for example, due to a slow network), **When** the SDK is unable to finalize the upload in-window, **Then** the payload remains in local storage and is retried on next launch as the graceful fallback.
- **Given** an iOS device or a non-Android platform where post-close upload is not a documented SDK capability, **When** the app crashes, **Then** transport falls back to the next-launch path (`STORY-PA-02-S01`) without any feature regression.

#### Notes

- Per the Firebase Blog migration announcement, the new Firebase Crashlytics SDK can upload crashes after an app has closed, allowing crash data to be received in more real time on Android; this is a NEW capability not present in the legacy Fabric SDK.
- The new SDK is estimated to capture about 30% more Android crashes than the legacy Fabric SDK; transport improvements (post-close upload and more aggressive retry) are a major contributor.

---

### STORY-PA-02-S03: Retry failed uploads with exponential backoff

**As a** mobile developer, **I want** failed crash uploads to be retried automatically with exponential backoff, **so that** transient network errors do not cause permanent loss of crash data and a Firebase-side hiccup does not produce a synchronized retry storm.

#### Acceptance Criteria

- **Given** an upload attempt returns a transient error (HTTP 5xx, network timeout, TCP reset), **When** the SDK schedules the next attempt, **Then** the delay follows an exponential backoff schedule (for example, 30s → 60s → 120s → 240s → …) up to a documented maximum, and the payload is preserved in local storage across attempts.
- **Given** a payload has been retried up to the in-session maximum, **When** the maximum is reached, **Then** the SDK stops retrying within the session, the payload remains in local storage, and retry is deferred to next launch — never silently dropped.
- **Given** a permanent error response (HTTP 4xx from `EPIC-PA-04`'s schema- or authentication-rejection path), **When** the SDK receives the response, **Then** the payload is removed from local storage and a diagnostic is logged, preventing infinite retry against a payload the server will always reject.
- **Given** multiple devices retry simultaneously after a brief Firebase-side outage, **When** the backoff schedule includes jitter, **Then** retry traffic is spread over time across the fleet rather than forming a synchronized thundering herd against the ingest layer.

#### Notes

- Exponential backoff with jitter is a standard distributed-systems pattern; the schedule is documented in Firebase guidance but is not user-configurable — exposing it would let consumers create retry storms that harm shared infrastructure.
- The 4xx-vs-5xx distinction must stay consistent with the `EPIC-PA-04` ingest contract: 4xx is PERMANENT (drop), 5xx is TRANSIENT (retry). Using 4xx transiently would silently discard recoverable payloads; using 5xx permanently would cause infinite retry loops.

---

### STORY-PA-02-S04: Verify payload integrity and transport security

**As a** security/privacy reviewer, **I want** every crash upload to use HTTPS with server certificate validation and to verify payload integrity end-to-end, **so that** crash data cannot be intercepted, modified, or forged in transit and the transport pipeline survives an enterprise security review.

#### Acceptance Criteria

- **Given** any outbound crash upload, **When** the SDK opens a connection to the Firebase ingestion endpoint, **Then** the connection uses HTTPS (TLS) with server certificate validation against the platform's CA trust store, and plaintext HTTP is never used under any condition.
- **Given** a payload is constructed for upload, **When** the SDK transmits it, **Then** the payload includes an integrity field (content hash or signature) that the server validates upon receipt against the transmitted content.
- **Given** a man-in-the-middle attacker attempts to intercept and modify a payload in transit, **When** the server validates it, **Then** the modified payload is rejected with a documented error code per the `EPIC-PA-04` rejection contract, and the SDK logs a diagnostic identifying the integrity failure.
- **Given** the device has an outdated or compromised CA trust store so the TLS handshake fails, **When** the SDK encounters the failure, **Then** it does NOT silently degrade to plaintext HTTP and the payload remains in local storage to retry after the condition is resolved.

#### Notes

- Certificate pinning may be applied at the Firebase SDK level to reduce the blast radius of a CA compromise; the SDK uses the platform's standard TLS stack rather than reimplementing transport security.
- The Firebase ingestion endpoint is hosted on Google infrastructure; specific endpoint URLs are documented in canonical Firebase guidance but are not enumerated here as they may change without notice (`[inferred — no direct source]` for the URL list; HTTPS-with-validation is canonical).

---

### STORY-PA-02-S05: Defer uploads on metered networks (configurable)

**As a** mobile end-user on a limited cellular data plan, **I want** crash uploads to be deferred while I am on a metered network and to upload when I reconnect to unmetered Wi-Fi, **so that** crash reporting does not consume my limited cellular data quota without my consent.

#### Acceptance Criteria

- **Given** an Android device is on a metered cellular connection (`ConnectivityManager.isActiveNetworkMetered()` returns `true`) and platform-aware deferral is enabled, **When** the SDK has a pending payload ready to upload, **Then** the SDK defers the upload until the device transitions to an unmetered network.
- **Given** the device is on an unmetered Wi-Fi connection (or an iOS device reports `NWPath.isExpensive` as `false`), **When** the SDK initiates an upload, **Then** the upload proceeds immediately without deferral.
- **Given** the metered-network deferral has been overridden by a runtime "always upload" flag in SDK configuration, **When** the flag is set, **Then** uploads proceed regardless of metered status — the deferral is a default, not an absolute lock.
- **Given** a pending payload remains undelivered after extended metered conditions, **When** the SDK reaches a documented deferral timeout (or the process is killed by the OS), **Then** the payload remains in local storage and is retried on next launch (per `STORY-PA-02-S01`) so deferral never causes permanent data loss.

#### Notes

- Metered-network detection uses each platform's native API; neither perfectly reflects the user's actual data plan or roaming status, so deferral is best-effort, not a guarantee.
- This is intentionally a CONFIGURABLE capability rather than a default — defaults differ across platforms and Firebase guidance versions. Teams in regions with limited cellular plans may enable it; teams in regions with widespread unlimited data may leave it off.

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories (Rule AR-4).

- **Given** a device with pending crash payloads in local storage, **When** the app is cold-launched, **Then** the SDK uploads the payloads silently and removes them from local storage upon successful server acknowledgment, with no user-visible prompt or progress indicator.
- **Given** an Android device with the new Firebase Crashlytics SDK, **When** the app crashes and the process terminates, **Then** the SDK attempts post-close upload within the OS-provided background window and falls back gracefully to next-launch upload if the window is insufficient — preserving crash data either way.
- **Given** any transient transport failure (5xx, network timeout, TCP reset), **When** the SDK schedules retries, **Then** retries follow exponential backoff with jitter, stop at a documented in-session maximum, and defer to next launch without dropping the payload; permanent failures (4xx) drop the payload immediately with a diagnostic and do not retry.
- **Given** any outbound upload, **When** the network connection is established, **Then** HTTPS with server certificate validation is used, payload integrity is verified server-side, and the SDK never silently degrades to plaintext HTTP.
- **Given** Crashlytics collection is disabled per the `EPIC-PA-09` policy (install-time flag or runtime override), **When** the SDK initializes, **Then** no upload is attempted even if payloads are present in local storage — the privacy gate takes precedence over transport.

## Definition of Done

The epic is complete when ALL of the following observable conditions are simultaneously true:

- All 5 embedded stories (`STORY-PA-02-S01` through `STORY-PA-02-S05`) have their acceptance criteria satisfied across the supported platforms.
- All 5 epic-level acceptance criteria above are satisfied.
- A force-crash on each supported platform (Android, iOS, Flutter, Unity, React Native) is uploaded on next launch within a documented latency target and appears in the Firebase Console.
- At least one observed post-close upload from an Android device on the new Firebase Crashlytics SDK is verified end-to-end in the Firebase Console (the crash arrives before any user-initiated relaunch).
- Exponential backoff with jitter is verified by simulating transient errors (for example, via a proxy returning HTTP 503) and observing that the retry schedule matches the documented progression and that retries spread rather than synchronize.
- Transport security is verified by attempting a man-in-the-middle proxy with an untrusted certificate and observing TLS handshake failure plus the SDK's refusal to fall back to plaintext HTTP.
- Local storage growth is bounded: payloads are deleted upon successful acknowledgment, the maximum on-device buffer footprint is documented, and a long-offline simulation does not exceed the documented bound.
- The collection-enabled gate from `EPIC-PA-09` is verified by toggling `setCrashlyticsCollectionEnabled(false)` and confirming no transport occurs while pending payloads remain in local storage.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph remains acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-PA-01` | Upload consumes the locally buffered payloads produced by capture; without capture there is nothing to upload, so capture must complete before transport can deliver anything to the server. |
| `Successor` | `EPIC-PA-04` | Server-side ingestion validates and acknowledges the payloads delivered by transport; the SDK depends on `EPIC-PA-04`'s acknowledgment contract (2xx → delete locally, 4xx → drop, 5xx → retry) to know what to do after each upload attempt. |

## References

Per Rule AR-5 (Source Grounding), this epic is grounded in public Firebase or Crashlytics guidance. Inferred content not directly traceable to a public source is flagged inline as `[inferred — no direct source]`.

- [Firebase Crashlytics — Product Overview](https://firebase.google.com/docs/crashlytics) — Documents Crashlytics as a real-time crash reporter; grounds the transport stage's role within the canonical pipeline.
- [Firebase Blog — It's time to upgrade to the new Firebase Crashlytics SDK](https://firebase.blog/posts/2020/10/its-time-to-upgrade-to-new-firebase/) — Documents that the new SDK can upload crashes after an app has closed (allowing crash data to be received in more real time on Android) and is estimated to capture about 30% more Android crashes than the legacy Fabric SDK; grounds `STORY-PA-02-S02`.
- [Crashlytics Pipeline Guide (ReverseBits)](https://reversebits.tech/blog/firebase-crashlytics-guide) — Documents that crash reports are stored locally if the app crashes immediately and on the next launch are silently uploaded to Firebase servers; grounds `STORY-PA-02-S01`.
- [Firebase Crashlytics — Troubleshooting](https://firebase.google.com/docs/crashlytics/troubleshooting) — Describes how to enable SDK debug logging to surface transport state; grounds the in-scope "Diagnostic logging" item.
