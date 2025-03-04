// Import required modules
const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const morgan = require("morgan");
const errorHandler = require("./middlewares/errorHandler");
const userRoutes = require("./routes/userRoutes");
const clientRoutes = require("./routes/clientRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");

// Load environment variables
dotenv.config();

// Initialize the Express app
const app = express();
app.use("/src/public", express.static(path.join(__dirname, "src/public")));

// Middleware setup
app.use(express.json()); // Parse JSON requests
app.use(cors()); // Enable CORS for all origins
app.use(morgan("dev")); // Log HTTP requests

app.get("/", (req, res) => {
  res.send("Welcome");
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/chatbots", chatbotRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
