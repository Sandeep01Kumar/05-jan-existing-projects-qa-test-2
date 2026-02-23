# hao-backprop-test
test project for backprop integration. Do not touch!

## Security Hardening

This server has been hardened with comprehensive security middleware following OWASP Node.js Security Best Practices. The following six security measures have been implemented:

1. **HTTP security headers** via [helmet.js](https://helmetjs.github.io/) — Automatically sets 11 OWASP-recommended response headers on every request to prevent XSS, clickjacking, MIME sniffing, and information disclosure attacks.
2. **Input validation** via [express-validator](https://express-validator.github.io/) — Sanitizes and validates all incoming request parameters, query strings, and body content, rejecting malformed or malicious input with structured 400 error responses.
3. **Rate limiting** via [express-rate-limit](https://express-rate-limit.mintlify.app/) — Enforces per-IP request throttling (100 requests per 15-minute window) to prevent denial-of-service and brute-force attacks, returning 429 Too Many Requests when the limit is exceeded.
4. **HTTPS transport encryption** — Uses Node.js built-in `https` module to create a TLS-encrypted server alongside HTTP, with TLS 1.2 enforced as the minimum protocol version. Falls back gracefully to HTTP-only mode if certificates are unavailable.
5. **CORS policy enforcement** via [cors](https://www.npmjs.com/package/cors) — Configures restrictive cross-origin resource sharing rules with an explicit origin whitelist, preventing unauthorized cross-origin access. Wildcard origins (`*`) are not used.
6. **Express.js framework migration** — Migrated from the raw Node.js `http` module to [Express 4.21.2](https://expressjs.com/) as the prerequisite foundation for all security middleware listed above.

### Dependencies

The following npm packages were added to implement the security hardening described above. Install them with `npm install`.

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | `^4.21.2` | Web framework — foundation for all security middleware |
| `helmet` | `^8.1.0` | HTTP security headers middleware |
| `cors` | `^2.8.6` | CORS policy enforcement middleware |
| `express-rate-limit` | `^8.2.1` | Per-IP rate limiting middleware |
| `express-validator` | `^7.3.1` | Input validation and sanitization middleware |

### Setup

```bash
# Install all dependencies (including security packages)
npm install

# Start the server
npm start
# or equivalently:
node server.js
```

The HTTP server starts on **http://127.0.0.1:3000** by default. If TLS certificates are configured (see [HTTPS Configuration](#https-configuration) below), the HTTPS server also starts on **https://127.0.0.1:3443** by default.

### HTTPS Configuration

HTTPS support is **optional**. If TLS certificate files are not available at the configured paths, the server falls back to HTTP-only mode and prints a console warning — it does not fail to start.

When HTTPS is enabled, TLS 1.2 is enforced as the minimum protocol version.

Configure TLS via the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `TLS_KEY_PATH` | Path to the TLS private key file (PEM format) | _(not set — HTTPS disabled)_ |
| `TLS_CERT_PATH` | Path to the TLS certificate file (PEM format) | _(not set — HTTPS disabled)_ |
| `HTTPS_PORT` | Port for the HTTPS server | `3443` |

**Example — using self-signed certificates for local development:**

```bash
# Generate a self-signed certificate (for development only)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=localhost"

# Start the server with HTTPS enabled
TLS_KEY_PATH=./key.pem TLS_CERT_PATH=./cert.pem node server.js
```

> **Warning:** Never use self-signed certificates in production. Use certificates issued by a trusted Certificate Authority (CA) instead.

### Environment Variables

All security parameters are configurable via environment variables to support different deployment environments without code changes.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `HOST` | Server bind address | `127.0.0.1` |
| `HTTPS_PORT` | HTTPS server port | `3443` |
| `TLS_KEY_PATH` | Path to TLS private key file | _(not set)_ |
| `TLS_CERT_PATH` | Path to TLS certificate file | _(not set)_ |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins (e.g. `http://localhost:8080,https://app.example.com`) | _(empty — no cross-origin requests allowed)_ |
| `RATE_LIMIT_WINDOW_MS` | Rate limit time window in milliseconds | `900000` (15 minutes) |
| `RATE_LIMIT_MAX` | Maximum requests per window per IP address | `100` |

**Example — customized deployment:**

```bash
PORT=8080 \
HOST=0.0.0.0 \
CORS_ORIGINS="https://frontend.example.com,https://admin.example.com" \
RATE_LIMIT_MAX=200 \
node server.js
```

### Security Headers

[helmet.js](https://helmetjs.github.io/) automatically sets the following 11 HTTP security headers on every response:

| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | Restricts sources from which scripts, styles, and other resources can be loaded, mitigating XSS attacks |
| `Cross-Origin-Opener-Policy` | Isolates the browsing context to prevent cross-origin attacks (set to `same-origin`) |
| `Cross-Origin-Resource-Policy` | Prevents other origins from loading this server's resources (set to `same-origin`) |
| `Origin-Agent-Cluster` | Requests origin-keyed agent clustering for process isolation |
| `Referrer-Policy` | Controls how much referrer information is included with requests (set to `no-referrer`) |
| `Strict-Transport-Security` | Instructs browsers to only connect via HTTPS for a specified duration |
| `X-Content-Type-Options` | Prevents browsers from MIME-sniffing a response away from the declared content type (set to `nosniff`) |
| `X-DNS-Prefetch-Control` | Controls browser DNS prefetching to reduce privacy leakage (set to `off`) |
| `X-Download-Options` | Prevents Internet Explorer from executing downloads in the site's context (set to `noopen`) |
| `X-Frame-Options` | Prevents the page from being loaded in a frame or iframe to mitigate clickjacking (set to `SAMEORIGIN`) |
| `X-XSS-Protection` | Disabled (`0`) — modern browsers rely on CSP instead; disabling prevents old IE vulnerabilities |

Additionally, the `X-Powered-By` header that Express sets by default is **removed** by helmet to prevent server technology fingerprinting.

### Testing

Security test files are located in the `tests/security/` directory:

| Test File | Coverage |
|-----------|----------|
| `tests/security/test_headers.js` | Verifies all 11 helmet security headers are present in responses and `X-Powered-By` is absent |
| `tests/security/test_rate_limit.js` | Verifies rate limiting behavior — requests 1–100 return 200, request 101 returns 429 |
| `tests/security/test_cors.js` | Verifies CORS policy — allowed origins receive CORS headers, non-allowed origins are blocked |
| `tests/security/test_validation.js` | Verifies input sanitization — malicious payloads are rejected with 400 responses |
| `tests/security/test_https.js` | Verifies TLS configuration and HTTPS server behavior |

**Run the test suite:**

```bash
npm test
```

**Manual verification — check security headers:**

```bash
# Inspect all response headers (security headers should be visible)
curl -sI http://127.0.0.1:3000/

# Verify X-Powered-By is absent (expect no output)
curl -sI http://127.0.0.1:3000/ | grep -i x-powered-by

# Verify Content-Security-Policy is present
curl -sI http://127.0.0.1:3000/ | grep -i content-security-policy
```

**Manual verification — check rate limiting:**

```bash
# Send 105 rapid requests; requests 101–105 should return 429
for i in $(seq 1 105); do
  curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
done
```

**Manual verification — check CORS policy:**

```bash
# Request from a non-allowed origin (expect no Access-Control-Allow-Origin header)
curl -H "Origin: http://malicious.example.com" -sI http://127.0.0.1:3000/
```
