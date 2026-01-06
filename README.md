# Secure Node.js HTTP Server

A production-ready Express.js server with comprehensive security features including security headers, CORS configuration, rate limiting, input validation, and HTTPS support.

## Overview

This project provides a secure Node.js HTTP server built with Express.js that implements industry-standard security best practices. The server is designed to protect against common web vulnerabilities and attacks through multiple layers of security middleware.

### Key Security Features

- **Security Headers**: Comprehensive HTTP security headers via Helmet.js
- **CORS Configuration**: Configurable Cross-Origin Resource Sharing
- **Rate Limiting**: Protection against DDoS and brute-force attacks
- **Input Validation**: Schema-based validation using Joi
- **HTTPS Support**: TLS 1.2+ encryption with secure cipher configuration
- **Secure Error Handling**: Production-safe error responses without sensitive information leakage

## Features

### Security Headers (Helmet.js)

Automatically sets 15+ security headers including:

- **Content-Security-Policy (CSP)**: Controls resource loading to prevent XSS attacks
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS connections for 1 year with preload support
- **X-Frame-Options**: Set to `DENY` to prevent clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME-type sniffing with `nosniff`
- **Referrer-Policy**: Controls referrer information with `strict-origin-when-cross-origin`
- **X-DNS-Prefetch-Control**: Disables DNS prefetching for privacy
- **X-Download-Options**: Prevents IE from executing downloads
- **X-Permitted-Cross-Domain-Policies**: Restricts Adobe cross-domain policies
- **X-XSS-Protection**: Disabled (modern CSP provides better protection)
- **Cross-Origin-Opener-Policy**: Isolates browsing context
- **Cross-Origin-Resource-Policy**: Restricts cross-origin resource access

### CORS Configuration

Configurable Cross-Origin Resource Sharing with:

- Whitelist-based origin validation
- Credentials support for authenticated requests
- Configurable allowed methods and headers
- Preflight request handling

### Rate Limiting

Protection against abuse with two tiers:

- **Global Rate Limit**: 100 requests per 15-minute window
- **Strict Rate Limit**: 10 requests per 15-minute window for sensitive endpoints
- Standard `RateLimit` headers in responses
- Configurable window and max request settings

### Input Validation (Joi)

Schema-based validation for:

- User data validation (name, email, age, role)
- Query parameter validation (page, limit, sort, search)
- URL parameter validation (numeric IDs)
- Automatic sanitization and type coercion
- Detailed validation error messages

### HTTPS Support

Secure transport layer with:

- TLS 1.2 minimum version requirement
- Modern cipher suite configuration
- Certificate and key file support
- Automatic HTTP fallback for development

### Secure Error Handling

Production-safe error responses:

- Stack traces hidden in production
- Generic error messages for 500 errors
- Detailed validation errors for client issues
- Proper HTTP status codes

## Prerequisites

Before running this server, ensure you have the following installed:

- **Node.js**: v20.0.0 or higher
- **npm**: v8.0.0 or higher

Verify your installation:

```bash
node --version  # Should output v20.x.x or higher
npm --version   # Should output 8.x.x or higher
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:

```bash
npm install
```

This will install the following production dependencies:

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21.2 | Web framework with middleware support |
| helmet | ^8.1.0 | Security headers middleware |
| cors | ^2.8.5 | CORS configuration middleware |
| express-rate-limit | ^7.5.0 | Request rate limiting |
| joi | ^17.13.3 | Input validation library |

And development dependencies:

| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^29.7.0 | Testing framework |
| supertest | ^7.0.0 | HTTP assertion testing |

## Usage

### HTTP Server

Start the HTTP server:

```bash
npm start
```

The server will start on port 3000 (or the port specified in the `PORT` environment variable):

```
HTTP Server running on port 3000
```

Verify the server is running:

```bash
curl -I http://localhost:3000/
```

You should see security headers in the response:

```
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
...
```

### HTTPS Server

To run with HTTPS support, you need SSL/TLS certificates:

1. Generate or obtain SSL certificates:

```bash
# For development/testing only - generate self-signed certificates:
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# For production, obtain certificates from a trusted Certificate Authority (CA)
```

2. Set the environment variables:

```bash
export SSL_KEY_PATH=/path/to/your/key.pem
export SSL_CERT_PATH=/path/to/your/cert.pem
```

3. Start the server:

```bash
npm start
```

When SSL certificates are configured, the server will start on HTTPS:

```
HTTPS Server running on port 3000
```

Verify HTTPS is working:

```bash
curl -k -I https://localhost:3000/
```

## API Endpoints

### GET / - Hello World

Returns a simple greeting message.

**Request:**

```bash
curl http://localhost:3000/
```

**Response:**

```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8

