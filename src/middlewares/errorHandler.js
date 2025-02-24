/**
 * Custom error handling middleware.
 * This middleware captures errors, formats them, and sends a proper response to the client.
 */

// Default error handler
const errorHandler = (err, req, res, next) => {
  console.error(`[Error]: ${err.message}`);

  // Set default error status code and message
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || "Internal Server Error";

  // Additional error details (useful in development)
  const errorDetails =
    process.env.NODE_ENV === "development" ? err.stack : null;

  // Send the error response
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    ...(errorDetails && { details: errorDetails }),
  });
};

// Export the middleware
module.exports = errorHandler;
