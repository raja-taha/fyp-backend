const Message = require("../models/Message");
const User = require("../models/User");
const Client = require("../models/Client");
const { getIo } = require("../socket"); // Import the socket instance
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const PYTHON_MICROSERVICE_URL =
  process.env.PYTHON_MICROSERVICE_URL || "http://0.0.0.0:8000";

/**
 * Translates text using the Python microservice
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code
 * @returns {Promise<Object>} - Translation result
 */
async function translateMessage(text, targetLanguage, sourceLanguage) {
  try {
    if (!text || !targetLanguage) {
      throw new Error("Text and target language are required");
    }

    const response = await axios.post(`${PYTHON_MICROSERVICE_URL}/translate`, {
      text,
      target_language: targetLanguage,
      source_language: sourceLanguage || "",
    });

    return {
      translatedText: response.data.translated_text,
      sourceLanguage:
        response.data.source_language ||
        response.data.detected_language ||
        sourceLanguage,
      targetLanguage: response.data.target_language,
    };
  } catch (error) {
    console.error("Translation error:", error.message);
    // Return original text if translation fails to ensure graceful fallback
    return {
      translatedText: text,
      sourceLanguage: sourceLanguage || "unknown",
      targetLanguage: targetLanguage,
    };
  }
}

// Send message
const sendMessage = async (req, res) => {
  try {
    const { clientId, agentId, sender, text, timestamp, isVoiceMessage } =
      req.body;

    if (!clientId || !agentId || !sender || !text) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Get the client and agent to determine their languages
    const client = await Client.findById(clientId);
    const agent = await User.findById(agentId);

    if (!client || !agent) {
      return res.status(404).json({ error: "Client or agent not found" });
    }

    // Get languages from models
    const clientLanguage = client.language || "en";
    const agentLanguage = agent.language || "en";

    let chatSession = await Message.findOne({ clientId, agentId });

    if (!chatSession) {
      chatSession = new Message({ clientId, agentId, messages: [] });
    }

    // Use the provided timestamp if available, otherwise use current time
    const messageTimestamp = timestamp ? new Date(timestamp) : new Date();

    // Determine source and target languages based on sender
    let sourceLanguage, targetLanguage;

    if (sender === "agent") {
      sourceLanguage = agentLanguage;
      targetLanguage = clientLanguage;
    } else {
      sourceLanguage = clientLanguage;
      targetLanguage = agentLanguage;
    }

    // Skip translation if languages are the same
    let translationResult;
    if (sourceLanguage === targetLanguage) {
      translationResult = {
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      };
    } else {
      // Translate the message
      translationResult = await translateMessage(
        text,
        targetLanguage,
        sourceLanguage
      );
    }

    // Create message object with translation data
    const messageObj = {
      sender,
      text, // Original text
      translatedText: translationResult.translatedText,
      sourceLanguage: translationResult.sourceLanguage,
      targetLanguage: translationResult.targetLanguage,
      timestamp: messageTimestamp,
      isVoiceMessage: isVoiceMessage || false,
    };

    // Add message to chat session
    chatSession.messages.push(messageObj);
    await chatSession.save();

    // Get Socket.io instance and emit messages
    const io = getIo();
    io.to(agentId.toString()).emit("newMessage", messageObj);
    io.to(clientId.toString()).emit("newMessage", messageObj);

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

      // Get the client and agent to determine their languages
      const client = await Client.findById(clientId);
      const agent = await User.findById(agentId);

      if (!client || !agent) {
        return res.status(404).json({ error: "Client or agent not found" });
      }

      // Get languages from models
      const clientLanguage = client.language || "en";
      const agentLanguage = agent.language || "en";

      let chatSession = await Message.findOne({ clientId, agentId });
      if (!chatSession) {
        chatSession = new Message({ clientId, agentId, messages: [] });
      }

      // For voice messages, we don't translate the audio content
      // but we add translation fields for consistency
      let sourceLanguage, targetLanguage;
      if (sender === "agent") {
        sourceLanguage = agentLanguage;
        targetLanguage = clientLanguage;
      } else {
        sourceLanguage = clientLanguage;
        targetLanguage = agentLanguage;
      }

      const messageObj = {
        sender,
        text: messageText,
        translatedText: messageText, // Same as original for voice messages
        sourceLanguage,
        targetLanguage,
        timestamp: messageTimestamp,
        isVoiceMessage: true,
      };

      chatSession.messages.push(messageObj);
      await chatSession.save();

      // Get Socket.io instance and emit messages
      const io = getIo();
      io.to(agentId.toString()).emit("newMessage", messageObj);
      io.to(clientId.toString()).emit("newMessage", messageObj);
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
