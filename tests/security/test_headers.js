/**
 * tests/security/test_headers.js
 *
 * Security Header Verification Tests
 * ====================================
 *
 * Verifies that the secured Express server (server.js) sets all 11 OWASP-
 * recommended HTTP security headers via helmet@8.1.0 middleware, and that the
 * Express default X-Powered-By header is suppressed.
 *
 *   Headers verified (helmet@8.1.0 defaults):
 *     1.  content-security-policy        — must contain 'default-src'
 *     2.  strict-transport-security      — must contain 'max-age='
 *     3.  x-content-type-options         — must equal 'nosniff'
 *     4.  cross-origin-opener-policy     — must equal 'same-origin'
 *     5.  cross-origin-resource-policy   — must equal 'same-origin'
 *     6.  referrer-policy                — must equal 'no-referrer'
 *     7.  x-powered-by                   — must be ABSENT (helmet removes it)
 *     8.  x-dns-prefetch-control         — must equal 'off'
 *     9.  x-download-options             — must equal 'noopen'
 *     10. x-frame-options                — must equal 'SAMEORIGIN'
 *     11. x-xss-protection               — must equal '0'
 *     12. origin-agent-cluster           — must equal '?1'
 *
 * This file uses ONLY Node.js built-in modules (http, assert) and the
 * application module from server.js. No external test framework is required.
 *
 * AAP references: §0.5.1, §0.5.2, §0.8.1, §0.11.1
 */

'use strict';

// ---------------------------------------------------------------------------
// Built-in imports
// ---------------------------------------------------------------------------
const http   = require('http');
const assert = require('assert');

// ---------------------------------------------------------------------------
// Application under test.
// Import the Express app instance exported by server.js.
// The startup block (HTTP / HTTPS server.listen()) is guarded by
// `require.main === module`, so requiring the module here does NOT start
// a real server — only the Express app object is returned.
// ---------------------------------------------------------------------------
const app = require('../../server');

// ---------------------------------------------------------------------------
// Test server — listen on port 0 so the OS assigns a random available port,
// preventing any conflict with a production server running on port 3000.
// ---------------------------------------------------------------------------
const server = app.listen(0);
const port   = server.address().port;

// ---------------------------------------------------------------------------
// Test state trackers
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
 * @param {Error|string} err - The assertion error or descriptive message.
 */
function recordFail(testName, err) {
  console.error(`  ✗ FAIL: ${testName}`);
  console.error(`         ${err instanceof Error ? err.message : err}`);
  failed++;
}

/**
 * makeRequest — Perform an HTTP GET request using http.get() and return a
 * Promise that resolves with { statusCode, headers, body }.
 *
 * All security header tests send GET requests to the root path "/" and inspect
 * the response headers returned by the running Express + helmet middleware
 * stack, without needing to inspect the response body for most checks.
 *
 * @param {string} urlPath - Request path, e.g. '/'
 * @param {Object} [options={}] - Optional overrides:
 *   @param {Object} [options.headers={}]  - Extra request headers to send
 * @returns {Promise<{statusCode: number, headers: Object, body: string}>}
 */
