# EPIC-PA-04: Server-Side Ingestion and Validation

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-PA-04` |
| Theme | `Pipeline` |
| Pipeline Stage | `Stage 4 — Server-Side Ingestion` |
| Status | `Proposed` |
| Owner | `<Owner placeholder>` |
| Related Epics | `EPIC-PA-02, EPIC-PA-03 (predecessors); EPIC-PA-05 (successor)` |
| Last Updated | `n/a` |

## Description

This epic owns the server-side ingestion stage of the Crashlytics pipeline — the boundary where uploaded payloads from `EPIC-PA-02` Transport are received, validated, authenticated, and deduplicated before being passed to `EPIC-PA-05` Issue Grouping. The ingest endpoints are LOGICAL constructs operated by Firebase infrastructure; this epic documents the consumer-facing CONTRACT (HTTP status codes, acknowledgment bodies, guaranteed behaviors) rather than the internal implementation. Schema validation rejects malformed payloads (missing fields, incorrect types, oversized, unparseable) with clear error codes so SDK telemetry surfaces integration regressions before silent data loss corrupts downstream metrics. Request authentication verifies every payload originates from a Firebase-registered app via credentials embedded in `google-services.json` (Android) or `GoogleService-Info.plist` (iOS), preventing anonymous spoofing into another organization's project. Deduplication eliminates redundant payloads produced by `EPIC-PA-02`'s at-least-once delivery (for example, a crash retried multiple times across an intermittent outage) so issue counts and crash-free-users metrics remain accurate. Per Firebase guidance, Crashlytics collects and analyzes crashes, non-fatal exceptions, and other event types — that collection occurs at this ingest layer, the canonical observability boundary for upstream-vs-downstream pipeline health in `EPIC-PA-10`.

## Business Value

Schema validation catches SDK-side integration regressions early — an SDK emitting malformed payloads after a release is detected by a sustained increase in 4xx rejections rather than silently dropping data, so teams remediate defects in hours instead of weeks of degraded signal. Request authentication prevents anonymous spoofing and is important for both data integrity (crash-free-users reflects only the app's real users) and abuse prevention. Deduplication ensures retry-driven duplication does not inflate crash counts — without this layer, a crash that took three retries would count as three crashes, materially distorting impact and prioritization. A well-defined ingest contract gives developer teams a reliable foundation for SDK telemetry: when a payload is rejected, the SDK logs a diagnostic rather than being blind to failures until customers complain. The ingestion layer is the SOURCE OF TRUTH for "did the crash data arrive at Firebase?" — the boundary against which `EPIC-PA-10` computes capture-rate health and time-to-dashboard latency.

## In Scope

The following items are included in this epic:

- Logical ingest endpoints that accept crash, non-fatal, and ANR payloads from the Crashlytics SDK over HTTPS, documented at the contract level rather than the Firebase-internal level.
- Schema validation of incoming payloads — required-field presence, type checks, documented size limits, and structural invariants such as a non-empty `firebase_app_id` and at least one stack frame.
- Request authentication via Firebase project credentials embedded in `google-services.json` (Android) or `GoogleService-Info.plist` (iOS), including rejection when credentials are missing, malformed, or mismatched against the payload's claimed `firebase_app_id`.
- Deduplication of payloads the SDK retried (per `EPIC-PA-02` Story 3) using a stable client-side identifier assigned at capture time so the server recognizes duplicates and accounts for them exactly once.
- Error response codes with a clear semantic split: 4xx (PERMANENT — SDK drops) and 5xx (TRANSIENT — SDK retries with backoff) consistent with `EPIC-PA-02`'s retry semantics.
- Capacity isolation: per-app rate limiting so no single app can exhaust ingest capacity for others sharing regional infrastructure.
- Acknowledgment semantics: the server returns a documented acknowledgment body with the 2xx status code that the SDK uses to confirm durable acceptance and safe deletion of the locally buffered copy.

## Out of Scope

The following items are explicitly excluded from this epic and are owned by sibling or successor epics:

- SDK-side capture and local persistence until next launch — owned by `EPIC-PA-01`. This epic CONSUMES the payloads capture produced.
- SDK-side transport, retries, HTTPS transport security, and post-app-close uploads — owned by `EPIC-PA-02`. This epic CONSUMES network arrivals; it does not own retry policy or transport security.
- Mapping artifact storage (Android ProGuard/R8, iOS dSYM, NDK symbols) and symbolication of obfuscated frames — owned by `EPIC-PA-03`. The ingest stage may invoke symbolication but does not own the artifact lifecycle.
- Stack-trace fingerprinting, issue lifecycle (`Open`/`Closed`/`Regressed`), and merge/split workflows — owned by `EPIC-PA-05`. This epic produces validated, deduplicated payloads as INPUT to grouping.
- Durable persistence of grouped issues, BigQuery export, and downstream Looker Studio / Grafana dashboards — owned by `EPIC-PA-06`. This epic owns only the in-flight ingest path.
- End-to-end pipeline SLOs (capture-rate, time-to-dashboard, MTTD, error-budget policy) — owned by `EPIC-PA-10`. This epic emits arrival signals from which reliability metrics are computed.

## User Stories

This epic contains 4 user stories embedded inline using H3 headings (Rule AR-1). They partition the ingestion stage into its happy-path acceptance contract (`STORY-PA-04-S01`), its rejection contract for malformed input (`STORY-PA-04-S02`), its authentication contract (`STORY-PA-04-S03`), and its at-least-once-to-exactly-once accounting bridge (`STORY-PA-04-S04`).

### STORY-PA-04-S01: Accept and acknowledge well-formed crash payloads

**As a** mobile developer relying on the Crashlytics SDK, **I want** the server to accept and acknowledge well-formed crash payloads, **so that** the SDK knows it can safely delete locally buffered copies and the on-call engineer can later query the crash in the Firebase Console.

#### Acceptance Criteria

- **Given** an SDK-generated payload conforming to the documented schema (correct fields, valid types, within size limits), **When** the SDK POSTs it to the ingest endpoint over HTTPS, **Then** the server returns HTTP 2xx with a documented acknowledgment body confirming durable acceptance.
- **Given** the SDK receives a 2xx acknowledgment, **When** it processes the response, **Then** the corresponding payload is removed from on-device buffered storage so it is not re-uploaded.
- **Given** the payload's `firebase_app_id` matches a registered app, **When** the server processes the payload, **Then** it is routed to the correct project for downstream processing by `EPIC-PA-05` and persistence by `EPIC-PA-06`.

#### Notes

- 2xx with a clear acknowledgment body signals both "received and durably accepted" and "safe to delete locally"; an acknowledgment meaning only "received" without durability would risk silent data loss if the server crashed before persistence.
- Long acknowledgment latency causes `EPIC-PA-02` transport to time out and retry, which deduplication (`STORY-PA-04-S04`) absorbs without inflating metrics.

---

### STORY-PA-04-S02: Reject malformed payloads with actionable error codes

**As a** mobile developer integrating the Crashlytics SDK, **I want** the server to return clear, actionable error codes for malformed payloads, **so that** my SDK telemetry surfaces integration regressions early instead of silently dropping crash data.

#### Acceptance Criteria

- **Given** an incoming payload missing a required field (for example, `firebase_app_id` absent or empty), **When** the server validates it, **Then** it returns HTTP 400 with an error code identifying the missing field and the SDK logs an integration-error diagnostic.
- **Given** an incoming payload exceeding the documented size limit, **When** the server validates it, **Then** it returns HTTP 413 (Payload Too Large) with a documented error code and the SDK logs a diagnostic identifying the oversized payload.
- **Given** an incoming payload with malformed JSON (or unparseable serialization), **When** the server attempts to parse, **Then** it returns HTTP 400 with an error code identifying the parse failure.
- **Given** a 4xx response of any kind, **When** the SDK processes it, **Then** the SDK does NOT retry (per `EPIC-PA-02` retry semantics) — the payload is dropped with a diagnostic logged, because 4xx signals a PERMANENT failure.

#### Notes

- The 4xx-is-permanent vs. 5xx-is-transient distinction requires the server to use 4xx ONLY for genuinely permanent failures; using 4xx transiently would cause the SDK to discard recoverable payloads, and using 5xx permanently would cause it to retry forever.
- Error response bodies should include a documented machine-readable error code (not just an HTTP status) so diagnostics are unambiguous across language clients and protocol versions.

---

### STORY-PA-04-S03: Authenticate payloads against Firebase project credentials

**As a** security/privacy reviewer, **I want** every incoming crash payload to be authenticated against the Firebase project's credentials, **so that** anonymous parties cannot spoof crash data into another organization's Firebase project and the crash-free-users metric remains a trustworthy signal of real user impact.

#### Acceptance Criteria

- **Given** an incoming payload, **When** the server inspects the request, **Then** it includes a Firebase-issued credential identifying the source app, sourced from `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) at SDK initialization.
- **Given** a request without valid credentials (missing header, malformed credential, or credential signed by an unregistered key), **When** the server processes it, **Then** the server returns HTTP 401 or 403 per Firebase's documented error model and the SDK logs an authentication diagnostic.
- **Given** a request whose credentials identify a Firebase project DIFFERENT from the one the payload's `firebase_app_id` claims, **When** the server validates the cross-check, **Then** the request is rejected with an authorization error and the cross-project spoofing attempt is recorded for security observability.

