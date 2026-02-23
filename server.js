/**
 * Secured HTTP/HTTPS Server
 *
 * Security middleware stack (in order):
 * 1. helmet          - Sets OWASP-recommended security headers and removes X-Powered-By
 * 2. cors            - Restrictive cross-origin resource sharing policy
 * 3. express.json /
 *    express.urlencoded - Body parsing with 10kb size limits to prevent payload flooding
 * 4. express-rate-limit - Per-IP rate limiting (DoS prevention)
 * 5. express-validator  - Per-route input validation (injection prevention)
 * 6. HTTPS           - TLS transport encryption (optional, with graceful degradation)
 *
 * Environment variables:
 *   HOST                 - Bind address            (default: 127.0.0.1)
 *   PORT                 - HTTP port               (default: 3000)
 *   HTTPS_PORT           - HTTPS port              (default: 3443)
 *   TLS_KEY_PATH         - Path to TLS private key (optional; enables HTTPS when set)
 *   TLS_CERT_PATH        - Path to TLS certificate (optional; enables HTTPS when set)
 *   CORS_ORIGINS         - Comma-separated allowed origins (default: http://localhost:3000)
 *   RATE_LIMIT_WINDOW_MS - Rate-limit window in ms (default: 900000 = 15 minutes)
 *   RATE_LIMIT_MAX       - Max requests per window (default: 100)
 */

'use strict';

// ---------------------------------------------------------------------------
// External dependencies
// ---------------------------------------------------------------------------
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { body, query, param, validationResult } = require('express-validator');

// ---------------------------------------------------------------------------
// Node.js built-in modules
// ---------------------------------------------------------------------------
const https = require('https');
const fs    = require('fs');
const path  = require('path'); // eslint-disable-line no-unused-vars — kept for cert-path resolution if needed

// ---------------------------------------------------------------------------
// Configuration — all values are environment-variable-driven per AAP §0.11.1
// ---------------------------------------------------------------------------
const hostname         = process.env.HOST || '127.0.0.1';
const port             = parseInt(process.env.PORT, 10) || 3000;
const httpsPort        = parseInt(process.env.HTTPS_PORT, 10) || 3443;
const tlsKeyPath       = process.env.TLS_KEY_PATH  || null;
const tlsCertPath      = process.env.TLS_CERT_PATH || null;

// CORS: explicit origin whitelist — never wildcard '*' (principle of least privilege)
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

// Rate limiting: 100 requests per 15-minute window per IP
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const rateLimitMax      = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100;

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------
const app = express();

// ===========================================================================
// 1. helmet() — Security headers FIRST
//    Sets 11 OWASP-recommended headers on EVERY response and removes
//    X-Powered-By to prevent technology fingerprinting.
//    Headers applied:
//      Content-Security-Policy, Cross-Origin-Opener-Policy,
//      Cross-Origin-Resource-Policy, Origin-Agent-Cluster,
//      Referrer-Policy, Strict-Transport-Security, X-Content-Type-Options,
//      X-DNS-Prefetch-Control, X-Download-Options, X-Frame-Options
//    Removed: X-Powered-By
// ===========================================================================
// Security: Sets 11 OWASP-recommended security headers and removes X-Powered-By
app.use(helmet());

// ===========================================================================
// 2. cors() — CORS policy SECOND
//    Evaluated before body parsing so unauthorized origins are rejected early.
//    Uses an explicit whitelist — never the wildcard '*'.
//    Allows only GET and POST to minimise the attack surface.
// ===========================================================================
// Security: Restricts cross-origin access to explicitly whitelisted origins
app.use(cors({
  origin: function corsOriginValidator(origin, callback) {
    // Allow requests that carry no Origin header (e.g. curl, mobile apps,
    // server-to-server calls, same-origin browser requests).
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],              // Restrict HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400                          // Cache preflight response for 24 hours
}));

// ===========================================================================
// 3. Body parsing — THIRD
//    JSON and URL-encoded bodies are accepted only up to 10 kb to prevent
//    payload-flooding / large-body denial-of-service attacks.
// ===========================================================================
// Security: Parses request bodies with 10kb size limit to prevent payload flooding
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ===========================================================================
// 4. express-rate-limit — FOURTH (applied globally before all route handlers)
//    Throttles each IP to rateLimitMax requests per rateLimitWindowMs.
//    Returns 429 Too Many Requests when the limit is exceeded.
//    Uses draft-8 standard RateLimit headers for client transparency.
// ===========================================================================
// Security: Rate limiting — 100 requests per 15 minutes per IP to prevent DoS and brute-force
const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  limit: rateLimitMax,
  standardHeaders: 'draft-8', // Emit RateLimit-{Limit,Remaining,Reset} headers
  legacyHeaders: false,        // Do not emit X-RateLimit-* legacy headers
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// ===========================================================================
// 5. Routes with per-route input validation
//    express-validator sanitises and validates all incoming request data to
//    prevent injection attacks (XSS, SQL injection, command injection).
//    Invalid input returns 400 Bad Request with a structured error body.
// ===========================================================================

