// routes/messageRoutes.js
const express = require("express");
const { assignAndSendMessage } = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Automatically assign an available agent and send a message
router.post("/assign-and-send", protect, assignAndSendMessage);

module.exports = router;
