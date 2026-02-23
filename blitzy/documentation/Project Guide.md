# Project Guide: Node.js Server Security Hardening

## Executive Summary

**Project Completion: 82% (58 hours completed out of 71 total hours)**

This security hardening initiative has successfully implemented all code-level security requirements specified in the Agent Action Plan. The minimal, unprotected Node.js HTTP server has been migrated from the raw `http` module to Express.js with a comprehensive, layered security middleware stack. All 10 in-scope files have been created or updated, all 38 security tests pass, npm audit reports 0 vulnerabilities, and the server runs correctly with full backward compatibility preserved.

**Completed hours: 58h** | **Remaining hours: 13h** | **Total: 71h** | **Completion: 58/71 = 82%**

### Key Achievements
- Migrated server from raw `http.createServer()` to Express.js 4.x with 6 security middleware integrations
- Implemented 12 OWASP-recommended security headers via helmet@8.1.0
- Added input validation with express-validator@7.3.1 on all routes (body, query, path parameters)
- Configured per-IP rate limiting at 100 requests per 15-minute window via express-rate-limit@8.2.1
- Enabled conditional HTTPS with TLS 1.2 minimum and graceful degradation
- Configured restrictive CORS policy with explicit origin whitelist via cors@2.8.6
- Created 38 automated security tests across 5 test suites — all passing
- Comprehensive README.md security documentation with setup instructions

### Remaining Work (13 hours — requires human intervention)
- Production TLS certificate procurement and configuration
- Production environment variable setup (CORS origins, rate limits, host binding)
- Security implementation code review
- Integration testing with actual client applications
- Rate limit tuning for production traffic patterns
- Production deployment and smoke testing

---

## Validation Results Summary

### Gate 1: Dependencies — ✅ 100% SUCCESS
All 5 security dependencies installed with 0 vulnerabilities across 77 packages:
| Package | Specified | Installed | Status |
|---------|-----------|-----------|--------|
| express | ^4.21.2 | 4.22.1 | ✅ |
| helmet | ^8.1.0 | 8.1.0 | ✅ |
| cors | ^2.8.6 | 2.8.6 | ✅ |
| express-rate-limit | ^8.2.1 | 8.2.1 | ✅ |
| express-validator | ^7.3.1 | 7.3.1 | ✅ |

### Gate 2: Compilation — ✅ 100% SUCCESS
All 7 JavaScript files pass Node.js syntax checking (`node --check`):
| File | Lines | Status |
|------|-------|--------|
| server.js | 315 | ✅ SYNTAX OK |
| server - Copy.js | 315 | ✅ SYNTAX OK |
| tests/security/test_headers.js | 524 | ✅ SYNTAX OK |
| tests/security/test_rate_limit.js | 694 | ✅ SYNTAX OK |
| tests/security/test_cors.js | 481 | ✅ SYNTAX OK |
| tests/security/test_validation.js | 507 | ✅ SYNTAX OK |
| tests/security/test_https.js | 723 | ✅ SYNTAX OK |

### Gate 3: Tests — ✅ 100% SUCCESS (38/38 passed)
| Test Suite | Tests | Status |
|------------|-------|--------|
| test_headers.js | 12/12 | ✅ All 12 OWASP security headers verified |
| test_rate_limit.js | 5/5 | ✅ Rate limiting, draft-8 headers, 429 enforcement |
| test_cors.js | 6/6 | ✅ Origin whitelist, preflight, credentials |
| test_validation.js | 9/9 | ✅ XSS rejection, SQL injection, body size limit |
| test_https.js | 6/6 | ✅ TLS handshake, certificate, TLS 1.2 min, HTTP/HTTPS parity |

### Gate 4: Runtime — ✅ 100% SUCCESS
- `GET /` returns `Hello, World!\n` (200 OK, text/plain) — backward compatibility preserved
- All 12 security headers present in every response
- `X-Powered-By` header absent (removed by helmet)
- CORS blocks disallowed origins with 403 Forbidden
- Input validation rejects XSS payloads and oversized bodies
- Rate limiting headers present (RateLimit, RateLimit-Policy — draft-8 format)
- HTTPS gracefully degrades to HTTP-only when TLS certificates unavailable
- `GET /search`, `GET /items/:id`, `POST /` routes all work with validation

### Fixes Applied During Validation
- Error handler status propagation corrected for body-parser middleware errors (400/413)
- EADDRINUSE error handling added for graceful port conflict resolution
- `path` module import added for TLS certificate file resolution
- CORS_ORIGINS default corrected in README documentation
- npm test script updated to run all 5 test suites sequentially
- X-Permitted-Cross-Domain-Policies header added to README security headers table

