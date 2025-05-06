const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  messages: [
    {
      sender: { type: String, enum: ["client", "agent"], required: true }, // Sender type
      clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true,
      }, // Add clientId to each message
      agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      }, // Add agentId to each message
      text: { type: String, required: true }, // Original message content
      translatedText: { type: String }, // Translated message content
      sourceLanguage: { type: String }, // Source language of the message
      targetLanguage: { type: String }, // Target language (language it was translated to)
      timestamp: { type: Date, default: Date.now }, // Message timestamp
      isVoiceMessage: { type: Boolean, default: false }, // Flag for voice messages
    },
  ],
});

module.exports = mongoose.model("Message", messageSchema);
