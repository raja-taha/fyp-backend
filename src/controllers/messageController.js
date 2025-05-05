const Message = require("../models/Message");
const { getIo } = require("../socket"); // Import the socket instance
const fs = require("fs");
const path = require("path");

// Send message
const sendMessage = async (req, res) => {
  try {
    const { clientId, agentId, sender, text, timestamp, isVoiceMessage } =
      req.body;

    if (!clientId || !agentId || !sender || !text) {
      return res.status(400).json({ error: "All fields are required" });
    }

    let chatSession = await Message.findOne({ clientId, agentId });

    if (!chatSession) {
      chatSession = new Message({ clientId, agentId, messages: [] });
    }

    // Use the provided timestamp if available, otherwise use current time
    const messageTimestamp = timestamp ? new Date(timestamp) : new Date();

    chatSession.messages.push({
      sender,
      text,
      timestamp: messageTimestamp,
      isVoiceMessage: isVoiceMessage || false,
    });

    await chatSession.save();

    // Get Socket.io instance and emit messages
    const io = getIo();
    io.to(agentId.toString()).emit("newMessage", {
      clientId,
      agentId,
      sender,
      text,
      timestamp: messageTimestamp,
      isVoiceMessage: isVoiceMessage || false,
    });

    io.to(clientId.toString()).emit("newMessage", {
      clientId,
      agentId,
      sender,
      text,
      timestamp: messageTimestamp,
      isVoiceMessage: isVoiceMessage || false,
    });

    res.status(201).json({ message: "Message sent successfully", chatSession });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all messages between a client and agent
const getMessages = async (req, res) => {
  try {
    const { clientId, agentId } = req.query;

    if (!clientId || !agentId) {
      return res
        .status(400)
        .json({ error: "Client ID and Agent ID are required" });
    }

    const chatSession = await Message.findOne({ clientId, agentId });

    if (!chatSession) {
      return res.status(404).json({ message: "No messages found" });
    }

    res.status(200).json(chatSession.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Upload voice message
const uploadVoiceMessage = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const { clientId, agentId, sender, timestamp, saveMessage } = req.body;

    if (!clientId || !agentId || !sender) {
      // Delete the uploaded file if request is invalid
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "All fields are required" });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, "../public/uploads/voice-messages");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate the URL for the uploaded audio file
    const audioUrl = `/uploads/voice-messages/${req.file.filename}`;

    // If saveMessage is true, save the message directly to the database
    if (saveMessage === "true") {
      const messageText = `<div class="voice-message"><audio controls src="${audioUrl}"></audio></div>`;
      const messageTimestamp = timestamp ? new Date(timestamp) : new Date();

      let chatSession = await Message.findOne({ clientId, agentId });
      if (!chatSession) {
        chatSession = new Message({ clientId, agentId, messages: [] });
      }

      chatSession.messages.push({
        sender,
        text: messageText,
        timestamp: messageTimestamp,
        isVoiceMessage: true,
      });

      await chatSession.save();

      // Get Socket.io instance and emit messages
      const io = getIo();
      const messageData = {
        clientId,
        agentId,
        sender,
        text: messageText,
        timestamp: messageTimestamp,
        isVoiceMessage: true,
      };

      io.to(agentId.toString()).emit("newMessage", messageData);
      io.to(clientId.toString()).emit("newMessage", messageData);
    }

    // Return the audio URL for the client to use
    res.status(201).json({
      message: "Voice message uploaded successfully",
      audioUrl,
      isVoiceMessage: true,
    });
  } catch (error) {
    console.error("Error uploading voice message:", error);

    // Delete the uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError);
      }
    }

    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { sendMessage, getMessages, uploadVoiceMessage };
