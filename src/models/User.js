const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["agent", "admin", "superadmin"], // Fixed roles
      default: "agent",
    },
    verified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Active", "Not Active", "Busy"],
      default: "Not Active",
    },
    language: {
      type: String,
      default: "en",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Only relevant for agents (who are created by an admin)
    },
    clientsHandled: { type: Number, default: 0 }, // ✅ Track number of clients handled
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
