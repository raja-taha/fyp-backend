// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "agent" }, // agent, admin, superadmin
    verified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Active", "Not Active", "Busy"],
      default: "Not Active",
    }, // New field
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
