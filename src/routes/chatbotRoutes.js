const express = require("express");
const {
  getChatbots,
  getChatbotWidget,
  getChatbotScript,
  viewChatbot,
  handleChatbotMessage,
  getChatbotById,
  createChatbot,
  getChatbotByAdmin,
  getPublicChatbotInfo,
} = require("../controllers/chatbotController");
const {
  isSuperAdmin,
  protect,
  isAdmin,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// Public routes (no authentication required)
router.get("/widget", getChatbotWidget);
router.get("/view", viewChatbot);
router.post("/:chatbotId/message", handleChatbotMessage);
router.get("/public/:chatbotId", getPublicChatbotInfo);

// Protected Routes (Require Authentication)
router.use(protect);
router.get("/script", getChatbotScript);
router.get("/getChatbotBtId/:chatbotId", getChatbotById);

router.get("/admin-chatbot", protect, isAdmin, getChatbotByAdmin);

router.post("/create", isAdmin, createChatbot);
router.get("/", isSuperAdmin, getChatbots);

module.exports = router;
