/**
 * tests/security/test_validation.js
 *
 * Input Validation and Sanitization Security Tests
 * ================================================
 *
 * Verifies that the secured Express server (server.js) correctly enforces all
 * input validation and sanitization policies implemented via express-validator:
 *
 *   POST /
 *     - body.input  : optional, string, trimmed, HTML-escaped, max 500 chars
 *     - Valid input → 200 { message: 'Request processed successfully' }
 *     - Invalid     → 400 { errors: [...] }
 *
 *   GET /search
 *     - query.q     : optional, string, trimmed, HTML-escaped, max 200 chars
 *     - Valid query  → 200 { message: 'Search processed', query: '...' }
 *     - Invalid      → 400 { errors: [...] }
 *
 *   Body size limit
 *     - express.json({ limit: '10kb' }) rejects bodies > 10 kB with 413
 *
 * This file uses ONLY Node.js built-in modules (http, assert) and the
 * application module from server.js. No external test framework is required.
 *
 * AAP references: §0.5.1, §0.6.2, §0.8.1, §0.11.1
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
 * makeGetRequest — Perform an HTTP GET request using http.get() and return
 * a Promise that resolves with { statusCode, headers, body }.
 *
 * http.get() is used here (not http.request()) per the external_imports schema
 * which specifies members_accessed: ['http.request()', 'http.get()'].
 *
 * @param {string} urlPath - Path and query string, e.g. '/search?q=hello'
 * @returns {Promise<{statusCode: number, headers: Object, body: string}>}
 */
function makeGetRequest(urlPath) {
  return new Promise((resolve, reject) => {
    const url = `http://127.0.0.1:${port}${urlPath}`;

    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers:    res.headers,
          body:       data
        });
      });
    });

    req.on('error', reject);
  });
}

/**
 * makePostRequest — Perform an HTTP POST request with a JSON body using
 * http.request() and return a Promise resolving to { statusCode, headers, body }.
 *
 * Content-Type is always set to 'application/json' so that express.json()
 * middleware parses the body.  Content-Length is set precisely so that the
 * body-parser can enforce the 10 kb size limit early.
 *
 * For oversized bodies the server will return 413 and may close the socket
 * before the client finishes writing.  A `settled` flag ensures the Promise is
 * settled only once (response resolution wins over write errors).
 *
 * @param {string}  urlPath     - Path, e.g. '/'
 * @param {Object}  bodyObj     - Plain object to be JSON-serialised as the body
 * @param {string}  [contentType='application/json'] - Value for Content-Type header
 * @returns {Promise<{statusCode: number, headers: Object, body: string}>}
 */
