const winston = require("winston");
const fs = require("fs");
const path = require("path");

// Ensure the logs directory exists
const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, "app.log") }), // Log to file
  ],
});

module.exports = logger;
