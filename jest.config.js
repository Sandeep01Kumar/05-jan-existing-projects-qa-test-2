/**
 * Jest Configuration File
 * 
 * This configuration file sets up Jest for running security tests in a Node.js
 * environment. It is designed to support the 33 comprehensive security tests
 * covering all security features implemented in server.js including:
 * - Security Headers (Helmet.js)
 * - CORS Configuration
 * - Rate Limiting
 * - Input Validation (Joi)
 * - API Endpoints
 * - Error Handling
 * - Response Headers
 * - Body Size Limits
 * 
 * @see Section 0.5 - Jest configuration for Node.js testing environment
 * @see Section 0.6 - Support for 33 security tests with coverage reporting
 */

/**
 * Jest configuration object
 * @type {import('jest').Config}
 */
const jestConfig = {
  /**
   * Use Node.js environment for testing
   * Required for testing server-side code with Express.js
   */
  testEnvironment: 'node',

  /**
   * Enable verbose test output
   * Provides detailed information about each test run
   */
  verbose: true,

  /**
   * Match test files in __tests__ directory
   * Looks for files ending with .test.js in the __tests__ folder
   */
  testMatch: ['**/__tests__/**/*.test.js'],

  /**
   * Enable code coverage collection
   * Tracks which lines of code are executed during tests
   */
  collectCoverage: true,

  /**
   * Output coverage reports to 'coverage' folder
   * Contains all generated coverage reports
   */
  coverageDirectory: 'coverage',

  /**
   * Generate multiple coverage report formats:
   * - text: Console output for quick viewing
   * - lcov: Standard format for CI/CD integration
   * - html: Visual HTML report for detailed analysis
   */
  coverageReporters: ['text', 'lcov', 'html'],

  /**
   * Collect coverage from main server file
   * Focuses coverage metrics on the primary application code
   */
  collectCoverageFrom: ['server.js'],

  /**
   * Coverage threshold configuration
   * Defines minimum coverage requirements for the test suite
   * Based on Section 0.6 verification results:
   * - Statements: 75.2% achieved
   * - Branches: 57.14% achieved
   * - Functions: 62.96% achieved
   * - Lines: 76.22% achieved
   * 
   * Thresholds set slightly below achieved values to allow for
   * minor fluctuations while maintaining quality standards
   */
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      functions: 60,
      lines: 70
    }
  },

  /**
   * Set 10 second timeout for async tests
   * Provides adequate time for:
   * - HTTP request/response cycles
   * - Rate limiting tests that may need delays
   * - HTTPS connection establishment
   * - Database operations (if any)
   */
  testTimeout: 10000,

  /**
   * Clear mock calls, instances and results between every test
   * Ensures test isolation and prevents state leakage
   */
  clearMocks: true,

  /**
   * Automatically restore mock state between every test
   * Prevents mocks from affecting subsequent tests
   */
  restoreMocks: true,

  /**
   * Force coverage collection from untested files
   * Ensures accurate coverage metrics even for untested code
   */
  forceCoverageMatch: ['**/*.js'],

  /**
   * Paths to ignore during testing
   * Excludes node_modules and coverage directory from test discovery
   */
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],

  /**
   * Paths to ignore during coverage collection
   * Excludes configuration files and test files from coverage metrics
   */
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/__tests__/',
    'jest.config.js'
  ],

  /**
   * Module paths for resolving imports
   * Uses Node.js module resolution strategy
   */
  moduleDirectories: ['node_modules'],

  /**
   * Run tests in band (serially) to avoid port conflicts
   * Important for HTTP server tests that bind to specific ports
   */
  runInBand: true,

  /**
   * Detect open handles that prevent Jest from exiting
   * Helps identify unclosed server connections or database handles
   */
  detectOpenHandles: true,

  /**
   * Force exit after test suite completion
   * Ensures Jest terminates even if there are lingering async operations
   */
  forceExit: true
};

// Export the configuration as default module export
module.exports = jestConfig;