// ---------------------------------------------------------------------------
// GET / — Root route
//    Preserves original server behaviour: "Hello, World!\n" with text/plain.
//    No user-supplied input is accepted on this endpoint, so no validator
//    chain is required.
// ---------------------------------------------------------------------------
// Preserves original server behavior: "Hello, World!\n" with text/plain
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('Hello, World!\n');
});

// ---------------------------------------------------------------------------
// POST / — Validated request body
//    Accepts an optional 'input' string field in the JSON body.
//    Trims whitespace and HTML-escapes the value to neutralise XSS payloads.
//    Returns 400 if validation fails, 200 with a JSON acknowledgement otherwise.
// ---------------------------------------------------------------------------
// Security: Input validation prevents injection attacks (XSS, SQL injection, command injection)
app.post(
  '/',
  [
    body('input')
      .optional()
      .isString()
      .withMessage('Input must be a string')
      .trim()
      .escape()
      .isLength({ max: 500 })
      .withMessage('Input must be a string with max 500 characters')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    res.status(200).json({ message: 'Request processed successfully' });
  }
);

// ---------------------------------------------------------------------------
// GET /search — Validated query string
//    Accepts an optional 'q' query parameter.
//    Trims whitespace and HTML-escapes the value to prevent reflected XSS.
//    Returns 400 if validation fails, 200 with sanitised search metadata otherwise.
// ---------------------------------------------------------------------------
app.get(
  '/search',
  [
    query('q')
      .optional()
      .isString()
      .withMessage('Query must be a string')
      .trim()
      .escape()
      .isLength({ max: 200 })
      .withMessage('Query must be a string with max 200 characters')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    res.status(200).json({ message: 'Search processed', query: req.query.q || '' });
  }
);

// ---------------------------------------------------------------------------
// GET /items/:id — Validated URL path parameter
//    Accepts a numeric 'id' path parameter.
//    Validates that the id is an integer to prevent injection via route params.
//    Returns 400 if validation fails, 200 with the validated item id otherwise.
// ---------------------------------------------------------------------------
// Security: Path-parameter validation prevents injection attacks via URL route params
app.get(
  '/items/:id',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Item id must be a positive integer')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    res.status(200).json({ message: 'Item retrieved', id: parseInt(req.params.id, 10) });
  }
);

// ===========================================================================
// 6. Error handling middleware — LAST in the middleware chain
//    Provides consistent, security-conscious error formatting.
//    CORS errors are surfaced as 403 Forbidden.
//    All other errors return a generic 500 Internal Server Error to avoid
//    leaking implementation details to potential attackers.
// ===========================================================================
// Security: Catches and formats security-related errors consistently
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation: Origin not allowed' });
  }

  // Log full stack trace server-side but never expose it to the client
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ===========================================================================
// 7. Server start-up — HTTP (always) + HTTPS (conditional, graceful degradation)
//    HTTP server always starts to ensure backward compatibility.
//    HTTPS server starts only when TLS_KEY_PATH and TLS_CERT_PATH are set
//    and the certificate files can be read.  If certificates are unavailable
//    the server falls back to HTTP-only mode with a console warning rather
//    than crashing.  Minimum TLS version is 1.2 per OWASP recommendations.
//
//    The start-up code is guarded by `require.main === module` so that when
//    this file is require()-d by test suites (e.g. require('./server')) the
//    servers are NOT auto-started, keeping test execution clean and portable.
// ===========================================================================

/* istanbul ignore next */
if (require.main === module) {
  // Always start the HTTP server
  app.listen(port, hostname, () => {
    console.log(`HTTP Server running at http://${hostname}:${port}/`);
  });

  // Conditionally start the HTTPS server — graceful degradation if certs missing
  if (tlsKeyPath && tlsCertPath) {
    try {
      const tlsOptions = {
        key:  fs.readFileSync(tlsKeyPath),
        cert: fs.readFileSync(tlsCertPath),
        minVersion: 'TLSv1.2' // Security: Enforce minimum TLS 1.2 per OWASP
      };

      https.createServer(tlsOptions, app).listen(httpsPort, hostname, () => {
        console.log(`HTTPS Server running at https://${hostname}:${httpsPort}/`);
      });
    } catch (err) {
      console.warn(
        'Warning: HTTPS server not started — TLS certificate files could not be read:',
        err.message
      );
      console.warn('Server is running in HTTP-only mode.');
    }
  } else {
    console.warn('Warning: TLS_KEY_PATH and TLS_CERT_PATH not set. HTTPS server not started.');
    console.warn('Server is running in HTTP-only mode.');
  }
}

// ---------------------------------------------------------------------------
// Export the Express application for use in automated tests.
// This follows the CommonJS pattern for testable Node.js applications.
// ---------------------------------------------------------------------------
module.exports = app;
