const mongoose = require("mongoose");

const clientSchema = mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    language: { type: String, default: "en" }, // Default language is English
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // ✅ Client is assigned to an agent
    },
    chatbot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chatbot",
      required: true, // The chatbot on which the client signed up
    },
  },
  {
    timestamps: true,
  }
);

const Client = mongoose.model("Client", clientSchema);
module.exports = Client;