Hello, World!
```

### POST /validate-user - User Validation

Validates user data against a predefined schema.

**Request Body Schema:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | Yes | 2-100 characters |
| email | string | Yes | Valid email format |
| age | number | No | 0-150 |
| role | string | No | One of: 'user', 'admin', 'moderator' |

**Request:**

```bash
curl -X POST http://localhost:3000/validate-user \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "age": 30, "role": "user"}'
```

**Success Response (200):**

```json
{
  "valid": true,
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "role": "user"
  }
}
```

**Validation Error Response (400):**

```json
{
  "valid": false,
  "errors": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
  ]
}
```

### GET /validate-query - Query Parameter Validation

Validates query parameters for pagination and search.

**Query Parameters:**

| Parameter | Type | Default | Constraints |
|-----------|------|---------|-------------|
| page | number | 1 | Minimum: 1 |
| limit | number | 10 | 1-100 |
| sort | string | 'asc' | One of: 'asc', 'desc' |
| search | string | - | Max 100 characters, alphanumeric with spaces |

**Request:**

```bash
curl "http://localhost:3000/validate-query?page=1&limit=20&sort=desc&search=test"
```

**Success Response (200):**

```json
{
  "valid": true,
  "params": {
    "page": 1,
    "limit": 20,
    "sort": "desc",
    "search": "test"
  }
}
```

**Validation Error Response (400):**

```json
{
  "valid": false,
  "errors": [
    {
      "field": "limit",
      "message": "\"limit\" must be less than or equal to 100"
    }
  ]
}
```

### GET /items/:id - ID Parameter Validation

Validates numeric ID parameters in URL paths.

**URL Parameters:**

| Parameter | Type | Constraints |
|-----------|------|-------------|
| id | number | Positive integer, 1-999999999 |

**Request:**

```bash
curl http://localhost:3000/items/123
```

**Success Response (200):**

```json
{
  "valid": true,
  "itemId": 123
}
```

**Validation Error Response (400):**

```json
{
  "valid": false,
  "errors": [
    {
      "field": "id",
      "message": "\"id\" must be a positive number"
    }
  ]
}
```

## Security Configuration

### Helmet Configuration

The server uses Helmet.js with the following security header configuration:

```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})
```

### CORS Configuration

CORS is configured with a whitelist-based approach:

```javascript
cors({
  origin: function(origin, callback) {
    const whitelist = [
      'http://localhost:3000',
      'https://localhost:3000'
    ];
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

### Rate Limiting Configuration

Two rate limiting tiers are implemented:

**Global Rate Limit (Applied to all routes):**

```javascript
rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 900
  }
})
```

**Strict Rate Limit (For sensitive endpoints):**

```javascript
rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 requests per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests to this endpoint, please try again later.',
    retryAfter: 900
  }
})
```

## Testing

Run the test suite:

```bash
npm test
```

**Expected Output:**

```
 PASS  __tests__/security.test.js
  Secure Server Tests
    Security Headers (Helmet)
      ✓ should set Content-Security-Policy header
      ✓ should set Strict-Transport-Security header
      ✓ should set X-Frame-Options to DENY
      ✓ should set X-Content-Type-Options to nosniff
      ✓ should set Referrer-Policy header
      ✓ should not expose X-Powered-By header
      ✓ should set Cross-Origin-Opener-Policy header
      ✓ should set Cross-Origin-Resource-Policy header
    CORS Configuration
      ✓ should allow requests from whitelisted origins
      ✓ should handle preflight requests
      ✓ should include CORS headers in response
    Rate Limiting
      ✓ should include rate limit headers
      ✓ should return 429 when rate limit exceeded
    Input Validation - User
      ✓ should accept valid user data
      ✓ should reject invalid email
      ✓ should reject missing required fields
      ✓ should reject invalid age
      ✓ should reject invalid role
    Input Validation - Query Parameters
      ✓ should accept valid query parameters
      ✓ should use default values for missing parameters
      ✓ should reject invalid page number
      ✓ should reject limit exceeding maximum
    Input Validation - URL Parameters
      ✓ should accept valid numeric ID
      ✓ should reject non-numeric ID
    API Endpoints
      ✓ should return Hello World on GET /
      ✓ should return 404 for unknown routes
    Error Handling
      ✓ should return proper error format for validation errors
      ✓ should not expose stack traces in production
    Response Headers
      ✓ should set Cache-Control for security
      ✓ should set proper Content-Type
    Body Size Limits
      ✓ should reject oversized request bodies
    Schema Exports
      ✓ should export userSchema
      ✓ should export querySchema

Test Suites: 1 passed, 1 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        ~2s
```

### Code Coverage

Run tests with coverage:

```bash
npm test -- --coverage
```

**Expected Coverage:**

| Metric | Coverage |
|--------|----------|
| Statements | 75.2% |
| Branches | 57.14% |
| Functions | 62.96% |
| Lines | 76.22% |

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode ('development' or 'production') | 'development' | No |
| `PORT` | Server port number | 3000 | No |
| `SSL_KEY_PATH` | Path to SSL private key file | - | No (required for HTTPS) |
| `SSL_CERT_PATH` | Path to SSL certificate file | - | No (required for HTTPS) |

### Example Configuration

**Development:**

```bash
export NODE_ENV=development
export PORT=3000
npm start
```

**Production with HTTPS:**

```bash
export NODE_ENV=production
export PORT=443
export SSL_KEY_PATH=/etc/ssl/private/server.key
export SSL_CERT_PATH=/etc/ssl/certs/server.crt
npm start
```

## Security Audit

Run a security audit on dependencies:

```bash
npm audit
```

**Expected Output:**

```
found 0 vulnerabilities
```

## Project Structure

```
.
├── server.js              # Main server file with security middleware
├── package.json           # Project dependencies and scripts
├── package-lock.json      # Dependency lock file
├── jest.config.js         # Jest testing configuration
├── README.md              # This documentation file
└── __tests__/
    └── security.test.js   # Comprehensive security test suite
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality Guidelines

- All new features must include tests
- Maintain or improve code coverage
- Follow existing code style and conventions
- Update documentation as needed
- Ensure `npm audit` shows 0 vulnerabilities

## License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
