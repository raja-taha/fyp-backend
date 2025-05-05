// routes/messageRoutes.js
const express = require("express");
const {
  sendMessage,
  getMessages,
  uploadVoiceMessage,
} = require("../controllers/messageController");
const multer = require("multer");
const path = require("path");

// Configure multer for voice message uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/voice-messages"));
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, "voice-msg-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Accept only audio files
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

const router = express.Router();

router.post("/message", sendMessage);
router.get("/messages", getMessages);
router.post("/voice-message", upload.single("audio"), uploadVoiceMessage);

module.exports = router;