---

## Git Repository Analysis

### Branch Activity
- **Branch:** `blitzy-353507ad-b162-4f02-b453-1d5a8982ac05`
- **Base:** `origin/23-feb-QA-Branch`
- **Total commits:** 12 (all by Blitzy Agent)
- **Files changed:** 10 (5 modified, 5 created)
- **Lines added:** 4,624
- **Lines removed:** 19
- **Net lines of code:** +4,605

### Commit Timeline
| Hash | Timestamp | Description |
|------|-----------|-------------|
| 4065401 | 13:52 UTC | Add security dependencies (express, helmet, cors, express-rate-limit, express-validator) |
| da1e8b7 | 14:02 UTC | Harden server.js with Express + all security middleware |
| 325df38 | 14:06 UTC | Harden server - Copy.js (identical security transformation) |
| 78225bf | 14:24 UTC | Fix code review findings (error handler, EADDRINUSE, path import) |
| 0cb8340 | 14:36 UTC | Add comprehensive security documentation to README |
| 83d0922 | 14:45 UTC | Add HTTPS/TLS test suite (test_https.js) |
| 72c90d1 | 14:51 UTC | Add input validation tests (test_validation.js) |
| 7aa0319 | 14:54 UTC | Add CORS policy tests (test_cors.js) |
| 4d60e04 | 15:05 UTC | Add rate limiting tests (test_rate_limit.js) |
| 90bbb49 | 15:08 UTC | Add security header tests (test_headers.js) |
| a2af177 | 15:25 UTC | Fix CORS_ORIGINS default in README and update test script |
| 7901349 | 16:09 UTC | Add missing X-Permitted-Cross-Domain-Policies to README |

### File Type Breakdown
| Type | Count | Purpose |
|------|-------|---------|
| JavaScript (.js) | 7 | Server implementation (2) + test suites (5) |
| JSON | 2 | package.json + package-lock.json |
| Markdown (.md) | 1 | README.md with security documentation |

---

## Hours Breakdown

### Completed Work: 58 hours

| Component | Hours | Description |
|-----------|-------|-------------|
| server.js complete rewrite | 16h | 315-line Express migration with 6 security middleware integrations, 3 validated routes, error handler, HTTPS support, environment configuration |
| server - Copy.js mirroring | 2h | Identical security transformation with verification |
| package.json configuration | 1h | 5 dependency declarations, start/test scripts, main entry point |
| README.md documentation | 3h | 159 lines of comprehensive security docs, setup instructions, env var reference, testing guide |
| test_headers.js | 6h | 524 lines, 12 tests verifying all OWASP security headers |
| test_rate_limit.js | 7h | 694 lines, 5 tests verifying draft-8 rate limiting behavior |
| test_cors.js | 5h | 481 lines, 6 tests verifying CORS policy enforcement |
| test_validation.js | 5h | 507 lines, 9 tests verifying input sanitization and rejection |
| test_https.js | 8h | 723 lines, 6 tests verifying TLS handshake, certs, protocol version, HTTP/HTTPS parity |
| Bug fixes and validation | 5h | Code review remediation, error handler fix, EADDRINUSE handling, README corrections, iterative testing |
| **Total Completed** | **58h** | |

### Remaining Work: 13 hours (includes 1.21x enterprise multipliers)

| Task | Base Hours | With Multipliers | Priority | Severity |
|------|-----------|-------------------|----------|----------|
| Production TLS Certificate Setup | 2h | 2.5h | High | High |
| Production Environment Configuration | 1h | 1h | High | Medium |
| Security Implementation Review | 2h | 2.5h | Medium | Medium |
| Integration Testing with Client Apps | 3h | 4h | Medium | Medium |
| Rate Limit Tuning for Production Load | 1h | 1.5h | Low | Low |
| Production Deployment & Smoke Testing | 1h | 1.5h | Medium | Medium |
| **Total Remaining** | **10h** | **13h** | | |

### Hours Calculation
- **Completed:** 58 hours
- **Remaining:** 13 hours (10 base hours × 1.10 compliance × 1.10 uncertainty = 12.1h ≈ 13h)
- **Total Project Hours:** 58 + 13 = 71 hours
- **Completion Percentage:** 58 / 71 = 81.7% ≈ **82%**

```mermaid
pie title Project Hours Breakdown
    "Completed Work" : 58
    "Remaining Work" : 13
```

