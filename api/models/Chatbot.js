const mongoose = require("mongoose");

const chatbotSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: async function (adminId) {
          const admin = await mongoose.model("User").findById(adminId);
          return admin && admin.role === "admin";
        },
        message: "Only an admin can create a chatbot",
      },
    },
    description: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Chatbot = mongoose.model("Chatbot", chatbotSchema);

module.exports = Chatbot;
