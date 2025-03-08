const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  messages: [
    {
      sender: { type: String, enum: ["client", "agent"], required: true }, // Sender type
      text: { type: String, required: true }, // Message content
      timestamp: { type: Date, default: Date.now }, // Message timestamp
    },
  ],
});

module.exports = mongoose.model("Message", messageSchema);