#### Notes

- The specific authentication mechanism (API-key validation, certificate attestation, signed token, or any combination) is owned by Firebase infrastructure and may evolve; this story documents BEHAVIOR rather than locking in a mechanism.
- Authentication failure is treated as a PERMANENT (4xx) error per `STORY-PA-04-S02` — a missing or mismatched credential will not become valid on retry, so the SDK surfaces the diagnostic for the integration team to fix the configuration.

---

### STORY-PA-04-S04: Deduplicate payloads retried by the SDK

**As a** data analyst, **I want** the ingestion layer to deduplicate payloads retried by the SDK, **so that** issue occurrence counts and crash-free-users metrics accurately reflect unique crash events rather than retry attempts.

#### Acceptance Criteria

- **Given** an SDK retries a payload after a transient transport failure (per `EPIC-PA-02` Story 3), **When** the server receives two or more copies of the same payload, **Then** only the first successfully processed copy is counted in downstream issue metrics — subsequent copies are recognized as duplicates and not double-counted in occurrence, affected-user, or affected-device counts.
- **Given** the SDK assigns a stable client-side identifier (a crash UUID generated at capture in `EPIC-PA-01`) to each payload, **When** the server stores or indexes it, **Then** subsequent payloads with the same identifier are recognized as duplicates and routed to the existing copy rather than creating a new occurrence record.
- **Given** a duplicate payload arrives, **When** the server processes it, **Then** the server returns a 2xx acknowledgment (so the SDK safely deletes the locally cached copy) — duplicates are SILENT successes, not errors, because returning an error would cause the SDK to retry the duplicate forever.

