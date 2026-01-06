/**
 * Secure Express.js Server Implementation
 * 
 * This module provides a production-ready HTTP/HTTPS server with comprehensive
 * security features including:
 * - Helmet.js security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - CORS configuration with whitelist support
 * - Rate limiting for DDoS and brute-force protection
 * - Joi schema-based input validation
 * - HTTPS support with TLS 1.2+ configuration
 * - Secure error handling
 * - Graceful shutdown handling
 * 
 * @module server
 * @version 1.0.0
 */

'use strict';

// =============================================================================
// IMPORTS
// =============================================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const http = require('http');
const https = require('https');
const fs = require('fs');

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Server configuration object
 * Values can be overridden via environment variables
 */
const config = {
  // Server settings
  hostname: process.env.HOST || '127.0.0.1',
  httpPort: parseInt(process.env.HTTP_PORT, 10) || 3000,
  httpsPort: parseInt(process.env.HTTPS_PORT, 10) || 3443,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // SSL certificate paths
  sslKeyPath: process.env.SSL_KEY_PATH || './certs/server.key',
  sslCertPath: process.env.SSL_CERT_PATH || './certs/server.crt',
  
  // CORS settings
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:8080'],
  
  // Rate limiting settings
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  strictRateLimitMaxRequests: parseInt(process.env.STRICT_RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  
  // Body size limits
  bodySizeLimit: process.env.BODY_SIZE_LIMIT || '10kb'
};

// =============================================================================
// EXPRESS APPLICATION SETUP
// =============================================================================

const app = express();

// Trust proxy for accurate IP detection behind load balancers
app.set('trust proxy', 1);

// Disable X-Powered-By header (also done by Helmet)
app.disable('x-powered-by');

// =============================================================================
// HELMET.JS SECURITY HEADERS CONFIGURATION
// =============================================================================

/**
 * Configure Helmet.js with comprehensive security headers
 * - Content-Security-Policy: Strict CSP directives
 * - HTTP Strict Transport Security: Enforces HTTPS
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Referrer-Policy: Controls referrer information
 */
app.use(helmet({
  // Content Security Policy - Strict directives
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
      blockAllMixedContent: [],
      baseUri: ["'self'"],
      connectSrc: ["'self'"]
    }
  },
  
  // HTTP Strict Transport Security
  // max-age: 1 year (31536000 seconds)
  // includeSubDomains: Apply to all subdomains
  // preload: Allow preloading in browsers
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options: DENY - Prevent framing entirely
  frameguard: {
    action: 'deny'
  },
  
  // X-Content-Type-Options: nosniff
  noSniff: true,
  
  // Referrer-Policy: strict-origin-when-cross-origin
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Cross-Origin-Opener-Policy: same-origin
  crossOriginOpenerPolicy: {
    policy: 'same-origin'
  },
  
  // Cross-Origin-Resource-Policy: same-origin
  crossOriginResourcePolicy: {
    policy: 'same-origin'
  },
  
  // X-DNS-Prefetch-Control: off
  dnsPrefetchControl: {
    allow: false
  },
  
  // X-Download-Options: noopen (IE specific)
  ieNoOpen: true,
  
  // X-Permitted-Cross-Domain-Policies: none
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  },
  
  // X-XSS-Protection: 0 (disabled as CSP is more effective)
  xssFilter: false
}));

// =============================================================================
// CORS MIDDLEWARE CONFIGURATION
// =============================================================================

/**
 * CORS configuration with whitelist support
 * - Configurable allowed origins
 * - Credentials support enabled
 * - Standard HTTP methods allowed
 * - Specific headers allowed
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (config.allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Policy', 'RateLimit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// =============================================================================
// RATE LIMITING MIDDLEWARE
// =============================================================================

/**
 * Global rate limiter - 100 requests per 15 minutes
 * Applied to all routes
 * Uses draft-7 style headers
 */
const globalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind a proxy, otherwise use IP
    return req.ip || req.connection.remoteAddress;
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  }
});

/**
 * Strict rate limiter - 10 requests per 15 minutes
 * Applied to sensitive endpoints (login, registration, etc.)
 * Uses draft-7 style headers
 */
const strictLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.strictRateLimitMaxRequests,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Too many attempts. Please try again later.',
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
  },
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

// Apply global rate limiter to all routes
app.use(globalLimiter);

// =============================================================================
// BODY PARSING MIDDLEWARE WITH SIZE LIMITS
// =============================================================================

/**
 * Parse JSON request bodies with size limit
 * Limit set to 10KB to prevent large payload attacks
 */
app.use(express.json({ 
  limit: config.bodySizeLimit,
  strict: true,
  type: 'application/json'
}));

/**
 * Parse URL-encoded request bodies with size limit
 * Extended mode enabled for nested objects
 */
app.use(express.urlencoded({ 
  extended: true, 
  limit: config.bodySizeLimit,
  parameterLimit: 100
}));

// =============================================================================
// CACHE-CONTROL MIDDLEWARE
// =============================================================================

/**
 * Set Cache-Control headers to prevent caching of sensitive data
 * Applied to all responses
 */
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// =============================================================================
// JOI VALIDATION SCHEMAS
// =============================================================================

/**
 * User data validation schema
 * Validates name, email, and optional age fields
 * @property {string} name - User's name (3-50 characters, required)
 * @property {string} email - Valid email address (required)
 * @property {number} age - User's age (integer, 18-120, optional)
 */
const userSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50)
    .trim()
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 3 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'Name is required'
    }),
  
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .trim()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  age: Joi.number()
    .integer()
    .min(18)
    .max(120)
    .optional()
    .messages({
      'number.base': 'Age must be a number',
      'number.integer': 'Age must be an integer',
      'number.min': 'Age must be at least 18',
      'number.max': 'Age cannot exceed 120'
    })
});

/**
 * Query parameter validation schema
 * Validates search, page, and limit parameters
 * @property {string} search - Search query (max 100 chars, optional)
 * @property {number} page - Page number (integer, min 1, default 1)
 * @property {number} limit - Items per page (integer, 1-100, default 10)
 */
const querySchema = Joi.object({
  search: Joi.string()
    .max(100)
    .trim()
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .optional()
    .messages({
      'string.max': 'Search query cannot exceed 100 characters',
      'string.pattern.base': 'Search query contains invalid characters'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

/**
 * ID parameter validation schema (UUID v4)
 * Validates URL parameter IDs in UUID format
 * @property {string} id - UUID v4 formatted identifier (required)
 */
const idSchema = Joi.object({
  id: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required()
    .messages({
      'string.empty': 'ID is required',
      'string.guid': 'ID must be a valid UUID v4',
      'any.required': 'ID is required'
    })
});

// =============================================================================
// VALIDATION MIDDLEWARE FACTORY
// =============================================================================

/**
 * Creates a validation middleware for the specified schema and data source
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        message: 'Request validation failed',
        details: errorDetails
      });
    }
    
    // Replace original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * Health check endpoint
 * Excluded from rate limiting
 * GET /health
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Root endpoint - Hello World response
 * GET /
 * Returns greeting with security headers
 */
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Hello, World!',
    timestamp: new Date().toISOString(),
    secure: true
  });
});

/**
 * User validation endpoint
 * POST /validate-user
 * Validates user data against userSchema
 * Apply strict rate limiting for sensitive endpoint
 */
app.post('/validate-user', strictLimiter, validateRequest(userSchema, 'body'), (req, res) => {
  const { name, email, age } = req.body;
  
  res.status(200).json({
    status: 200,
    message: 'User data is valid',
    data: {
      name,
      email,
      age: age || null
    }
  });
});

/**
 * Query parameter validation endpoint
 * GET /validate-query
 * Validates query parameters against querySchema
 */
app.get('/validate-query', validateRequest(querySchema, 'query'), (req, res) => {
  const { search, page, limit } = req.query;
  
  res.status(200).json({
    status: 200,
    message: 'Query parameters are valid',
    data: {
      search: search || null,
      page,
      limit
    }
  });
});

