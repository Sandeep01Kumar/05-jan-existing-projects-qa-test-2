/**
 * @module hello_world/server
 * @description A minimal Node.js HTTP server that listens on a specified
 * hostname and port, responding to every incoming request with a plain-text
 * "Hello, World!" greeting.
 * @author hxu
 * @version 1.0.0
 * @license MIT
 */

// Import the built-in Node.js HTTP module for creating the server
const http = require('http');

// Server configuration constants
/**
 * @constant {string} hostname
 * @description The IP address on which the server will listen for incoming connections.
 * Set to the loopback address (localhost) to restrict access to the local machine.
 * @default '127.0.0.1'
 */
const hostname = '127.0.0.1';

/**
 * @constant {number} port
 * @description The TCP port number on which the server will listen for incoming connections.
 * @default 3000
 */
const port = 3000;

/**
 * @description Creates an HTTP server with a request handler that responds to every
 * incoming request with a plain-text "Hello, World!" message and a 200 OK status code.
 * The handler does not perform routing — all HTTP methods and paths receive the same response.
 * @param {http.IncomingMessage} req - The incoming HTTP request object.
 * @param {http.ServerResponse} res - The server response object used to send data back to the client.
 */
const server = http.createServer((req, res) => {
  // Set the HTTP response status code to 200 (OK)
  res.statusCode = 200;
  // Set the response Content-Type header to plain text
  res.setHeader('Content-Type', 'text/plain');
  // Send the response body and signal that the response is complete
  res.end('Hello, World!\n');
});

/**
 * @description Starts the HTTP server, binding it to the specified hostname and port.
 * Once the server is successfully listening, the callback logs the server URL to the console.
 */
server.listen(port, hostname, () => {
  // Log the server URL to the console to confirm successful startup
  console.log(`Server running at http://${hostname}:${port}/`);
});
