# Secure Node.js HTTP Server

A production-ready Express.js HTTP server with comprehensive security features including security headers, CORS configuration, rate limiting, input validation, HTTPS support, and secure error handling.

## Features

- **Security Headers (Helmet.js)**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Cross-Origin policies
- **CORS Configuration**: Configurable origin whitelist with credentials support
- **Rate Limiting**: Global (100 req/15min) and strict (10 req/15min) limiters for DDoS protection
- **Input Validation (Joi)**: Schema-based validation for user data, query parameters, and URL IDs
- **HTTPS Support**: TLS 1.2+ with secure cipher configuration
- **Secure Error Handling**: Production-safe error responses without stack traces

## Prerequisites

- Node.js v20+ 
- npm v8+

## Installation

```bash
npm install
```

## Usage

### HTTP Server

Start the HTTP server on port 3000:

```bash
npm start
```

### HTTPS Server

To enable HTTPS, provide SSL certificates:

1. Place your SSL certificate at `./certs/server.crt`
2. Place your SSL key at `./certs/server.key`
3. Start the server (HTTPS will automatically run on port 3443)

Alternatively, set environment variables:

```bash
SSL_KEY_PATH=/path/to/server.key SSL_CERT_PATH=/path/to/server.crt npm start
```

## API Endpoints

### GET /
Hello World response with security headers

**Response:**
```json
{
  "message": "Hello, World!",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "secure": true
}
```

### POST /validate-user
Validates user data against the user schema

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "age": 30
}
```

**Validation Rules:**
- `name`: Required, 3-50 characters, letters/spaces/hyphens/apostrophes only
- `email`: Required, valid email format
- `age`: Optional, integer between 18-120

### GET /validate-query
Validates query parameters

**Query Parameters:**
- `search`: Optional, max 100 characters
- `page`: Optional, integer min 1 (default: 1)
- `limit`: Optional, integer 1-100 (default: 10)

### GET /items/:id
Retrieves an item by UUID

**URL Parameters:**
- `id`: Required, valid UUID v4 format

### GET /health
Health check endpoint (excluded from rate limiting)

## Security Configuration

### Helmet.js Headers

| Header | Value |
|--------|-------|
| Content-Security-Policy | default-src 'self', script-src 'self', ... |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Cross-Origin-Opener-Policy | same-origin |
| Cross-Origin-Resource-Policy | same-origin |

### CORS

Default allowed origins:
- `http://localhost:3000`
- `http://localhost:8080`

Configure additional origins via environment variable:
```bash
ALLOWED_ORIGINS=https://example.com,https://api.example.com npm start
```

### Rate Limiting

| Limiter | Limit | Window |
|---------|-------|--------|
| Global | 100 requests | 15 minutes |
| Strict | 10 requests | 15 minutes |

Strict limiter applies to `/validate-user` endpoint.

## Testing

Run the comprehensive test suite (33 tests):

```bash
npm test
```

Expected output:
```
Test Suites: 1 passed, 1 total
Tests:       33 passed, 33 total
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Environment mode (development/production) |
| HOST | 127.0.0.1 | Server hostname |
| HTTP_PORT | 3000 | HTTP server port |
| HTTPS_PORT | 3443 | HTTPS server port |
| SSL_KEY_PATH | ./certs/server.key | Path to SSL private key |
| SSL_CERT_PATH | ./certs/server.crt | Path to SSL certificate |
| ALLOWED_ORIGINS | localhost:3000,localhost:8080 | Comma-separated allowed CORS origins |
| RATE_LIMIT_WINDOW_MS | 900000 | Rate limit window in milliseconds (15 min) |
| RATE_LIMIT_MAX_REQUESTS | 100 | Max requests per window (global) |
| STRICT_RATE_LIMIT_MAX_REQUESTS | 10 | Max requests per window (strict) |
| BODY_SIZE_LIMIT | 10kb | Maximum request body size |

## License

MIT
