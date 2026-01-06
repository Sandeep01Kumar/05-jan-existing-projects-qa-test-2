/**
 * Comprehensive Security Test Suite
 * 
 * This test suite validates all security features implemented in server.js including:
 * - Security Headers (Helmet.js) - 8 tests
 * - CORS Configuration - 3 tests
 * - Rate Limiting - 2 tests
 * - Input Validation (Joi) - 11 tests
 * - API Endpoints - 2 tests
 * - Error Handling - 2 tests
 * - Response Headers - 2 tests
 * - Body Size Limits - 1 test
 * - Schema Exports - 2 tests
 * 
 * Total: 33 tests
 * 
 * @module __tests__/security.test
 */

'use strict';

const request = require('supertest');
const { app, userSchema, querySchema, idSchema } = require('../server');

// =============================================================================
// SECURITY HEADERS (HELMET.JS) TESTS - 8 tests
// =============================================================================

describe('Security Headers (Helmet.js)', () => {
  test('should include Content-Security-Policy header with correct directives', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['content-security-policy']).toBeDefined();
    const csp = response.headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("img-src 'self'");
  });

  test('should include Strict-Transport-Security (HSTS) header', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['strict-transport-security']).toBeDefined();
    const hsts = response.headers['strict-transport-security'];
    expect(hsts).toContain('max-age=31536000');
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('preload');
  });

  test('should include X-Frame-Options header set to DENY', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  test('should include X-Content-Type-Options header set to nosniff', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('should include Referrer-Policy header', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('should include Cross-Origin-Opener-Policy header', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
  });

  test('should include Cross-Origin-Resource-Policy header', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
  });

  test('should NOT include X-Powered-By header (hidden by Helmet)', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

// =============================================================================
// CORS CONFIGURATION TESTS - 3 tests
// =============================================================================

describe('CORS Configuration', () => {
  test('should include CORS headers for allowed origins', async () => {
    const response = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:3000');
    
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  test('should handle CORS preflight OPTIONS request', async () => {
    const response = await request(app)
      .options('/')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');
    
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-methods']).toBeDefined();
  });

  test('should include CORS credentials header', async () => {
    const response = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:3000');
    
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});

// =============================================================================
// RATE LIMITING TESTS - 2 tests
// =============================================================================

describe('Rate Limiting', () => {
  test('should include RateLimit-Policy header', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['ratelimit-policy']).toBeDefined();
    expect(response.headers['ratelimit-policy']).toContain('100');
  });

  test('should include RateLimit header with limit, remaining, reset', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['ratelimit']).toBeDefined();
    const rateLimit = response.headers['ratelimit'];
    expect(rateLimit).toContain('limit=');
    expect(rateLimit).toContain('remaining=');
    expect(rateLimit).toContain('reset=');
  });
});

// =============================================================================
// INPUT VALIDATION - USER TESTS - 5 tests
// =============================================================================

describe('Input Validation - User', () => {
  test('should accept valid user data', async () => {
    const validUser = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 30
    };
    
    const response = await request(app)
      .post('/validate-user')
      .send(validUser)
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User data is valid');
    expect(response.body.data.name).toBe('John Doe');
    expect(response.body.data.email).toBe('john.doe@example.com');
  });

  test('should reject missing required name field', async () => {
    const invalidUser = {
      email: 'john.doe@example.com',
      age: 30
    };
    
    const response = await request(app)
      .post('/validate-user')
      .send(invalidUser)
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
    expect(response.body.details).toBeDefined();
  });

  test('should reject invalid email format', async () => {
    const invalidUser = {
      name: 'John Doe',
      email: 'invalid-email',
      age: 30
    };
    
    const response = await request(app)
      .post('/validate-user')
      .send(invalidUser)
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  test('should reject age below minimum (18)', async () => {
    const invalidUser = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 17
    };
    
    const response = await request(app)
      .post('/validate-user')
      .send(invalidUser)
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  test('should reject name exceeding max length (50)', async () => {
    const invalidUser = {
      name: 'A'.repeat(51),
      email: 'john.doe@example.com',
      age: 30
    };
    
    const response = await request(app)
      .post('/validate-user')
      .send(invalidUser)
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });
});

// =============================================================================
// INPUT VALIDATION - QUERY TESTS - 4 tests
// =============================================================================

describe('Input Validation - Query', () => {
  test('should accept valid query parameters', async () => {
    const response = await request(app)
      .get('/validate-query')
      .query({ search: 'test', page: 1, limit: 10 });
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Query parameters are valid');
    expect(response.body.data.search).toBe('test');
    expect(response.body.data.page).toBe(1);
    expect(response.body.data.limit).toBe(10);
  });

  test('should reject search exceeding max length (100)', async () => {
    const response = await request(app)
      .get('/validate-query')
      .query({ search: 'a'.repeat(101) });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  test('should reject invalid page parameter (non-integer)', async () => {
    const response = await request(app)
      .get('/validate-query')
      .query({ page: 'invalid' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  test('should reject limit exceeding max (100)', async () => {
    const response = await request(app)
      .get('/validate-query')
      .query({ limit: 101 });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });
});

// =============================================================================
// INPUT VALIDATION - ID TESTS - 2 tests
// =============================================================================

describe('Input Validation - ID', () => {
  test('should accept valid UUID v4 format', async () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    
    const response = await request(app)
      .get(`/items/${validUUID}`);
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Item retrieved successfully');
    expect(response.body.data.id).toBe(validUUID);
  });

  test('should reject invalid UUID format', async () => {
    const invalidUUID = 'invalid-uuid';
    
    const response = await request(app)
      .get(`/items/${invalidUUID}`);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });
});

// =============================================================================
// API ENDPOINTS TESTS - 2 tests
// =============================================================================

describe('API Endpoints', () => {
  test('should return Hello World with 200 status on GET /', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Hello, World!');
    expect(response.body.secure).toBe(true);
  });

  test('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');
    
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });
});

// =============================================================================
// ERROR HANDLING TESTS - 2 tests
// =============================================================================

describe('Error Handling', () => {
  test('should return proper error structure for validation errors', async () => {
    const invalidUser = {
      name: 'J', // Too short
      email: 'invalid',
      age: 'not-a-number'
    };
    
    const response = await request(app)
      .post('/validate-user')
      .send(invalidUser)
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(400);
    expect(response.body.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
    expect(response.body.message).toBe('Request validation failed');
    expect(response.body.details).toBeInstanceOf(Array);
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  test('should handle malformed JSON with 400 error', async () => {
    const response = await request(app)
      .post('/validate-user')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
  });
});

// =============================================================================
// RESPONSE HEADERS TESTS - 2 tests
// =============================================================================

describe('Response Headers', () => {
  test('should include Cache-Control header', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['cache-control']).toBeDefined();
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['cache-control']).toContain('no-cache');
    expect(response.headers['cache-control']).toContain('must-revalidate');
  });

  test('should set Content-Type header correctly', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['content-type']).toContain('application/json');
  });
});

// =============================================================================
// BODY SIZE LIMITS TESTS - 1 test
// =============================================================================

describe('Body Size Limits', () => {
  test('should reject requests exceeding 10KB body limit', async () => {
    // Create a payload larger than 10KB
    const largePayload = {
      name: 'John Doe',
      email: 'john@example.com',
      data: 'x'.repeat(15000) // Over 10KB
    };
    
    const response = await request(app)
      .post('/validate-user')
      .send(largePayload)
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(413);
    expect(response.body.error).toBe('Payload Too Large');
  });
});

// =============================================================================
// SCHEMA EXPORTS TESTS - 2 tests
// =============================================================================

describe('Schema Exports', () => {
  test('should export userSchema as a Joi schema', () => {
    expect(userSchema).toBeDefined();
    expect(typeof userSchema.validate).toBe('function');
    
    // Test validation functionality
    const validUser = { name: 'John Doe', email: 'john@example.com', age: 25 };
    const { error } = userSchema.validate(validUser);
    expect(error).toBeUndefined();
  });

  test('should export querySchema and idSchema as Joi schemas', () => {
    expect(querySchema).toBeDefined();
    expect(typeof querySchema.validate).toBe('function');
    
    expect(idSchema).toBeDefined();
    expect(typeof idSchema.validate).toBe('function');
    
    // Test validation functionality
    const validQuery = { search: 'test', page: 1, limit: 10 };
    const { error: queryError } = querySchema.validate(validQuery);
    expect(queryError).toBeUndefined();
    
    const validId = { id: '550e8400-e29b-41d4-a716-446655440000' };
    const { error: idError } = idSchema.validate(validId);
    expect(idError).toBeUndefined();
  });
});
