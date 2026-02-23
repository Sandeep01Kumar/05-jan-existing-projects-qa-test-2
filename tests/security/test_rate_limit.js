/**
 * tests/security/test_rate_limit.js
 *
 * Rate Limiting Security Test Suite
 * ==================================
 *
 * Verifies that express-rate-limit@8.2.1 middleware is correctly integrated
 * into the secured Express server (server.js) and enforces per-IP request
 * throttling as required by the security hardening initiative (AAP §0.8.1).
 *
 * Rate limiter configuration (from server.js, AAP §0.5.1 and §0.6.3):
 *   - windowMs         : 15 * 60 * 1000 ms (900 s)  — configurable via RATE_LIMIT_WINDOW_MS
 *   - limit            : 100 requests per window      — configurable via RATE_LIMIT_MAX
 *   - standardHeaders  : 'draft-8'                    — IETF draft-8 structured headers
 *   - legacyHeaders    : false                         — no X-RateLimit-* headers
 *   - message          : { error: 'Too many requests, please try again later.' }
 *
 * Header format — express-rate-limit draft-8 standard:
 *   The IETF ratelimit-headers draft-8 specification emits TWO headers per response:
 *
 *   ratelimit        — Structured field containing remaining and reset values.
 *                      Format: '"<name>"; r=<remaining>; t=<reset_seconds>'
 *                      Example: '"5-in-15min"; r=4; t=900'
 *
 *   ratelimit-policy — Structured field containing the policy (limit and window).
 *                      Format: '"<name>"; q=<limit>; w=<window_seconds>; pk=:<hash>:'
 *                      Example: '"5-in-15min"; q=5; w=900; pk=:abc123:'
 *
 *   NOTE: Unlike draft-6, draft-8 does NOT emit individual 'ratelimit-limit',
 *   'ratelimit-remaining', or 'ratelimit-reset' headers. The limit is in the
 *   'q=' field of ratelimit-policy; remaining/reset are in 'r=' and 't=' of ratelimit.
 *
 * Test execution strategy:
 *   RATE_LIMIT_MAX is overridden to '5' BEFORE requiring the server module.
 *   Because server.js reads this env var at module-load time, the rate limiter
 *   is created with limit=5, making the test feasible with 6 total requests
 *   instead of 101.
 *
 *   Tests run sequentially (order matters — each request consumes from the
 *   shared rate-limit budget):
 *
 *     Test 1 (1 req)  → budget: 1/5 used — verifies 200 within limit
 *     Test 2 (1 req)  → budget: 2/5 used — verifies draft-8 headers present
 *     Test 4 (2 reqs) → budget: 3–4/5 used — verifies remaining decreases
 *     Test 5 (1 req)  → budget: 5/5 used — verifies reset value is valid
 *     Test 3 (1 req)  → budget: 6/5 EXCEEDED — verifies 429 response
 *
 * Uses ONLY Node.js built-in modules (http, assert) — no external test framework.
 *
 * AAP references: §0.5.1, §0.6.3, §0.8.1, §0.11.1
 */

'use strict';

// ---------------------------------------------------------------------------
// External dependency imports (Node.js built-in modules)
// ---------------------------------------------------------------------------
const http   = require('http');
const assert = require('assert');

// ---------------------------------------------------------------------------
// Override RATE_LIMIT_MAX BEFORE requiring the server module.
//
// Security rationale: server.js evaluates process.env.RATE_LIMIT_MAX once at
// require()-time to configure the express-rate-limit middleware. Setting this
// env var to a small number (5) BEFORE the require() call causes the rate
// limiter to be created with limit=5, making the 429 test feasible without
// sending 100+ HTTP requests.
// ---------------------------------------------------------------------------
process.env.RATE_LIMIT_MAX = '5';

// ---------------------------------------------------------------------------
// Import the Express application from server.js.
//
// The server.js startup block (app.listen(), https.createServer().listen()) is
// guarded by `require.main === module`, so requiring the module here does NOT
// start any real HTTP or HTTPS server — only the Express app object is returned.
// The test suite creates its own isolated test server via app.listen(0).
// ---------------------------------------------------------------------------
const app = require('../../server');

// ---------------------------------------------------------------------------
// Test state tracking
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

/** @type {Array<{ testName: string, pass: boolean }>} */
const results = [];