/**
 * Item retrieval endpoint with ID validation
 * GET /items/:id
 * Validates UUID id parameter against idSchema
 */
app.get('/items/:id', validateRequest(idSchema, 'params'), (req, res) => {
  const { id } = req.params;
  
  res.status(200).json({
    status: 200,
    message: 'Item retrieved successfully',
    data: {
      id,
      retrieved: true,
      timestamp: new Date().toISOString()
    }
  });
});

// =============================================================================
// 404 NOT FOUND HANDLER
// =============================================================================

/**
 * Handle requests to undefined routes
 * Returns 404 status with secure error message
 */
app.use((req, res, next) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `The requested resource '${req.path}' was not found on this server`,
    path: req.path,
    method: req.method
  });
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

/**
 * Global error handler
 * - Production: Returns generic error messages without stack traces
 * - Development: Returns detailed error information for debugging
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
app.use((err, req, res, next) => {
  // Log error for debugging (in production, use proper logging service)
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      status: 403,
      error: 'Forbidden',
      message: 'Cross-origin request not allowed'
    });
  }
  
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Invalid JSON in request body'
    });
  }
  
  // Handle body size limit exceeded
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      status: 413,
      error: 'Payload Too Large',
      message: `Request body exceeds the ${config.bodySizeLimit} limit`
    });
  }
  
  // Handle Joi validation errors (fallback)
  if (err.isJoi) {
    return res.status(400).json({
      status: 400,
      error: 'Validation Error',
      message: 'Request validation failed',
      details: err.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }
  
  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const errorResponse = {
    status: statusCode,
    error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
    message: config.nodeEnv === 'production' 
      ? 'An unexpected error occurred. Please try again later.'
      : err.message
  };
  
  // Include stack trace in development mode only
  if (config.nodeEnv === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }
  
  res.status(statusCode).json(errorResponse);
});

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

/**
 * HTTP Server instance
 * @type {http.Server}
 */
let httpServer = null;

/**
 * HTTPS Server instance (optional)
 * @type {https.Server}
 */
let httpsServer = null;

/**
 * Starts the HTTP server
 * @returns {http.Server} HTTP server instance
 */
const startHttpServer = () => {
  httpServer = http.createServer(app);
  
  httpServer.listen(config.httpPort, config.hostname, () => {
    console.log(`[${new Date().toISOString()}] HTTP Server running at http://${config.hostname}:${config.httpPort}/`);
    console.log(`[${new Date().toISOString()}] Environment: ${config.nodeEnv}`);
  });
  
  // Handle server errors
  httpServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[${new Date().toISOString()}] Error: Port ${config.httpPort} is already in use`);
    } else {
      console.error(`[${new Date().toISOString()}] Server error:`, error);
    }
    process.exit(1);
  });
  
  return httpServer;
};

/**
 * Starts the HTTPS server if SSL certificates are available
 * Uses TLS 1.2+ with secure cipher configuration
 * @returns {https.Server|null} HTTPS server instance or null if certs not found
 */
const startHttpsServer = () => {
  // Check if SSL certificates exist
  if (!fs.existsSync(config.sslKeyPath) || !fs.existsSync(config.sslCertPath)) {
    console.log(`[${new Date().toISOString()}] HTTPS: SSL certificates not found. HTTPS server not started.`);
    console.log(`[${new Date().toISOString()}] HTTPS: To enable HTTPS, provide certificates at:`);
    console.log(`[${new Date().toISOString()}]   - Key: ${config.sslKeyPath}`);
    console.log(`[${new Date().toISOString()}]   - Cert: ${config.sslCertPath}`);
    return null;
  }
  
  try {
    const sslOptions = {
      key: fs.readFileSync(config.sslKeyPath),
      cert: fs.readFileSync(config.sslCertPath),
      // TLS configuration for security
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      // Secure cipher suites
      ciphers: [
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-CHACHA20-POLY1305',
        'ECDHE-RSA-CHACHA20-POLY1305',
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'DHE-RSA-AES256-GCM-SHA384',
        'DHE-RSA-AES128-GCM-SHA256'
      ].join(':'),
      honorCipherOrder: true,
      // Prefer server cipher order
      ecdhCurve: 'secp384r1'
    };
    
    httpsServer = https.createServer(sslOptions, app);
    
    httpsServer.listen(config.httpsPort, config.hostname, () => {
      console.log(`[${new Date().toISOString()}] HTTPS Server running at https://${config.hostname}:${config.httpsPort}/`);
      console.log(`[${new Date().toISOString()}] TLS: Version 1.2+ with secure ciphers enabled`);
    });
    
    // Handle HTTPS server errors
    httpsServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[${new Date().toISOString()}] Error: Port ${config.httpsPort} is already in use`);
      } else {
        console.error(`[${new Date().toISOString()}] HTTPS Server error:`, error);
      }
    });
    
    return httpsServer;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start HTTPS server:`, error.message);
    return null;
  }
};

