const Message = require("../models/Message");
const User = require("../models/User");
const Client = require("../models/Client");
const { getIo } = require("../socket"); // Import the socket instance
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

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

/**
 * Transcribes and translates voice message using the Python microservice
 * @param {string} audioFilePath - Path to the audio file
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} - Transcription and translation result
 */
async function transcribeVoiceMessage(audioFilePath, targetLanguage) {
  try {
    if (!audioFilePath) {
      throw new Error("Audio file path is required");
    }

    const formData = new FormData();
    formData.append("audio", fs.createReadStream(audioFilePath));
    formData.append("target_lang", targetLanguage || "en");

    const response = await axios.post(
      `${PYTHON_MICROSERVICE_URL}/transcribe`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    return {
      transcript: response.data.transcript || "",
      translation: response.data.translation || "",
      sourceLanguage:
        response.data.source_language ||
        response.data.detected_language ||
        "unknown",
      targetLanguage: response.data.target_language || targetLanguage,
    };
  } catch (error) {
    console.error("Voice transcription error:", error.message);
    // Return empty results if transcription fails
    return {
      transcript: "",
      translation: "",
      sourceLanguage: "unknown",
      targetLanguage: targetLanguage || "en",
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
      clientId,
      agentId,
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

    // Get the client and agent to determine their languages
    const client = await Client.findById(clientId);
    const agent = await User.findById(agentId);

    if (!client || !agent) {
      return res.status(404).json({ error: "Client or agent not found" });
    }

    // Get languages from models
    const clientLanguage = client.language || "en";
    const agentLanguage = agent.language || "en";

    // Determine source and target language based on sender
    let targetLanguage;
    if (sender === "agent") {
      targetLanguage = clientLanguage;
    } else {
      targetLanguage = agentLanguage;
    }

    // Process the voice message with Python microservice for transcription and translation
    const transcriptionResult = await transcribeVoiceMessage(
      req.file.path,
      targetLanguage
    );

    // If saveMessage is true, save the message directly to the database
    if (saveMessage === "true" || saveMessage === true) {
      const messageTimestamp = timestamp ? new Date(timestamp) : new Date();

      let chatSession = await Message.findOne({ clientId, agentId });
      if (!chatSession) {
        chatSession = new Message({ clientId, agentId, messages: [] });
      }

      // Create a message with the audio and transcription/translation
      // For client messages, don't include the transcript text in the HTML
      const messageText =
        sender === "client"
          ? `<div class="voice-message">
            <audio controls src="${audioUrl}"></audio>
          </div>`
          : `<div class="voice-message">
            <audio controls src="${audioUrl}"></audio>
            <div class="transcript">${transcriptionResult.transcript}</div>
          </div>`;

      const messageObj = {
        sender,
        clientId,
        agentId,
        text: messageText,
        translatedText: transcriptionResult.translation,
        transcript: transcriptionResult.transcript,
        sourceLanguage: transcriptionResult.sourceLanguage,
        targetLanguage: transcriptionResult.targetLanguage,
        timestamp: messageTimestamp,
        isVoiceMessage: true,
        audioUrl: audioUrl,
      };

      chatSession.messages.push(messageObj);
      await chatSession.save();

      // Get Socket.io instance and emit messages
      const io = getIo();
      io.to(agentId.toString()).emit("newMessage", messageObj);
      io.to(clientId.toString()).emit("newMessage", messageObj);
    }

    // Return the audio URL, transcription, and translation for the client to use
    res.status(201).json({
      message: "Voice message processed successfully",
      audioUrl,
      transcript: transcriptionResult.transcript,
      translation: transcriptionResult.translation,
      sourceLanguage: transcriptionResult.sourceLanguage,
      targetLanguage: transcriptionResult.targetLanguage,
      isVoiceMessage: true,
    });
  } catch (error) {
    console.error("Error processing voice message:", error);

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