#### Notes

- The client-side stable identifier bridges at-least-once and exactly-once: the SDK guarantees AT-LEAST-ONCE delivery; the server provides EXACTLY-ONCE accounting via deduplication.
- Duplicate-as-acknowledged (not duplicate-as-error) is critical — if the server returned 4xx or 5xx for duplicates, the SDK would either drop accepted payloads (data loss) or retry forever (non-converging loop); 2xx is the only correct contract.

## Acceptance Criteria (Epic-Level)

The following criteria summarize exit conditions across all stories (Rule AR-4).

- **Given** an SDK uploads a well-formed crash payload, **When** the server receives it, **Then** it validates schema, authenticates the request, deduplicates against prior payloads, and returns a 2xx acknowledgment within a documented latency target.
- **Given** an SDK uploads a malformed payload (missing field, oversized, or unparseable), **When** the server validates it, **Then** it returns a documented 4xx response with a machine-readable error code identifying the violation and the SDK drops the payload without retry.
- **Given** an SDK uploads a payload with invalid or missing credentials, **When** the server authenticates the request, **Then** it returns HTTP 401 or 403 per the Firebase error model and the SDK records an authentication diagnostic without retrying indefinitely.
- **Given** an SDK retries the same payload after a transient failure, **When** the server receives the duplicate, **Then** the duplicate is recognized via the stable client-side identifier, only the first copy is counted downstream, and the server returns 2xx so the SDK deletes its local copy.
- **Given** crash-free-users and crash-free-sessions are computed downstream, **When** a data analyst inspects them, **Then** the metrics reflect unique crash events rather than retry attempts due to ingestion-layer deduplication.