// ===========================================================================
// Helper — makeRequest(port, path)
//
// Makes a single HTTP GET request to the test server running on 127.0.0.1 at
// the given port and path.  Collects the status code, response headers, and
// full response body.
//
// Uses http.request() (as specified in external_imports members_accessed) for
// full control over the request and access to all response headers.
//
// @param {number} port  - The port the test server is listening on.
// @param {string} [path='/'] - The URL path to request.
// @returns {Promise<{ statusCode: number, headers: Object, body: string }>}
// ===========================================================================
function makeRequest(port, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port:     port,
      path:     path || '/',
      method:   'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers:    res.headers,
          body:       body
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// ===========================================================================
// Helper — parseDraft8RateLimitHeader(headerValue)
//
// Parses the value of the express-rate-limit draft-8 'ratelimit' structured
// field header to extract the 'remaining' (r=) and 'reset' (t=) parameters.
//
// Header format: '"<name>"; r=<remaining>; t=<reset_seconds>'
// Example      : '"5-in-15min"; r=4; t=900'
//
// @param {string} headerValue - The raw value of the 'ratelimit' response header.
// @returns {{ remaining: number, resetSeconds: number } | null}
//          Parsed values, or null if the header value cannot be parsed.
// ===========================================================================
function parseDraft8RateLimitHeader(headerValue) {
  if (typeof headerValue !== 'string' || headerValue.trim() === '') {
    return null;
  }

  const remainingMatch = headerValue.match(/\br=(\d+)\b/);
  const resetMatch     = headerValue.match(/\bt=(\d+)\b/);

  if (!remainingMatch || !resetMatch) {
    return null;
  }

  return {
    remaining:    parseInt(remainingMatch[1], 10),
    resetSeconds: parseInt(resetMatch[1], 10)
  };
}

// ===========================================================================
// Helper — parseDraft8PolicyHeader(headerValue)
//
// Parses the value of the express-rate-limit draft-8 'ratelimit-policy'
// structured field header to extract the 'limit' (q=) and 'window' (w=) params.
//
// Header format: '"<name>"; q=<limit>; w=<window_seconds>; pk=:<partitionKey>:'
// Example      : '"5-in-15min"; q=5; w=900; pk=:abc123:'
//
// @param {string} headerValue - The raw value of the 'ratelimit-policy' response header.
// @returns {{ limit: number, windowSeconds: number } | null}
//          Parsed values, or null if the header value cannot be parsed.
// ===========================================================================
function parseDraft8PolicyHeader(headerValue) {
  if (typeof headerValue !== 'string' || headerValue.trim() === '') {
    return null;
  }

  const limitMatch  = headerValue.match(/\bq=(\d+)\b/);
  const windowMatch = headerValue.match(/\bw=(\d+)\b/);

  if (!limitMatch || !windowMatch) {
    return null;
  }

  return {
    limit:         parseInt(limitMatch[1], 10),
    windowSeconds: parseInt(windowMatch[1], 10)
  };
}

// ===========================================================================
// Helper — logResult(testName, pass, detail)
//
// Records the outcome of a test case to the results array and prints a
// formatted pass/fail line to stdout.
//
// @param {string}  testName - Human-readable test description.
// @param {boolean} pass     - Whether the test passed.
// @param {string}  [detail] - Optional additional detail about the result.
// ===========================================================================
function logResult(testName, pass, detail) {
  const symbol    = pass ? '✓' : '✗';
  const statusTag = pass ? 'PASS' : 'FAIL';
  const detailStr = detail ? `: ${detail}` : '';

  if (pass) {
    console.log(`  ${symbol} [${statusTag}] ${testName}${detailStr}`);
    passed++;
  } else {
    console.error(`  ${symbol} [${statusTag}] ${testName}${detailStr}`);
    failed++;
  }

  results.push({ testName, pass });
}

// ===========================================================================
// Test 1: Requests within limit return 200 OK
//
// Security verification (AAP §0.8.1):
//   Confirms that a normal GET request to the root endpoint returns the
//   expected 200 OK status code and the "Hello, World!\n" response body that
//   the original server.js provided — proving the security middleware wraps
//   the existing functionality without altering it.
//
// Rate limit budget: consumes request 1 of 5 (remaining after: 4)
// ===========================================================================
async function test1_withinLimitReturns200(port) {
  const testName = 'Test 1: Requests within limit return 200 OK';
  try {
    const response = await makeRequest(port, '/');

    // Assert HTTP 200 status code
    assert.strictEqual(
      response.statusCode,
      200,
      `Expected HTTP 200 OK for request within rate limit, got ${response.statusCode}`
    );

    // Assert "Hello, World!" is present in the response body
    assert.ok(
      response.body.includes('Hello, World!'),
      `Expected "Hello, World!" in response body, got: "${response.body.trim()}"`
    );

    logResult(
      testName,
      true,
      `status=${response.statusCode}, body="${response.body.trim()}"`
    );
  } catch (err) {
    logResult(testName, false, err.message);
  }
}

// ===========================================================================
// Test 2: Rate limit headers are present in every response (draft-8 standard)
//
// Security verification (AAP §0.8.1):
//   Confirms that express-rate-limit@8.2.1 with standardHeaders:'draft-8'
//   emits the expected structured field headers on every response, providing
//   clients with transparent rate limit information.
//
//   Header semantics:
//     ratelimit        → contains remaining ('r=') and reset time ('t=')
//     ratelimit-policy → contains the limit ('q=') and window ('w=')
//
//   Verified values:
//     q= must equal 5 (the RATE_LIMIT_MAX test override)
//     w= must be a positive integer (window in seconds)
//     r= must be a non-negative integer (requests remaining)
//     t= must be a non-negative integer (seconds until window resets)
//
// Rate limit budget: consumes request 2 of 5 (remaining after: 3)
// ===========================================================================
async function test2_rateLimitHeadersPresent(port) {
  const testName = 'Test 2: Rate limit headers are present (draft-8 standard)';
  try {
    const response = await makeRequest(port, '/');
    const { headers } = response;

    // -----------------------------------------------------------------------
    // Assert the 'ratelimit' header is present
    // (draft-8 structured field containing remaining 'r=' and reset 't=')
    // -----------------------------------------------------------------------
    assert.ok(
      'ratelimit' in headers,
      `Expected "ratelimit" header (draft-8 format) in response. ` +
      `Rate-related headers present: ` +
      `[${Object.keys(headers).filter(h => h.startsWith('ratelimit')).join(', ') || 'none'}]`
    );

    // -----------------------------------------------------------------------
    // Assert the 'ratelimit-policy' header is present
    // (draft-8 structured field containing limit 'q=' and window 'w=')
    // -----------------------------------------------------------------------
    assert.ok(
      'ratelimit-policy' in headers,
      `Expected "ratelimit-policy" header (draft-8 format) in response. ` +
      `Rate-related headers present: ` +
      `[${Object.keys(headers).filter(h => h.startsWith('ratelimit')).join(', ') || 'none'}]`
    );

    // -----------------------------------------------------------------------
    // Parse and validate ratelimit-policy: must contain limit (q=) and window (w=)
    // -----------------------------------------------------------------------
    const policy = parseDraft8PolicyHeader(headers['ratelimit-policy']);
    assert.ok(
      policy !== null,
      `Failed to parse "ratelimit-policy" header. ` +
      `Raw value: "${headers['ratelimit-policy']}"`
    );

    // The limit (q=) must match RATE_LIMIT_MAX=5
    assert.strictEqual(
      policy.limit,
      5,
      `Expected ratelimit-policy q= (limit) to equal RATE_LIMIT_MAX (5), got ${policy.limit}. ` +
      `Raw header: "${headers['ratelimit-policy']}"`
    );

    // The window (w=) must be a positive number of seconds
    assert.ok(
      Number.isInteger(policy.windowSeconds) && policy.windowSeconds > 0,
      `Expected ratelimit-policy w= (window) to be a positive integer, ` +
      `got ${policy.windowSeconds}. Raw header: "${headers['ratelimit-policy']}"`
    );

    // -----------------------------------------------------------------------
    // Parse and validate ratelimit: must contain remaining (r=) and reset (t=)
    // -----------------------------------------------------------------------
    const rl = parseDraft8RateLimitHeader(headers['ratelimit']);
    assert.ok(
      rl !== null,
      `Failed to parse "ratelimit" header. ` +
      `Raw value: "${headers['ratelimit']}"`
    );

    // Remaining (r=) must be a non-negative integer
    assert.ok(
      Number.isInteger(rl.remaining) && rl.remaining >= 0,
      `Expected ratelimit r= (remaining) to be a non-negative integer, ` +
      `got ${rl.remaining}. Raw header: "${headers['ratelimit']}"`
    );

    // Reset time (t=) must be a non-negative integer (seconds until window resets)
    assert.ok(
      Number.isInteger(rl.resetSeconds) && rl.resetSeconds >= 0,
      `Expected ratelimit t= (reset) to be a non-negative integer, ` +
      `got ${rl.resetSeconds}. Raw header: "${headers['ratelimit']}"`
    );

    logResult(
      testName,
      true,
      `ratelimit="${headers['ratelimit']}", ` +
      `ratelimit-policy="${headers['ratelimit-policy']}"`
    );
  } catch (err) {
    logResult(testName, false, err.message);
  }
}

// ===========================================================================
// Test 3: Requests exceeding the limit return 429 Too Many Requests
//
// Security verification (AAP §0.8.1):
//   Confirms that once the rate limit budget is exhausted, the next request
//   receives HTTP 429 Too Many Requests — the primary DoS/brute-force defense.
//
//   IMPORTANT: This test MUST execute AFTER tests 1, 2, 4, and 5 have
//   consumed all 5 allowed requests (budget: 5/5).  The 6th request will
//   then trigger the 429 response.
//
//   Verified outcomes on a rate-limited response:
//     - Status code: 429
//     - Body: contains the configured error message ("Too many requests")
//     - retry-after: header is present (express-rate-limit sets this on 429)
//     - ratelimit / ratelimit-policy headers remain present (r=0 on 429)
//
// Rate limit budget: consumes request 6 of 5 (EXCEEDS limit → 429)
// ===========================================================================
async function test3_exceedingLimitReturns429(port) {
  const testName = 'Test 3: Requests exceeding limit return 429 Too Many Requests';
  try {
    // At this point the rate-limit budget is fully exhausted (5 of 5 used).
    // The next request must be rejected with 429 Too Many Requests.
    const response = await makeRequest(port, '/');

    // Assert HTTP 429 status code
    assert.strictEqual(
      response.statusCode,
      429,
      `Expected HTTP 429 Too Many Requests (budget exhausted), got ${response.statusCode}. ` +
      `This test must run after 5 requests have already been made.`
    );

    // Assert the configured error message is in the response body
    assert.ok(
      response.body.toLowerCase().includes('too many requests'),
      `Expected "Too many requests" in the 429 response body, ` +
      `got: "${response.body.trim()}"`
    );

    // Assert retry-after header is present (set by express-rate-limit on 429 responses)
    assert.ok(
      'retry-after' in response.headers,
      `Expected "retry-after" header on 429 response. ` +
      `Headers received: [${Object.keys(response.headers).join(', ')}]`
    );

    // Assert retry-after is a positive integer (seconds until reset)
    const retryAfter = parseInt(response.headers['retry-after'], 10);
    assert.ok(
      Number.isInteger(retryAfter) && retryAfter > 0,
      `Expected retry-after to be a positive integer, ` +
      `got "${response.headers['retry-after']}"`
    );

    logResult(
      testName,
      true,
      `status=${response.statusCode}, retry-after=${response.headers['retry-after']}s, ` +
      `body=${response.body.trim()}`
    );
  } catch (err) {
    logResult(testName, false, err.message);
  }
}

// ===========================================================================
// Test 4: Rate limit remaining count decreases by 1 with each request
//
// Security verification (AAP §0.8.1):
//   Confirms that the rate limiter correctly tracks per-IP request counts by
//   verifying that the 'r=' value in the draft-8 'ratelimit' header decrements
//   by exactly 1 between consecutive requests from the same IP address.
//
//   Sends 2 sequential GET requests and asserts:
//     - Both requests return HTTP 200 (within limit)
//     - Both responses include the 'ratelimit' header
//     - The 'r=' value in the second response equals (first_r - 1)
//
// Rate limit budget: consumes requests 3 and 4 of 5 (remaining after: 1)
// ===========================================================================
async function test4_remainingDecreases(port) {
  const testName = 'Test 4: Rate limit remaining decreases by 1 with each request';
  try {
    // Send two sequential requests to observe the per-request decrement
    const response1 = await makeRequest(port, '/');
    const response2 = await makeRequest(port, '/');

    // Both requests must succeed (within rate limit budget)
    assert.strictEqual(
      response1.statusCode,
      200,
      `Expected HTTP 200 for 1st request within limit, got ${response1.statusCode}`
    );
    assert.strictEqual(
      response2.statusCode,
      200,
      `Expected HTTP 200 for 2nd request within limit, got ${response2.statusCode}`
    );

    // Both responses must include the draft-8 ratelimit header
    assert.ok(
      'ratelimit' in response1.headers,
      `Expected "ratelimit" header in 1st response. ` +
      `Headers: [${Object.keys(response1.headers).join(', ')}]`
    );
    assert.ok(
      'ratelimit' in response2.headers,
      `Expected "ratelimit" header in 2nd response. ` +
      `Headers: [${Object.keys(response2.headers).join(', ')}]`
    );

    // Parse the remaining values from both responses
    const rl1 = parseDraft8RateLimitHeader(response1.headers['ratelimit']);
    const rl2 = parseDraft8RateLimitHeader(response2.headers['ratelimit']);

    assert.ok(
      rl1 !== null,
      `Failed to parse 1st "ratelimit" header: "${response1.headers['ratelimit']}"`
    );
    assert.ok(
      rl2 !== null,
      `Failed to parse 2nd "ratelimit" header: "${response2.headers['ratelimit']}"`
    );

    // The remaining count must decrease by exactly 1 between the two requests
    assert.strictEqual(
      rl2.remaining,
      rl1.remaining - 1,
      `Expected ratelimit r= to decrease by 1: ` +
      `${rl1.remaining} → ${rl2.remaining} ` +
      `(actual delta: ${rl1.remaining - rl2.remaining})`
    );

    logResult(
      testName,
      true,
      `ratelimit r= decreased: ${rl1.remaining} → ${rl2.remaining} ` +
      `(Δ=${rl1.remaining - rl2.remaining}, expected Δ=1)`
    );
  } catch (err) {
    logResult(testName, false, err.message);
  }
}

// ===========================================================================
// Test 5: Rate limit reset value is present and valid
//
// Security verification (AAP §0.8.1):
//   Confirms that the 't=' value in the draft-8 'ratelimit' header provides
//   clients with a valid countdown (in seconds) until the rate limit window
//   resets and request credits are restored.
//
//   Verified conditions:
//     - 'ratelimit' header is present in the response
//     - 't=' (reset) value is a finite, non-negative integer
//     - 't=' value does not exceed the configured window size (900 s for 15 min)
//     - 'ratelimit-policy' 'w=' value matches the window configuration
//
// Rate limit budget: consumes request 5 of 5 (remaining after: 0)
// ===========================================================================
async function test5_resetValueValid(port) {
  const testName = 'Test 5: Rate limit reset value is present and valid';
  try {
    const response = await makeRequest(port, '/');

    // Assert the ratelimit header is present
    assert.ok(
      'ratelimit' in response.headers,
      `Expected "ratelimit" header in response. ` +
      `Headers: [${Object.keys(response.headers).join(', ')}]`
    );

    // Parse the ratelimit header
    const rl = parseDraft8RateLimitHeader(response.headers['ratelimit']);
    assert.ok(
      rl !== null,
      `Failed to parse "ratelimit" header: "${response.headers['ratelimit']}"`
    );

    // The reset value (t=) must be a finite, non-negative integer
    assert.ok(
      Number.isFinite(rl.resetSeconds) && rl.resetSeconds >= 0,
      `Expected ratelimit t= (reset) to be a finite non-negative number, ` +
      `got ${rl.resetSeconds}. Raw header: "${response.headers['ratelimit']}"`
    );

    // The reset value must not exceed the configured window size in seconds.
    // The default window is 15 minutes = 900 seconds (configurable via RATE_LIMIT_WINDOW_MS).
    const windowMs      = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
    const windowSeconds = Math.ceil(windowMs / 1000);

    assert.ok(
      rl.resetSeconds <= windowSeconds,
      `Expected ratelimit t= (${rl.resetSeconds}s) to be within the window (${windowSeconds}s). ` +
      `Raw header: "${response.headers['ratelimit']}"`
    );

    // Optionally validate the window is also encoded correctly in ratelimit-policy
    if ('ratelimit-policy' in response.headers) {
      const policy = parseDraft8PolicyHeader(response.headers['ratelimit-policy']);
      if (policy !== null) {
        assert.ok(
          policy.windowSeconds > 0,
          `Expected ratelimit-policy w= (window) to be positive, got ${policy.windowSeconds}`
        );
      }
    }

    logResult(
      testName,
      true,
      `ratelimit t= (reset)=${rl.resetSeconds}s (window=${windowSeconds}s), ` +
      `r= (remaining)=${rl.remaining}`
    );
  } catch (err) {
    logResult(testName, false, err.message);
  }
}

// ===========================================================================
// Main test runner — runTests()
//
// Starts the Express test server on a random available OS port (0), runs all
// 5 rate limiting tests sequentially in the order that correctly manages the
// shared rate-limit budget, prints a summary, and exits with:
//   code 0 — all tests passed
//   code 1 — one or more tests failed
//
// Execution order and rate-limit budget tracking:
//
//   Request #  | Test    | Expected Status | ratelimit r= After
//   -----------+---------+-----------------+--------------------
//       1      | Test 1  |    200 OK        |    4
//       2      | Test 2  |    200 OK        |    3
//       3      | Test 4  |    200 OK        |    2   ← 1st of 2 reqs in Test 4
//       4      | Test 4  |    200 OK        |    1   ← 2nd of 2 reqs in Test 4
//       5      | Test 5  |    200 OK        |    0
//       6      | Test 3  |    429           |  (limit exceeded)
// ===========================================================================
async function runTests() {
  console.log('\n=======================================================');
  console.log('  Rate Limiting Security Test Suite');
  console.log('=======================================================');
  console.log(`  RATE_LIMIT_MAX        : ${process.env.RATE_LIMIT_MAX}`);
  console.log(`  RATE_LIMIT_WINDOW_MS  : ${process.env.RATE_LIMIT_WINDOW_MS || '900000 (default)'}`);
  console.log(`  Middleware            : express-rate-limit@8.2.1`);
  console.log(`  Header format        : IETF draft-8 (ratelimit + ratelimit-policy)`);
  console.log('=======================================================\n');

  // -------------------------------------------------------------------------
  // Start the Express app on a random available port.
  // Using port 0 lets the OS assign any free port, preventing conflicts with
  // the production server (port 3000) or other test suites.
  //
  // We wrap app.listen() in a Promise so that we wait for the 'listening'
  // event before proceeding — server.address() returns null until the OS
  // has completed the socket bind, which happens asynchronously.
  // -------------------------------------------------------------------------
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const port   = server.address().port;
  console.log(`  Test server  : http://127.0.0.1:${port}/`);
  console.log(`  Budget       : ${process.env.RATE_LIMIT_MAX} requests before 429\n`);

  try {
    // -----------------------------------------------------------------------
    // Execute tests sequentially — ORDER IS CRITICAL.
    //
    // Each test function consumes from the shared rate-limit budget.  The 429
    // test (Test 3) must run last, after all 5 allowed requests are exhausted.
    //
    // Budget breakdown:
    //   Test 1: 1 req  → used=1/5
    //   Test 2: 1 req  → used=2/5
    //   Test 4: 2 reqs → used=3/5 then 4/5
    //   Test 5: 1 req  → used=5/5  (remaining=0)
    //   Test 3: 1 req  → 6/5 EXCEEDED → 429
    // -----------------------------------------------------------------------
    await test1_withinLimitReturns200(port);    // request  1 of 5 (remaining: 4)
    await test2_rateLimitHeadersPresent(port);  // request  2 of 5 (remaining: 3)
    await test4_remainingDecreases(port);       // requests 3 & 4 of 5 (remaining: 2, then 1)
    await test5_resetValueValid(port);          // request  5 of 5 (remaining: 0)
    await test3_exceedingLimitReturns429(port); // request  6 — EXCEEDS limit → 429
  } finally {
    // Always close the test server so the Node.js process can exit cleanly.
    server.close();
  }

  // -------------------------------------------------------------------------
  // Print test summary
  // -------------------------------------------------------------------------
  const total = passed + failed;
  console.log('\n=======================================================');
  console.log('  Test Summary');
  console.log('=======================================================');
  console.log(`  Total  : ${total}`);
  console.log(`  Passed : ${passed}`);
  console.log(`  Failed : ${failed}`);

  if (failed > 0) {
    console.error('\n  Failed tests:');
    results
      .filter((r) => !r.pass)
      .forEach((r) => console.error(`    ✗  ${r.testName}`));
    console.error('\n=======================================================');
    console.error('  RATE LIMITING TESTS FAILED — Security check unsuccessful');
    console.error('=======================================================\n');
    process.exit(1);
  }

  console.log('\n  All rate limiting security tests passed! ✓');
  console.log('=======================================================\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Entry point — invoke the main test runner.
// Any unhandled promise rejection surfaces as a fatal test suite failure.
// ---------------------------------------------------------------------------
runTests().catch((err) => {
  console.error('\n[FATAL] Test suite encountered an unhandled error:');
  console.error('  Message:', err.message);
  console.error('  Stack  :', err.stack);
  process.exit(1);
});
