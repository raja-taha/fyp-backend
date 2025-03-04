const http = require("http");
const app = require("./app");
const configureEnvironment = require("./config/env");
const connectDB = require("./config/db");

// Load environment variables
configureEnvironment();

// Connect to the database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