## Definition of Done

The epic is complete when ALL of the following observable conditions are simultaneously true:

- All 4 embedded stories (`STORY-PA-04-S01`–`S04`) have their acceptance criteria satisfied.
- All 5 epic-level acceptance criteria above are satisfied.
- SDK debug logging on at least one platform (Android via `adb logcat` Crashlytics tags or iOS via Xcode console with verbose Crashlytics logging) shows a 2xx acknowledgment for a force-crash payload.
- SDK debug logging shows a 4xx rejection for an intentionally malformed test payload (for example, one omitting a required field), demonstrating the rejection contract surfaces actionable diagnostics.
- Deduplication is verified empirically by sending the same payload twice (via a network proxy replaying the request, or SDK debug instrumentation that triggers a retry without a transport failure) and observing only one crash occurrence increment in the Firebase Console.
- The ingestion contract (request format, response format, error codes, deduplication identifier requirements) is documented and referenced by the SDK integration guides used in `EPIC-MIG-03` and `EPIC-MIG-04`.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `EPIC-PA-02` | Ingestion accepts the network arrivals produced by the SDK upload and transport layer; without `EPIC-PA-02` there are no payloads to validate, authenticate, or deduplicate. |
| `Predecessor` | `EPIC-PA-03` | Symbolicated stack frames are high-value input to downstream grouping; the ingest stage may apply symbolication during processing or pass payloads through with mapping artifacts already available. |
| `Successor` | `EPIC-PA-05` | Issue grouping consumes the validated, authenticated, deduplicated payloads emitted from this stage — without exactly-once accounting, grouping would over-count and inflate impact metrics. |
| `Cross-Cutting` | `EPIC-PA-10` | Reliability and SLOs measure capture-rate health and time-to-dashboard latency against arrivals counted at this ingest boundary, making `EPIC-PA-04` the canonical source-of-truth for upstream-vs-downstream attribution. |

## References

Per Rule AR-5 (Source Grounding), this epic's content is grounded in public Firebase or Crashlytics guidance. Inferred content not directly traceable to a public source is flagged inline as `[inferred — no direct source]`.

- [Firebase Crashlytics — Product Overview](https://firebase.google.com/docs/crashlytics) — Documents that Crashlytics collects and analyzes crashes, non-fatal exceptions, and other event types; grounds the description of the ingest boundary where this collection materializes server-side.
- [Crashlytics Pipeline Guide (ReverseBits)](https://reversebits.tech/blog/firebase-crashlytics-guide) — Describes pipeline mechanics from capture through server ingest, including the buffer-then-upload sequence producing the at-least-once arrival pattern this epic deduplicates.
- [Firebase Crashlytics — Troubleshooting](https://firebase.google.com/docs/crashlytics/troubleshooting) — Documents how to enable SDK debug logging to verify the app is sending crash reports; grounds the DoD items using debug logging to validate the 2xx and 4xx contracts.
- [Firebase Crashlytics — Test your implementation](https://firebase.google.com/docs/crashlytics/test-implementation) — Documents the Firebase Console visibility window for a force-crash; grounds the empirical deduplication verification in the DoD.
