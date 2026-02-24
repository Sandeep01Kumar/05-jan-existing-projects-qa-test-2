/**
 * tests/security/test_cors.js
 *
 * CORS Policy Enforcement Security Tests
 * =======================================
 *
 * Verifies that the secured Express server (server.js) correctly enforces all
 * CORS (Cross-Origin Resource Sharing) policies implemented via cors@2.8.6:
 *
 *   CORS Configuration (from server.js):
 *     - allowedOrigins : ['http://localhost:3000'] (configurable via CORS_ORIGINS env var)
 *     - methods        : ['GET', 'POST']
 *     - allowedHeaders : ['Content-Type', 'Authorization']
 *     - credentials    : true
 *     - maxAge         : 86400 (preflight cache — 24 hours)
 *
 *   Enforcement Rules:
 *     - Requests from whitelisted origins  → 200 with correct Access-Control headers
 *     - Requests from non-whitelisted origins → 403 with CORS policy violation body
 *     - Requests with no Origin header (curl/server-to-server) → Allowed (200)
 *     - OPTIONS preflight from allowed origin → 204 with full CORS headers
 *     - OPTIONS preflight from disallowed origin → 403
 *     - Access-Control-Allow-Credentials must be 'true' for allowed origins
 *
 * This file uses ONLY Node.js built-in modules (http, assert) and the
 * application module from server.js. No external test framework is required.
 *
 * AAP references: §0.5.1, §0.6.3, §0.8.1, §0.11.1
 */

'use strict';

// ---------------------------------------------------------------------------
// Built-in imports
// ---------------------------------------------------------------------------
const http   = require('http');
const assert = require('assert');

// ---------------------------------------------------------------------------
// Application under test
// Import the Express app instance exported by server.js.
// The startup block (HTTP / HTTPS server.listen()) is guarded by
// `require.main === module`, so requiring the module here does NOT start
// a real server — only the Express app object is returned.
// ---------------------------------------------------------------------------
const app = require('../../server');

// ---------------------------------------------------------------------------
// Test server — listen on port 0 so the OS assigns a random available port,
// preventing any conflict with the production server running on port 3000.
// ---------------------------------------------------------------------------
const server = app.listen(0);
const port   = server.address().port;

// ---------------------------------------------------------------------------
// Test state
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * recordPass — Log a test success and increment the pass counter.
 * @param {string} testName - Human-readable test description.
 */
function recordPass(testName) {
  console.log(`  ✓ PASS: ${testName}`);
  passed++;
}

/**
 * recordFail — Log a test failure and increment the fail counter.
 * @param {string} testName - Human-readable test description.
 * @param {Error|string} err - The assertion error or message.
 */
function recordFail(testName, err) {
  console.error(`  ✗ FAIL: ${testName}`);
  console.error(`         ${err instanceof Error ? err.message : err}`);
  failed++;
}

/**
 * makeRequest — Perform an HTTP request using http.request() and return a
 * Promise that resolves with { statusCode, headers, body }.
 *
 * Supports custom methods (GET, POST, OPTIONS) and arbitrary request headers
 * (including Origin, Access-Control-Request-Method, Access-Control-Request-Headers)
 * which are required to exercise all CORS scenarios: allowed origin, disallowed
 * origin, no-origin, and OPTIONS preflight.
 *
 * @param {string} urlPath - Path, e.g. '/'
 * @param {Object} [options={}] - Optional request options:
 *   @param {string} [options.method='GET']  - HTTP method
 *   @param {Object} [options.headers={}]    - Custom request headers
 *   @param {string} [options.body='']       - Optional request body string
 * @returns {Promise<{statusCode: number, headers: Object, body: string}>}
 */
function makeRequest(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const method  = options.method  || 'GET';
    const headers = options.headers || {};
    const bodyStr = options.body    || '';

    // Include Content-Length only when a body is present so that the
    // server's body-parser does not stall waiting for more data.
    if (bodyStr.length > 0 && !headers['Content-Length']) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr, 'utf8');
    }

    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path:   urlPath,
      method,
      headers
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end',  () => {
        resolve({
          statusCode: res.statusCode,
          headers:    res.headers,
          body:       data
        });
      });
    });

    req.on('error', reject);

    if (bodyStr.length > 0) {
      req.write(bodyStr);
    }

    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