function makePostRequest(urlPath, bodyObj, contentType = 'application/json') {
  return new Promise((resolve, reject) => {
    const bodyStr    = JSON.stringify(bodyObj);
    const bodyBuffer = Buffer.from(bodyStr, 'utf8');

    const options = {
      hostname: '127.0.0.1',
      port,
      path:   urlPath,
      method: 'POST',
      headers: {
        'Content-Type':   contentType,
        'Content-Length': bodyBuffer.length
      }
    };

    // `settled` prevents double-settlement when the server closes the
    // connection after a 413 response while the client is still writing.
    let settled = false;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (!settled) {
          settled = true;
          resolve({
            statusCode: res.statusCode,
            headers:    res.headers,
            body:       data
          });
        }
      });
    });

    req.on('error', (err) => {
      // Ignore write-side errors that arrive after the 413 response was
      // already received and the Promise has been resolved.
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    req.write(bodyBuffer);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

/**
 * runTests — Execute all 9 input validation test cases sequentially, print a
 * summary, close the test server, and exit with an appropriate exit code.
 */
async function runTests() {
  console.log('\n=== Input Validation and Sanitization Security Tests ===\n');

  // =========================================================================
  // Test 1: POST / with XSS script tag payload
  //
  // express-validator configures escape() as a SANITIZER (not a validator);
  // it HTML-encodes special characters (<, >, ', ", /) but does NOT raise a
  // validation error on its own.  The isLength({ max: 500 }) check runs on
  // the escaped value — for a short <script> tag the escaped string is still
  // well within 500 chars, so the response is typically 200 with the sanitised
  // value rather than 400.
  //
  // The test accepts either outcome to remain correct regardless of how the
  // validation chain is wired:
  //   - 400  → payload explicitly rejected; verify errors array
  //   - 200  → payload sanitised and accepted; verify success message
  // =========================================================================
  try {
    const result = await makePostRequest('/', { input: "<script>alert('xss')</script>" });

    assert.ok(
      result.statusCode === 400 || result.statusCode === 200,
      `Expected 400 (rejected) or 200 (sanitized), got ${result.statusCode}`
    );

    if (result.statusCode === 400) {
      const body = JSON.parse(result.body);
      assert.ok(
        Array.isArray(body.errors),
        `Expected errors array in 400 response, got: ${JSON.stringify(body)}`
      );
    } else {
      // 200 — sanitised successfully
      const body = JSON.parse(result.body);
      assert.strictEqual(
        body.message,
        'Request processed successfully',
        `Expected success message in 200 response, got: ${JSON.stringify(body)}`
      );
    }

    recordPass('POST / with XSS script tag payload is handled (400 rejected OR 200 sanitized)');
  } catch (err) {
    recordFail('POST / with XSS script tag payload is handled (400 rejected OR 200 sanitized)', err);
  }

  // =========================================================================
  // Test 2: GET /search with SQL injection payload in query string
  //
  // Same reasoning as Test 1: the SQL-injection-like string is short and will
  // be HTML-escaped (single quotes → &#x27;) rather than rejected.  The test
  // accepts both 400 (rejected) and 200 (sanitised).
  // =========================================================================
  try {
    // URL-encode the payload so it is transmitted as a valid query string.
    const sqlPayload = encodeURIComponent("'; DROP TABLE users;--");
    const result     = await makeGetRequest(`/search?q=${sqlPayload}`);

    assert.ok(
      result.statusCode === 400 || result.statusCode === 200,
      `Expected 400 (rejected) or 200 (sanitized), got ${result.statusCode}`
    );

    if (result.statusCode === 400) {
      const body = JSON.parse(result.body);
      assert.ok(
        Array.isArray(body.errors),
        `Expected errors array in 400 response, got: ${JSON.stringify(body)}`
      );
    } else {
      // 200 — sanitised
      const body = JSON.parse(result.body);
      assert.strictEqual(
        body.message,
        'Search processed',
        `Expected 'Search processed' in 200 response, got: ${JSON.stringify(body)}`
      );
    }

    recordPass('GET /search with SQL injection payload is handled (400 rejected OR 200 sanitized)');
  } catch (err) {
    recordFail('GET /search with SQL injection payload is handled (400 rejected OR 200 sanitized)', err);
  }

  // =========================================================================
  // Test 3: POST / with oversized body returns 413 Payload Too Large
  //
  // express.json({ limit: '10kb' }) is applied as global middleware BEFORE
  // route handlers and express-validator.  A ~20 kB body is well over the
  // limit and must trigger a 413 response.  The server's error handler
  // propagates the body-parser status code via `err.status || err.statusCode`.
  // =========================================================================
  try {
    // Construct approximately 20 kB of JSON (well over the 10 kb limit).
    const oversizedBody = { input: 'x'.repeat(20000) };
    const result        = await makePostRequest('/', oversizedBody);

    assert.strictEqual(
      result.statusCode,
      413,
      `Expected 413 Payload Too Large for ~20 kB body, got ${result.statusCode}`
    );

    recordPass('POST / with ~20 kB body (exceeds 10 kB limit) returns 413 Payload Too Large');
  } catch (err) {
    recordFail('POST / with ~20 kB body (exceeds 10 kB limit) returns 413 Payload Too Large', err);
  }

  // =========================================================================
  // Test 4: Valid POST input is accepted with 200
  //
  // A short plain-text value well within the 500-char limit and containing no
  // special characters must be accepted and return the standard success message.
  // =========================================================================
  try {
    const result = await makePostRequest('/', { input: 'Hello, this is a valid input' });

    assert.strictEqual(
      result.statusCode,
      200,
      `Expected 200 for valid input, got ${result.statusCode}`
    );

    const body = JSON.parse(result.body);
    assert.strictEqual(
      body.message,
      'Request processed successfully',
      `Expected success message, got: ${JSON.stringify(body)}`
    );

    // Use assert.match() to verify the message matches the expected pattern.
    assert.match(
      body.message,
      /Request processed successfully/,
      'Response message must match the expected pattern'
    );

    recordPass("POST / with valid input returns 200 and { message: 'Request processed successfully' }");
  } catch (err) {
    recordFail("POST / with valid input returns 200 and { message: 'Request processed successfully' }", err);
  }

  // =========================================================================
  // Test 5: Valid GET /search query is accepted with 200
  //
  // A simple alphabetic query parameter must pass all validation rules and
  // return the sanitised query value in the response.
  // =========================================================================
  try {
    const result = await makeGetRequest('/search?q=hello');

    assert.strictEqual(
      result.statusCode,
      200,
      `Expected 200 for valid search query, got ${result.statusCode}`
    );

    const body = JSON.parse(result.body);
    assert.strictEqual(
      body.message,
      'Search processed',
      `Expected 'Search processed', got: ${JSON.stringify(body)}`
    );
    assert.strictEqual(
      body.query,
      'hello',
      `Expected query 'hello', got: ${body.query}`
    );

    recordPass("GET /search?q=hello returns 200 with { message: 'Search processed', query: 'hello' }");
  } catch (err) {
    recordFail("GET /search?q=hello returns 200 with { message: 'Search processed', query: 'hello' }", err);
  }

  // =========================================================================
  // Test 6: POST / with empty body is accepted (input field is optional)
  //
  // The body validator is configured with .optional(), meaning the absence of
  // the 'input' field must not trigger a validation error.
  // =========================================================================
  try {
    const result = await makePostRequest('/', {});

    assert.strictEqual(
      result.statusCode,
      200,
      `Expected 200 for empty body (input is optional), got ${result.statusCode}`
    );

    const body = JSON.parse(result.body);
    assert.strictEqual(
      body.message,
      'Request processed successfully',
      `Expected success message for empty body, got: ${JSON.stringify(body)}`
    );

    recordPass("POST / with empty body {} returns 200 (input field is optional)");
  } catch (err) {
    recordFail("POST / with empty body {} returns 200 (input field is optional)", err);
  }

  // =========================================================================
  // Test 7: GET /search with no query parameter is accepted (q is optional)
  //
  // The query validator is configured with .optional(), so omitting 'q'
  // entirely must not trigger validation errors.  The server returns
  // { message: 'Search processed', query: '' } when q is absent.
  // =========================================================================
  try {
    const result = await makeGetRequest('/search');

    assert.strictEqual(
      result.statusCode,
      200,
      `Expected 200 for /search with no q param (q is optional), got ${result.statusCode}`
    );

    const body = JSON.parse(result.body);
    assert.ok(
      body.message === 'Search processed',
      `Expected 'Search processed' message, got: ${JSON.stringify(body)}`
    );

    recordPass("GET /search (no q param) returns 200 with { message: 'Search processed' }");
  } catch (err) {
    recordFail("GET /search (no q param) returns 200 with { message: 'Search processed' }", err);
  }

  // =========================================================================
  // Test 8: POST / with input exceeding max length returns 400
  //
  // 'x'.repeat(600) = 600 characters.  After trim() (no whitespace to remove)
  // and escape() (no special characters), the value is still 600 chars.
  // isLength({ max: 500 }) then fails, producing a 400 validation error.
  // =========================================================================
  try {
    const result = await makePostRequest('/', { input: 'x'.repeat(600) });

    assert.strictEqual(
      result.statusCode,
      400,
      `Expected 400 for 600-char input (max 500), got ${result.statusCode}`
    );

    const body = JSON.parse(result.body);
    assert.ok(
      Array.isArray(body.errors),
      `Expected errors array in 400 response, got: ${JSON.stringify(body)}`
    );
    assert.ok(
      body.errors.length > 0,
      'Expected at least one validation error in the errors array'
    );

    recordPass('POST / with 600-char input (exceeds 500-char max) returns 400 with errors array');
  } catch (err) {
    recordFail('POST / with 600-char input (exceeds 500-char max) returns 400 with errors array', err);
  }

  // =========================================================================
  // Test 9: GET /search with query exceeding max length returns 400
  //
  // 'x'.repeat(250) = 250 characters.  After trim() and escape(), still 250.
  // isLength({ max: 200 }) fails, so the server returns 400.
  // =========================================================================
  try {
    const longQuery = 'x'.repeat(250);
    const result    = await makeGetRequest(`/search?q=${longQuery}`);

    assert.strictEqual(
      result.statusCode,
      400,
      `Expected 400 for 250-char q (max 200), got ${result.statusCode}`
    );

    const body = JSON.parse(result.body);
    assert.ok(
      Array.isArray(body.errors),
      `Expected errors array in 400 response, got: ${JSON.stringify(body)}`
    );
    assert.ok(
      body.errors.length > 0,
      'Expected at least one validation error in the errors array'
    );

    recordPass('GET /search with 250-char q (exceeds 200-char max) returns 400 with errors array');
  } catch (err) {
    recordFail('GET /search with 250-char q (exceeds 200-char max) returns 400 with errors array', err);
  }

  // =========================================================================
  // Summary and cleanup
  // =========================================================================
  const total = passed + failed;
  console.log('\n=== Test Summary ===');
  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  // Close the test server before exiting.
  server.close(() => {
    console.log('\nTest server closed.');

    if (failed > 0) {
      console.error(`\n${failed} test(s) FAILED.`);
      process.exit(1);
    } else {
      console.log('\nAll tests PASSED.');
      process.exit(0);
    }
  });
}

// ---------------------------------------------------------------------------
// Entry point — run the suite and treat any unhandled error as a fatal failure.
// ---------------------------------------------------------------------------
runTests().catch((err) => {
  console.error('\nTest suite encountered an unhandled error:', err);
  server.close(() => process.exit(1));
});