// =============================================================================
// GRACEFUL SHUTDOWN HANDLING
// =============================================================================

/**
 * Active connections tracker for graceful shutdown
 * @type {Set}
 */
const connections = new Set();

/**
 * Tracks active connections for graceful shutdown
 * @param {http.Server} server - Server to track connections for
 */
const trackConnections = (server) => {
  if (!server) return;
  
  server.on('connection', (connection) => {
    connections.add(connection);
    connection.on('close', () => {
      connections.delete(connection);
    });
  });
};

/**
 * Gracefully shuts down the server
 * - Stops accepting new connections
 * - Waits for existing connections to complete
 * - Forces close after timeout
 * @param {string} signal - Signal that triggered shutdown
 */
const gracefulShutdown = (signal) => {
  console.log(`\n[${new Date().toISOString()}] ${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  const shutdownPromises = [];
  
  if (httpServer) {
    shutdownPromises.push(
      new Promise((resolve) => {
        httpServer.close((err) => {
          if (err) {
            console.error(`[${new Date().toISOString()}] Error closing HTTP server:`, err);
          } else {
            console.log(`[${new Date().toISOString()}] HTTP server closed`);
          }
          resolve();
        });
      })
    );
  }
  
  if (httpsServer) {
    shutdownPromises.push(
      new Promise((resolve) => {
        httpsServer.close((err) => {
          if (err) {
            console.error(`[${new Date().toISOString()}] Error closing HTTPS server:`, err);
          } else {
            console.log(`[${new Date().toISOString()}] HTTPS server closed`);
          }
          resolve();
        });
      })
    );
  }
  
  // Force close connections after timeout
  const forceCloseTimeout = setTimeout(() => {
    console.log(`[${new Date().toISOString()}] Forcing close of ${connections.size} remaining connections`);
    connections.forEach((connection) => {
      connection.destroy();
    });
  }, 10000); // 10 second timeout
  
  Promise.all(shutdownPromises)
    .then(() => {
      clearTimeout(forceCloseTimeout);
      console.log(`[${new Date().toISOString()}] Graceful shutdown complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[${new Date().toISOString()}] Error during shutdown:`, err);
      process.exit(1);
    });
};

// Register signal handlers for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Only start servers if this file is run directly (not imported for testing)
if (require.main === module) {
  console.log(`[${new Date().toISOString()}] Starting server...`);
  console.log(`[${new Date().toISOString()}] Security features enabled:`);
  console.log('  - Helmet.js security headers (CSP, HSTS, X-Frame-Options, etc.)');
  console.log('  - CORS with whitelist');
  console.log('  - Rate limiting (100 req/15min global, 10 req/15min strict)');
  console.log('  - Joi input validation');
  console.log('  - Body size limits (10KB)');
  console.log('  - Cache-Control headers');
  console.log('  - Secure error handling');
  
  // Start HTTP server
  const http = startHttpServer();
  trackConnections(http);
  
  // Attempt to start HTTPS server (if certificates available)
  const https = startHttpsServer();
  trackConnections(https);
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Export the Express app and validation schemas for testing
 * @exports {Object} - Contains app instance and Joi validation schemas
 */
module.exports = {
  app,
  userSchema,
  querySchema,
  idSchema
};
