// routes/messageRoutes.js
const express = require("express");
const { sendMessage, getMessages } = require("../controllers/messageController");

const router = express.Router();

router.post("/message", sendMessage);
router.get("/messages", getMessages);

module.exports = router;