function makeRequest(urlPath, options) {
  const reqOptions = options || {};
  const requestHeaders = reqOptions.headers || {};

  return new Promise((resolve, reject) => {
    const url = `http://127.0.0.1:${port}${urlPath}`;

    const req = http.get(url, { headers: requestHeaders }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Individual security header test functions
// Each test follows the same structure:
//   1. Make a GET request to the root path
//   2. Use assert to verify the expected header condition
//   3. Call recordPass() or recordFail() to track the outcome
// ---------------------------------------------------------------------------

/**
 * testContentSecurityPolicy — Test 1
 * Verifies that the Content-Security-Policy header is present and contains
 * the 'default-src' directive, which is the mandatory baseline CSP directive
 * set by helmet's csp() sub-module.
 *
 * OWASP relevance: Prevents XSS by controlling which resources the browser
 * is allowed to load.
 */
async function testContentSecurityPolicy() {
  const testName = 'Content-Security-Policy header is present and contains default-src';
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['content-security-policy'],
      'content-security-policy header must be present'
    );
    assert.ok(
      headers['content-security-policy'].includes('default-src'),
      `content-security-policy must contain 'default-src' — got: ${headers['content-security-policy']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testStrictTransportSecurity — Test 2
 * Verifies that the Strict-Transport-Security (HSTS) header is present and
 * contains 'max-age=', which instructs browsers to use HTTPS only for the
 * specified duration.
 *
 * OWASP relevance: Prevents protocol downgrade attacks and cookie hijacking.
 */
async function testStrictTransportSecurity() {
  const testName = 'Strict-Transport-Security header is present and contains max-age=';
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['strict-transport-security'],
      'strict-transport-security header must be present'
    );
    assert.ok(
      headers['strict-transport-security'].includes('max-age='),
      `strict-transport-security must contain 'max-age=' — got: ${headers['strict-transport-security']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testXContentTypeOptions — Test 3
 * Verifies that the X-Content-Type-Options header equals 'nosniff', which
 * prevents browsers from performing MIME-type sniffing (interpreting files
 * as a different MIME type than declared).
 *
 * OWASP relevance: Prevents MIME confusion attacks and drive-by-downloads.
 */
async function testXContentTypeOptions() {
  const testName = "X-Content-Type-Options header equals 'nosniff'";
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['x-content-type-options'],
      'x-content-type-options header must be present'
    );
    assert.strictEqual(
      headers['x-content-type-options'],
      'nosniff',
      `x-content-type-options must equal 'nosniff' — got: ${headers['x-content-type-options']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testCrossOriginOpenerPolicy — Test 4
 * Verifies that the Cross-Origin-Opener-Policy header equals 'same-origin',
 * which isolates the browsing context from cross-origin documents and prevents
 * cross-origin window attacks (e.g., Spectre-based timing attacks).
 *
 * OWASP relevance: Prevents cross-origin information leakage via shared
 * browsing context groups.
 */
async function testCrossOriginOpenerPolicy() {
  const testName = "Cross-Origin-Opener-Policy header equals 'same-origin'";
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['cross-origin-opener-policy'],
      'cross-origin-opener-policy header must be present'
    );
    assert.strictEqual(
      headers['cross-origin-opener-policy'],
      'same-origin',
      `cross-origin-opener-policy must equal 'same-origin' — got: ${headers['cross-origin-opener-policy']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testCrossOriginResourcePolicy — Test 5
 * Verifies that the Cross-Origin-Resource-Policy header equals 'same-origin',
 * which restricts cross-origin loading of the resource, preventing cross-site
 * resource injection attacks.
 *
 * OWASP relevance: Prevents cross-origin data exfiltration via resource embedding.
 */
async function testCrossOriginResourcePolicy() {
  const testName = "Cross-Origin-Resource-Policy header equals 'same-origin'";
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['cross-origin-resource-policy'],
      'cross-origin-resource-policy header must be present'
    );
    assert.strictEqual(
      headers['cross-origin-resource-policy'],
      'same-origin',
      `cross-origin-resource-policy must equal 'same-origin' — got: ${headers['cross-origin-resource-policy']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testReferrerPolicy — Test 6
 * Verifies that the Referrer-Policy header equals 'no-referrer', which
 * instructs the browser not to include the Referer header in requests,
 * preventing referrer information leakage to third parties.
 *
 * OWASP relevance: Prevents information disclosure via the Referer header.
 */
async function testReferrerPolicy() {
  const testName = "Referrer-Policy header equals 'no-referrer'";
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['referrer-policy'],
      'referrer-policy header must be present'
    );
    assert.strictEqual(
      headers['referrer-policy'],
      'no-referrer',
      `referrer-policy must equal 'no-referrer' — got: ${headers['referrer-policy']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testXPoweredByAbsent — Test 7
 * Verifies that the X-Powered-By header is ABSENT from the response.
 * Express sets this header by default with the value 'Express', exposing
 * server technology information to potential attackers. Helmet removes it.
 *
 * OWASP relevance: Prevents technology fingerprinting and targeted exploitation
 * of known framework vulnerabilities.
 */
async function testXPoweredByAbsent() {
  const testName = 'X-Powered-By header is absent (helmet removes Express fingerprint)';
  try {
    const { headers } = await makeRequest('/');
    assert.strictEqual(
      headers['x-powered-by'],
      undefined,
      `x-powered-by header must be absent (technology fingerprinting prevention) — got: ${headers['x-powered-by']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testXDnsPrefetchControl — Test 8
 * Verifies that the X-DNS-Prefetch-Control header equals 'off', which
 * disables browser DNS prefetching. DNS prefetching can leak user activity
 * to DNS servers even when not actively browsing.
 *
 * OWASP relevance: Reduces privacy leakage via covert DNS lookups.
 */
async function testXDnsPrefetchControl() {
  const testName = "X-DNS-Prefetch-Control header equals 'off'";
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['x-dns-prefetch-control'],
      'x-dns-prefetch-control header must be present'
    );
    assert.strictEqual(
      headers['x-dns-prefetch-control'],
      'off',
      `x-dns-prefetch-control must equal 'off' — got: ${headers['x-dns-prefetch-control']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testXDownloadOptions — Test 9
 * Verifies that the X-Download-Options header equals 'noopen', which
 * prevents Internet Explorer from executing downloaded files in the context
 * of the site. This IE-specific header prevents drive-by-download exploits.
 *
 * OWASP relevance: Prevents IE-specific drive-by-download attacks.
 */
async function testXDownloadOptions() {
  const testName = "X-Download-Options header equals 'noopen'";
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['x-download-options'],
      'x-download-options header must be present'
    );
    assert.strictEqual(
      headers['x-download-options'],
      'noopen',
      `x-download-options must equal 'noopen' — got: ${headers['x-download-options']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testXFrameOptions — Test 10
 * Verifies that the X-Frame-Options header equals 'SAMEORIGIN', which
 * prevents the page from being embedded in an iframe on a different origin.
 * This is the clickjacking defense mechanism provided by helmet's frameguard.
 *
 * OWASP relevance: Prevents UI redress (clickjacking) attacks where attackers
 * overlay the legitimate page with a transparent malicious iframe.
 */
async function testXFrameOptions() {
  const testName = "X-Frame-Options header equals 'SAMEORIGIN'";
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['x-frame-options'],
      'x-frame-options header must be present'
    );
    assert.strictEqual(
      headers['x-frame-options'],
      'SAMEORIGIN',
      `x-frame-options must equal 'SAMEORIGIN' — got: ${headers['x-frame-options']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testXXssProtection — Test 11
 * Verifies that the X-XSS-Protection header equals '0'. Helmet deliberately
 * sets this to '0' (disabled) because the browser's built-in XSS auditor
 * introduced its own security vulnerabilities in older browsers and is now
 * deprecated in modern browsers; CSP supersedes it.
 *
 * OWASP relevance: The CSP header (Test 1) provides superior XSS protection;
 * disabling X-XSS-Protection prevents the auditor from being weaponised.
 */
async function testXXssProtection() {
  const testName = "X-XSS-Protection header equals '0' (disabled — CSP provides superior protection)";
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['x-xss-protection'] !== undefined,
      'x-xss-protection header must be present'
    );
    assert.strictEqual(
      headers['x-xss-protection'],
      '0',
      `x-xss-protection must equal '0' — got: ${headers['x-xss-protection']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

/**
 * testOriginAgentCluster — Test 12
 * Verifies that the Origin-Agent-Cluster header equals '?1', which requests
 * origin-keyed agent clustering from the browser. This isolates the origin's
 * resources (memory, CPU) from cross-origin pages, strengthening the
 * security boundary against Spectre-class side-channel attacks.
 *
 * OWASP relevance: Prevents cross-origin information leakage via shared
 * agent cluster resources (Spectre-class side-channel attack mitigation).
 */
async function testOriginAgentCluster() {
  const testName = "Origin-Agent-Cluster header equals '?1'";
  try {
    const { headers } = await makeRequest('/');
    assert.ok(
      headers['origin-agent-cluster'],
      'origin-agent-cluster header must be present'
    );
    assert.strictEqual(
      headers['origin-agent-cluster'],
      '?1',
      `origin-agent-cluster must equal '?1' — got: ${headers['origin-agent-cluster']}`
    );
    recordPass(testName);
  } catch (err) {
    recordFail(testName, err);
  }
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

/**
 * runTests — Orchestrates all 12 security header tests sequentially.
 *
 * Execution order:
 *   Tests 1–6  : Positive assertions — headers must be present with exact values
 *   Test  7    : Negative assertion  — X-Powered-By must be ABSENT
 *   Tests 8–12 : Positive assertions — additional headers must be present
 *
 * After all tests complete:
 *   - The test HTTP server is closed to release the port
 *   - A summary line is printed with counts of passed/failed tests
 *   - process.exit(0) is called if all tests passed; process.exit(1) otherwise
 */
async function runTests() {
  console.log('\nSecurity Header Verification Tests');
  console.log('===================================');
  console.log(`Test server listening on http://127.0.0.1:${port}/\n`);

  // Run all 12 tests in order — each test is self-contained and makes its
  // own HTTP request, so sequencing prevents port conflicts and makes
  // output deterministic.
  await testContentSecurityPolicy();      // Test  1: CSP
  await testStrictTransportSecurity();    // Test  2: HSTS
  await testXContentTypeOptions();        // Test  3: X-Content-Type-Options
  await testCrossOriginOpenerPolicy();    // Test  4: COOP
  await testCrossOriginResourcePolicy();  // Test  5: CORP
  await testReferrerPolicy();             // Test  6: Referrer-Policy
  await testXPoweredByAbsent();           // Test  7: X-Powered-By ABSENT
  await testXDnsPrefetchControl();        // Test  8: X-DNS-Prefetch-Control
  await testXDownloadOptions();           // Test  9: X-Download-Options
  await testXFrameOptions();              // Test 10: X-Frame-Options
  await testXXssProtection();             // Test 11: X-XSS-Protection
  await testOriginAgentCluster();         // Test 12: Origin-Agent-Cluster

  // ---------------------------------------------------------------------------
  // Cleanup — close the test server to release the OS port and allow the
  // process to exit cleanly.
  // ---------------------------------------------------------------------------
  await new Promise((resolve) => server.close(resolve));

  // ---------------------------------------------------------------------------
  // Results summary
  // ---------------------------------------------------------------------------
  const total = passed + failed;
  console.log('\n-----------------------------------');
  console.log(`Results: ${passed}/${total} tests passed`);
  if (failed > 0) {
    console.error(`         ${failed} test(s) FAILED`);
  }
  console.log('-----------------------------------\n');

  // Exit with code 0 if all tests passed, 1 if any failed.
  // This allows CI pipelines to detect test failures via the exit code.
  process.exit(failed > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Entry point — run the test suite, catching any unexpected top-level errors
// (e.g. a failure to connect to the test server) with a descriptive message.
// ---------------------------------------------------------------------------
runTests().catch((err) => {
  console.error('\nFATAL: Test suite encountered an unexpected error:');
  console.error(err);
  server.close();
  process.exit(1);
});
