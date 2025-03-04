const express = require("express");
const {
  createChatbotWithAdmin,
  getChatbots,
  getChatbotWidget,
  getChatbotScript,
  viewChatbot,
  handleChatbotMessage,
} = require("../controllers/chatbotController");
const { isSuperAdmin, protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Public routes (no authentication required)
router.get("/widget", getChatbotWidget);
router.get("/view", viewChatbot);
router.post("/:chatbotId/message", handleChatbotMessage);

// Protected Routes (Require Authentication)
router.use(protect);
router.get("/script", getChatbotScript);

router.post("/create", isSuperAdmin, createChatbotWithAdmin);
router.get("/", isSuperAdmin, getChatbots);

module.exports = router;
