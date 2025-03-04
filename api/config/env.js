const dotenv = require("dotenv");
const path = require("path");

/**
 * Loads environment variables from `.env` file.
 * Logs the environment mode for debugging purposes.
 */
const configureEnvironment = () => {
  const envPath = path.resolve(__dirname, "../.env");
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.error("Failed to load .env file:", result.error.message);
    process.exit(1);
  }

  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
};

module.exports = configureEnvironment;