/**
 * runTests — Execute all 6 CORS enforcement test cases sequentially, print a
 * summary, close the test server, and exit with an appropriate exit code.
 */
async function runTests() {
  console.log('\n=== CORS Policy Enforcement Security Tests ===\n');

  // =========================================================================
  // Test 1: Request from allowed origin receives Access-Control-Allow-Origin header
  //
  // When the client sends a request with the Origin header set to an allowed
  // origin (http://localhost:3000), the cors middleware must respond with the
  // access-control-allow-origin header set to the exact origin value.
  // HTTP status code must be 200 OK because the origin is whitelisted.
  //
  // AAP §0.8.1: "Requests from allowed origins receive Access-Control-Allow-Origin header"
  // =========================================================================
  {
    const testName = 'Request from allowed origin receives Access-Control-Allow-Origin header';
    try {
      const result = await makeRequest('/', {
        method:  'GET',
        headers: { Origin: 'http://localhost:3000' }
      });

      assert.strictEqual(
        result.statusCode,
        200,
        `Expected HTTP 200 for allowed origin, got ${result.statusCode}`
      );

      assert.ok(
        'access-control-allow-origin' in result.headers,
        'Expected access-control-allow-origin header to be present'
      );

      assert.strictEqual(
        result.headers['access-control-allow-origin'],
        'http://localhost:3000',
        `Expected access-control-allow-origin to equal "http://localhost:3000", ` +
        `got "${result.headers['access-control-allow-origin']}"`
      );

      recordPass(testName);
    } catch (err) {
      recordFail(testName, err);
    }
  }

  // =========================================================================
  // Test 2: Request from non-allowed origin is blocked
  //
  // When the client sends a request with an Origin header whose value is not
  // in the allowedOrigins whitelist, the cors middleware invokes the error
  // callback with new Error('Not allowed by CORS').  The server's error handler
  // intercepts this and responds with HTTP 403 and a JSON body containing
  // { error: 'CORS policy violation: Origin not allowed' }.
  //
  // The test accepts either:
  //   a) HTTP 403 — meaning the error handler fired correctly, OR
  //   b) Absence of access-control-allow-origin header — meaning no CORS grant
  //      was issued (also a correct rejection outcome)
  //
  // If a body is present in a 403 response, it must describe the CORS violation.
  //
  // AAP §0.8.1: "Requests from non-allowed origins are blocked"
  // =========================================================================
  {
    const testName = 'Request from non-allowed origin is blocked';
    try {
      const result = await makeRequest('/', {
        method:  'GET',
        headers: { Origin: 'http://malicious.example.com' }
      });

      // The cors middleware + error handler must reject disallowed origins.
      // Accept either 403 (explicit rejection) or absence of CORS header
      // (silent rejection without the Access-Control-Allow-Origin grant).
      const blockedByStatus  = result.statusCode === 403;
      const blockedByHeaders = !('access-control-allow-origin' in result.headers);

      assert.ok(
        blockedByStatus || blockedByHeaders,
        `Expected 403 status OR absence of access-control-allow-origin header for ` +
        `disallowed origin. Got status ${result.statusCode} and headers: ` +
        JSON.stringify(Object.keys(result.headers))
      );

      // If a JSON body was returned with a 403, it must name the CORS violation.
      if (blockedByStatus && result.body) {
        let parsed = null;
        try { parsed = JSON.parse(result.body); } catch (_) { /* non-JSON body is fine */ }
        if (parsed && parsed.error) {
          assert.ok(
            parsed.error.toLowerCase().includes('cors') ||
            parsed.error.toLowerCase().includes('origin') ||
            parsed.error.toLowerCase().includes('not allowed'),
            `Expected 403 body to mention CORS or origin violation, got: "${parsed.error}"`
          );
        }
      }

      recordPass(testName);
    } catch (err) {
      recordFail(testName, err);
    }
  }

  // =========================================================================
  // Test 3: Request with no Origin header (like curl) is allowed
  //
  // Server-to-server requests, CLI tools (curl), and mobile apps that do not
  // enforce the browser CORS policy typically omit the Origin header.
  // The cors middleware is configured to allow such requests unconditionally
  // (`if (!origin) return callback(null, true)`).
  // These requests must receive a 200 OK with the "Hello, World!\n" body.
  //
  // AAP §0.5.1: "Allow requests with no origin (e.g. curl, mobile apps, server-to-server calls)"
  // =========================================================================
  {
    const testName = 'Request with no Origin header (curl-like) is allowed';
    try {
      // Omit the Origin header entirely — makeRequest uses no default Origin
      const result = await makeRequest('/', {
        method: 'GET'
      });

      assert.strictEqual(
        result.statusCode,
        200,
        `Expected HTTP 200 for no-origin request, got ${result.statusCode}`
      );

      assert.ok(
        result.body.includes('Hello, World!'),
        `Expected response body to contain "Hello, World!", got: "${result.body}"`
      );

      recordPass(testName);
    } catch (err) {
      recordFail(testName, err);
    }
  }

  // =========================================================================
  // Test 4: OPTIONS preflight request from allowed origin returns CORS headers
  //
  // Browser CORS preflight requests are HTTP OPTIONS requests sent before
  // the actual cross-origin request.  The cors middleware must respond to them
  // with HTTP 204 (No Content) or 200 and include all required CORS headers:
  //   - access-control-allow-origin  : matching the requested origin
  //   - access-control-allow-methods : listing the permitted HTTP methods
  //   - access-control-allow-headers : listing the permitted request headers
  //   - access-control-max-age       : preflight cache duration (86400 seconds)
  //
  // The presence of these headers tells the browser it is safe to proceed with
  // the actual request.
  //
  // AAP §0.6.3: maxAge: 86400; methods: ['GET', 'POST']; allowedHeaders: ['Content-Type', 'Authorization']
  // =========================================================================
  {
    const testName = 'OPTIONS preflight from allowed origin returns correct CORS headers';
    try {
      const result = await makeRequest('/', {
        method: 'OPTIONS',
        headers: {
          'Origin':                         'http://localhost:3000',
          'Access-Control-Request-Method':  'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      // OPTIONS preflight should return 204 No Content or 200 OK
      assert.ok(
        result.statusCode === 204 || result.statusCode === 200,
        `Expected 204 or 200 for OPTIONS preflight from allowed origin, got ${result.statusCode}`
      );

      // Must echo the allowed origin back
      assert.ok(
        'access-control-allow-origin' in result.headers,
        'Expected access-control-allow-origin header on OPTIONS preflight response'
      );
      assert.strictEqual(
        result.headers['access-control-allow-origin'],
        'http://localhost:3000',
        `Expected access-control-allow-origin "http://localhost:3000", ` +
        `got "${result.headers['access-control-allow-origin']}"`
      );

      // Must include allowed methods
      assert.ok(
        'access-control-allow-methods' in result.headers,
        'Expected access-control-allow-methods header on OPTIONS preflight response'
      );
      const allowedMethods = result.headers['access-control-allow-methods'];
      assert.ok(
        allowedMethods.includes('GET') && allowedMethods.includes('POST'),
        `Expected access-control-allow-methods to include GET and POST, got: "${allowedMethods}"`
      );

      // Must include allowed headers
      assert.ok(
        'access-control-allow-headers' in result.headers,
        'Expected access-control-allow-headers header on OPTIONS preflight response'
      );
      const allowedHeaders = result.headers['access-control-allow-headers'];
      assert.ok(
        allowedHeaders.toLowerCase().includes('content-type'),
        `Expected access-control-allow-headers to include Content-Type, got: "${allowedHeaders}"`
      );

      // Must include max-age for preflight caching (86400 = 24 hours per AAP §0.6.3)
      assert.ok(
        'access-control-max-age' in result.headers,
        'Expected access-control-max-age header on OPTIONS preflight response'
      );
      assert.strictEqual(
        String(result.headers['access-control-max-age']),
        '86400',
        `Expected access-control-max-age to be "86400", ` +
        `got "${result.headers['access-control-max-age']}"`
      );

      recordPass(testName);
    } catch (err) {
      recordFail(testName, err);
    }
  }

  // =========================================================================
  // Test 5: OPTIONS preflight request from non-allowed origin is rejected
  //
  // A preflight OPTIONS request carrying a disallowed Origin must not be granted.
  // The cors middleware invokes its error callback, which causes Express to call
  // the error handling middleware that returns HTTP 403.
  // As with Test 2, the test accepts either:
  //   a) HTTP 403, OR
  //   b) Absence of access-control-allow-origin in the response headers
  //
  // AAP §0.8.1: "Requests from non-allowed origins are blocked (no CORS headers returned)"
  // =========================================================================
  {
    const testName = 'OPTIONS preflight from non-allowed origin is rejected';
    try {
      const result = await makeRequest('/', {
        method: 'OPTIONS',
        headers: {
          'Origin':                        'http://evil.example.com',
          'Access-Control-Request-Method': 'POST'
        }
      });

      const blockedByStatus  = result.statusCode === 403;
      const blockedByHeaders = !('access-control-allow-origin' in result.headers);

      assert.ok(
        blockedByStatus || blockedByHeaders,
        `Expected 403 status OR absence of access-control-allow-origin header for ` +
        `disallowed origin on OPTIONS preflight. Got status ${result.statusCode} and ` +
        `headers: ${JSON.stringify(Object.keys(result.headers))}`
      );

      recordPass(testName);
    } catch (err) {
      recordFail(testName, err);
    }
  }

  // =========================================================================
  // Test 6: Access-Control-Allow-Credentials header is present for allowed origins
  //
  // The cors middleware is configured with `credentials: true`, which instructs
  // it to set the `access-control-allow-credentials: true` header on all
  // responses to requests from allowed origins.  This header is required for
  // browsers to expose the response to JavaScript when credentials (cookies,
  // HTTP authentication) are included in the cross-origin request.
  //
  // AAP §0.6.3: credentials: true
  // =========================================================================
  {
    const testName = 'Access-Control-Allow-Credentials is present for allowed origins';
    try {
      const result = await makeRequest('/', {
        method:  'GET',
        headers: { Origin: 'http://localhost:3000' }
      });

      assert.ok(
        'access-control-allow-credentials' in result.headers,
        'Expected access-control-allow-credentials header to be present for allowed origin'
      );

      assert.strictEqual(
        result.headers['access-control-allow-credentials'],
        'true',
        `Expected access-control-allow-credentials to be "true", ` +
        `got "${result.headers['access-control-allow-credentials']}"`
      );

      recordPass(testName);
    } catch (err) {
      recordFail(testName, err);
    }
  }

  // =========================================================================
  // Summary and cleanup
  // =========================================================================
  const total = passed + failed;
  console.log('\n--- Test Summary ---');
  console.log(`Total  : ${total}`);
  console.log(`Passed : ${passed}`);
  console.log(`Failed : ${failed}`);

  // Close the test server so the Node.js process can exit cleanly.
  // The callback is invoked once all in-flight connections have been closed.
  server.close(() => {
    if (failed > 0) {
      console.error(`\n${failed} test(s) failed. Exiting with code 1.`);
      process.exit(1);
    } else {
      console.log('\nAll CORS policy enforcement tests passed. Exiting with code 0.');
      process.exit(0);
    }
  });
}

// ---------------------------------------------------------------------------
// Entry point — run all tests; any unhandled rejection surfaces as a failure.
// ---------------------------------------------------------------------------
runTests().catch((err) => {
  console.error('Test suite encountered an unhandled error:', err);
  server.close(() => process.exit(1));
});