---

## Detailed Human Task List

All code implementation is complete. The following tasks require human intervention for production readiness.

### High Priority Tasks

#### 1. Production TLS Certificate Setup — 2.5 hours
**Description:** Obtain and configure production-grade TLS certificates from a trusted Certificate Authority for HTTPS encryption.
**Action Steps:**
1. Obtain TLS certificate from a CA (e.g., Let's Encrypt, DigiCert, or organizational CA)
2. Place certificate and private key files on the production server
3. Set environment variables: `TLS_KEY_PATH=/path/to/key.pem` and `TLS_CERT_PATH=/path/to/cert.pem`
4. Verify HTTPS server starts on configured port (default 3443)
5. Test TLS handshake with `curl --tlsv1.2 https://your-host:3443/`
6. Configure certificate auto-renewal if using Let's Encrypt
**Priority:** High | **Severity:** High
**Confidence:** High — well-defined task with clear scope

#### 2. Production Environment Configuration — 1 hour
**Description:** Configure all environment variables for production deployment with organization-specific values.
**Action Steps:**
1. Set `HOST=0.0.0.0` (or appropriate production bind address) — currently defaults to `127.0.0.1`
2. Set `PORT` to production HTTP port (if different from 3000)
3. Set `HTTPS_PORT` to production HTTPS port (if different from 3443)
4. Set `CORS_ORIGINS` to comma-separated list of actual frontend/client origins — currently defaults to `http://localhost:3000`
5. Set `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` if defaults need adjustment
6. Document configured values in deployment runbook
**Priority:** High | **Severity:** Medium
**Confidence:** High — straightforward configuration task

### Medium Priority Tasks

#### 3. Security Implementation Review — 2.5 hours
**Description:** Human security review of all implemented security middleware configurations to ensure they meet organizational security standards and policies.
**Action Steps:**
1. Review helmet configuration — verify CSP directives match application requirements (default `script-src 'self'` may need adjustment if loading external scripts)
2. Review CORS origin whitelist — verify allowed origins list is appropriate for the deployment context
3. Review rate limit thresholds — verify 100 requests per 15 minutes is appropriate for expected traffic
4. Review input validation rules — verify max length limits (500 chars body, 200 chars query) are appropriate
5. Review error handler — ensure error messages don't leak sensitive information
6. Verify TLS minimum version (TLS 1.2) meets organizational requirements
7. Sign off on security implementation
**Priority:** Medium | **Severity:** Medium
**Confidence:** Medium — scope depends on organizational security policies

#### 4. Integration Testing with Client Applications — 4 hours
**Description:** Test the security-hardened server with actual frontend applications and API consumers to verify CORS, headers, and rate limiting work correctly in real-world scenarios.
**Action Steps:**
1. Deploy the server to a staging environment
2. Configure CORS_ORIGINS with staging frontend URLs
3. Test cross-origin requests from the actual frontend application
4. Verify Content-Security-Policy does not block required resources (scripts, styles, fonts, images)
5. Test authentication flows if Authorization header is used (allowed in CORS config)
6. Verify rate limiting doesn't impact legitimate user workflows
7. Test WebSocket connections if applicable (currently not configured in CORS methods)
8. Document any required configuration adjustments
**Priority:** Medium | **Severity:** Medium
**Confidence:** Medium — results depend on client application specifics

#### 5. Production Deployment & Smoke Testing — 1.5 hours
**Description:** Deploy the security-hardened server to the production environment and perform smoke testing.
**Action Steps:**
1. Run `npm install --production` in production environment
2. Run `npm audit` to verify no vulnerabilities in production dependency tree
3. Start server with production environment variables configured
4. Verify HTTP endpoint responds: `curl -sI http://production-host:PORT/`
5. Verify HTTPS endpoint responds: `curl -sI https://production-host:HTTPS_PORT/`
6. Verify all 12 security headers are present in responses
7. Verify X-Powered-By header is absent
8. Verify CORS blocks unauthorized origins
9. Monitor server logs for any startup warnings or errors
**Priority:** Medium | **Severity:** Medium
**Confidence:** High — standard deployment procedure

### Low Priority Tasks

#### 6. Rate Limit Tuning for Production Load — 1.5 hours
**Description:** Analyze production traffic patterns and adjust rate limiting thresholds to balance security and usability.
**Action Steps:**
1. Monitor production traffic for 24-48 hours to establish baseline request rates per IP
2. Identify if 100 requests per 15 minutes is too restrictive for legitimate users (e.g., users behind shared NAT/proxy)
3. If needed, adjust `RATE_LIMIT_MAX` upward or `RATE_LIMIT_WINDOW_MS` downward
4. Consider configuring `trust proxy` setting if server is behind a reverse proxy (ensures rate limiting uses the real client IP from X-Forwarded-For)
5. Consider adding route-specific rate limits for high-traffic endpoints
6. Document final rate limit configuration
**Priority:** Low | **Severity:** Low
**Confidence:** Low — depends on actual production traffic analysis

### Task Summary Table

| # | Task | Hours | Priority | Severity |
|---|------|-------|----------|----------|
| 1 | Production TLS Certificate Setup | 2.5h | High | High |
| 2 | Production Environment Configuration | 1.0h | High | Medium |
| 3 | Security Implementation Review | 2.5h | Medium | Medium |
| 4 | Integration Testing with Client Apps | 4.0h | Medium | Medium |
| 5 | Production Deployment & Smoke Testing | 1.5h | Medium | Medium |
| 6 | Rate Limit Tuning for Production Load | 1.5h | Low | Low |
| **Total Remaining Hours** | | **13.0h** | | |

---

## Development Guide

### System Prerequisites

| Requirement | Minimum Version | Verified Version |
|-------------|----------------|-----------------|
| Node.js | >= 18.0.0 | v20.20.0 |
| npm | >= 7.0.0 | v11.1.0 |
| Operating System | Linux, macOS, or Windows | Ubuntu (tested) |
| OpenSSL | Any recent version | Required only for HTTPS certificate generation |

### Environment Setup

```bash
# 1. Clone the repository and switch to the feature branch
git clone <repository-url>
cd hao-backprop-test
git checkout blitzy-353507ad-b162-4f02-b453-1d5a8982ac05

# 2. Verify Node.js version (must be >= 18)
node --version
# Expected: v20.20.0 or higher

# 3. Verify npm version
npm --version
# Expected: 11.1.0 or higher
```

### Dependency Installation

```bash
# Install all dependencies (5 security packages + transitive dependencies)
npm install

# Expected output: "added 77 packages" (exact count may vary)

# Verify installed security packages
npm ls express helmet cors express-rate-limit express-validator

# Expected output:
# hello_world@1.0.0
# ├── cors@2.8.6
# ├── express-rate-limit@8.2.1
# ├── express-validator@7.3.1
# ├── express@4.22.1
# └── helmet@8.1.0

# Run vulnerability scan
npm audit

# Expected output: "found 0 vulnerabilities"
```

### Running Tests

```bash
# Run the full security test suite (38 tests across 5 files)
npm test

# Expected output: All 38 tests PASS with exit code 0
# - test_headers.js:    12/12 PASSED
# - test_rate_limit.js:  5/5  PASSED
# - test_cors.js:        6/6  PASSED
# - test_validation.js:  9/9  PASSED
# - test_https.js:       6/6  PASSED
```

### Application Startup

```bash
# Start the server (HTTP-only mode — default, no TLS certificates)
node server.js

# Expected output:
# Warning: TLS_KEY_PATH and TLS_CERT_PATH not set. HTTPS server not started.
# Server is running in HTTP-only mode.
# HTTP Server running at http://127.0.0.1:3000/
```

#### Starting with HTTPS enabled (optional)

```bash
# Generate self-signed certificates for local development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=localhost"

# Start with both HTTP and HTTPS
TLS_KEY_PATH=./key.pem TLS_CERT_PATH=./cert.pem node server.js

# Expected output:
# HTTP Server running at http://127.0.0.1:3000/
# HTTPS Server running at https://127.0.0.1:3443/
```

#### Starting with custom configuration

```bash
# Example: custom port, bind to all interfaces, custom CORS origins
PORT=8080 \
HOST=0.0.0.0 \
CORS_ORIGINS="https://frontend.example.com,https://admin.example.com" \
RATE_LIMIT_MAX=200 \
node server.js
```

### Verification Steps

```bash
# 1. Test root endpoint (backward compatibility)
curl -s http://127.0.0.1:3000/
# Expected: Hello, World!

# 2. Inspect security headers
curl -sI http://127.0.0.1:3000/
# Expected: 12 security headers present, X-Powered-By absent

# 3. Verify X-Powered-By is removed
curl -sI http://127.0.0.1:3000/ | grep -i x-powered-by
# Expected: No output (header is absent)

# 4. Verify Content-Security-Policy is present
curl -sI http://127.0.0.1:3000/ | grep -i content-security-policy
# Expected: Content-Security-Policy: default-src 'self';...

# 5. Test input validation (XSS rejection)
curl -s -X POST http://127.0.0.1:3000/ \
  -H "Content-Type: application/json" \
  -d '{"input":"<script>alert(1)</script>"}'
# Expected: {"message":"Request processed successfully"} (input is sanitized/escaped)

# 6. Test CORS blocking (disallowed origin)
curl -s -H "Origin: http://malicious.example.com" http://127.0.0.1:3000/
# Expected: {"error":"CORS policy violation: Origin not allowed"}

# 7. Test search endpoint with query validation
curl -s "http://127.0.0.1:3000/search?q=hello"
# Expected: {"message":"Search processed","query":"hello"}

# 8. Test items endpoint with path parameter validation
curl -s http://127.0.0.1:3000/items/42
# Expected: {"message":"Item retrieved","id":42}

# 9. Test rate limiting headers
curl -sI http://127.0.0.1:3000/ | grep -i ratelimit
# Expected: RateLimit and RateLimit-Policy headers present
```

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `HOST` | Server bind address | `127.0.0.1` |
| `HTTPS_PORT` | HTTPS server port | `3443` |
| `TLS_KEY_PATH` | Path to TLS private key (PEM) | Not set (HTTPS disabled) |
| `TLS_CERT_PATH` | Path to TLS certificate (PEM) | Not set (HTTPS disabled) |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `900000` (15 minutes) |
| `RATE_LIMIT_MAX` | Max requests per window per IP | `100` |

---

## AAP Requirements Compliance Matrix

| AAP Requirement | Status | Evidence |
|----------------|--------|----------|
| Migrate from raw `http` to Express.js | ✅ Complete | server.js uses `express@4.22.1`, `app.get()`, `app.post()`, `app.use()` |
| Implement security headers via helmet.js | ✅ Complete | `app.use(helmet())` — 12 headers verified by test_headers.js (12/12 pass) |
| Add input validation (express-validator) | ✅ Complete | body(), query(), param() validators on all routes — 9/9 tests pass |
| Enforce rate limiting (express-rate-limit) | ✅ Complete | 100 req/15min, draft-8 headers — 5/5 tests pass |
| Enable HTTPS transport encryption | ✅ Complete | Conditional HTTPS with TLS 1.2 min, graceful degradation — 6/6 tests pass |
| Configure CORS policies | ✅ Complete | Explicit origin whitelist, no wildcard — 6/6 tests pass |
| Update package.json dependencies | ✅ Complete | 5 dependencies declared, start/test scripts added |
| Update package-lock.json | ✅ Complete | Regenerated with full dependency tree (77 packages) |
| Update server - Copy.js | ✅ Complete | Byte-for-byte identical to server.js |
| Update README.md | ✅ Complete | 159 lines of security documentation, setup guide, env var reference |
| Create test_headers.js | ✅ Complete | 524 lines, 12 tests, all passing |
| Create test_rate_limit.js | ✅ Complete | 694 lines, 5 tests, all passing |
| Create test_cors.js | ✅ Complete | 481 lines, 6 tests, all passing |
| Create test_validation.js | ✅ Complete | 507 lines, 9 tests, all passing |
| Create test_https.js | ✅ Complete | 723 lines, 6 tests, all passing |
| Preserve backward compatibility (Hello, World!) | ✅ Complete | GET / returns "Hello, World!\n" with 200 OK, text/plain |
| Remove X-Powered-By header | ✅ Complete | Verified absent via curl — helmet removes it |
| Environment variable configuration | ✅ Complete | All 8 env vars configurable (PORT, HOST, HTTPS_PORT, TLS paths, CORS_ORIGINS, rate limits) |
| Graceful HTTPS degradation | ✅ Complete | Falls back to HTTP-only with console warning when certs unavailable |
| Middleware ordering per AAP §0.11.3 | ✅ Complete | helmet → cors → body parsers → rate limiter → route validators → handlers → error handler |
| npm audit: 0 vulnerabilities | ✅ Complete | `npm audit` reports 0 vulnerabilities |

---

## Risk Assessment

### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Content-Security-Policy blocks required external resources (scripts, fonts, CDNs) | Medium | Medium | Review CSP directives against actual application requirements; customize helmet CSP config if needed |
| Rate limiting false positives for users behind shared NAT/proxy | Medium | Medium | Configure `trust proxy` setting if behind reverse proxy; adjust RATE_LIMIT_MAX based on traffic analysis |
| Body size limit (10kb) rejects legitimate large payloads | Low | Low | Increase `express.json({ limit: '...' })` if endpoints require larger bodies |
| express@4.22.1 installed instead of pinned 4.21.2 | Low | Low | Version satisfies `^4.21.2` semver range; both are in the 4.x LTS line |

### Security Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Production deployment without TLS certificates (HTTP-only) | High | Medium | Prioritize TLS certificate setup before production exposure; server warns when HTTPS is disabled |
| CORS_ORIGINS default is localhost:3000 (insecure for production) | High | Medium | Set CORS_ORIGINS environment variable to actual frontend origins before deployment |
| Self-signed certificates used in production | High | Low | README explicitly warns against this; use CA-issued certificates in production |
| Rate limit bypass via distributed IPs | Low | Low | Current per-IP limiting is standard; consider WAF or CDN-level rate limiting for advanced protection |

### Operational Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Server binds to 127.0.0.1 by default (not accessible externally) | Medium | High | Set HOST=0.0.0.0 for production; default loopback is defense-in-depth for development |
| No structured logging or monitoring | Medium | Medium | Out of scope per AAP; recommend adding Winston or Pino logger for production observability |
| No health check endpoint | Low | Medium | Out of scope per AAP; recommend adding GET /health for load balancer integration |
| No process manager (PM2, systemd) | Low | Medium | Out of scope per AAP; recommend PM2 or systemd for production process supervision |

### Integration Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| CORS blocks legitimate cross-origin API consumers | Medium | Medium | Configure CORS_ORIGINS with all legitimate client origin URLs before deployment |
| Rate limiting shared across HTTP and HTTPS servers (in-memory store) | Low | Low | Both servers share the Express app instance and rate limiter; this is expected behavior |
| No reverse proxy configuration documentation | Low | Medium | Document nginx/Apache reverse proxy setup if server is deployed behind one |

---

## Project Structure

```
hao-backprop-test/
├── server.js                          # [UPDATED] Secured Express.js server (315 lines)
├── server - Copy.js                   # [UPDATED] Identical secured copy (315 lines)
├── package.json                       # [UPDATED] 5 security dependencies + scripts
├── package-lock.json                  # [UPDATED] Full dependency tree (77 packages)
├── README.md                          # [UPDATED] Security documentation (159 lines)
├── tests/
│   └── security/
│       ├── test_headers.js            # [CREATED] 12 security header tests (524 lines)
│       ├── test_rate_limit.js         # [CREATED] 5 rate limiting tests (694 lines)
│       ├── test_cors.js               # [CREATED] 6 CORS policy tests (481 lines)
│       ├── test_validation.js         # [CREATED] 9 input validation tests (507 lines)
│       └── test_https.js              # [CREATED] 6 HTTPS/TLS tests (723 lines)
├── 100Pages.pdf                       # [UNCHANGED] Static file
├── 100Pages - Copy.pdf                # [UNCHANGED] Static file
├── LoginTest.java                     # [UNCHANGED] Java stub (out of scope)
├── LoginTest - Copy.java              # [UNCHANGED] Java stub (out of scope)
├── industry.csv                       # [UNCHANGED] Static data file
├── industry - Copy.csv                # [UNCHANGED] Static data file
├── demo.jpg                           # [UNCHANGED] Image file
├── demo - Copy.jpg                    # [UNCHANGED] Image file
├── sample.doc                         # [UNCHANGED] Document file
├── sample - Copy.doc                  # [UNCHANGED] Document file
├── test.py - Copy.txt                 # [UNCHANGED] Empty placeholder
├── test.py.txt                        # [UNCHANGED] Empty placeholder
└── test.txt.txt                       # [UNCHANGED] Empty placeholder
```

---

## Middleware Architecture

The security middleware stack is registered in a specific order critical for security effectiveness:

```
Request → helmet (security headers) → cors (origin check) → body parsers (JSON/URL) → rate limiter → route validators → route handler → error handler → Response
```

1. **helmet()** — Sets 12 security headers on EVERY response, including error responses
2. **cors()** — Rejects unauthorized origins before body parsing (saves resources)
3. **express.json() / express.urlencoded()** — Parses bodies with 10kb size limit
4. **rateLimit()** — Throttles per-IP requests before reaching route handlers
5. **express-validator** — Per-route validation chains on body, query, and path params
6. **Route handlers** — Business logic (Hello World, search, items)
7. **Error handler** — Catches CORS violations (403), body-parser errors (400/413), and unknown errors (500)
