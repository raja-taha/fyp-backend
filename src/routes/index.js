const express = require("express");
const router = express.Router();

// Import other route files
const userRoutes = require("./userRoutes");
const clientRoutes = require("./clientRoutes");
const chatRoutes = require("./chatRoutes");
const chatbotRoutes = require("./chatbotRoutes");
const dashboardRoutes = require("./dashboardRoutes");

// Set up API routes
router.use("/api/users", userRoutes);
router.use("/api/clients", clientRoutes);
router.use("/api/chats", chatRoutes);
router.use("/api/chatbots", chatbotRoutes);
router.use("/api/dashboard", dashboardRoutes);

// Language routes
router.get("/api/languages", (req, res) => {
  const languages = require("../utils/languages");
  res.json(languages);
});

module.exports = router;
