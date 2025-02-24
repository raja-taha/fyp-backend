const express = require("express");
const router = express.Router();
const {
  signupAgent,
  loginUser, // Handles login for both agents and admins
  logoutUser,
  updateUserStatus,
  approveAgent,
  promoteAgent,
  createAdmin,
  demoteAdmin,
} = require("../controllers/userController"); // Merged controller

const {
  protect,
  isAdmin,
  isSuperAdmin,
  isAgent,
} = require("../middlewares/authMiddleware");

// ** Public Routes **
router.post("/signup", signupAgent); // Agent Signup
router.post("/login", loginUser); // Unified login for both agents and admins

// ** Protected Routes (Require Authentication) **
router.use(protect);

// ** Logout Route (For Both Agents & Admins) **
router.post("/logout", logoutUser);

// ** User Status Management **
router.patch("/status", isAgent, updateUserStatus); // Agent updates their own status
router.patch("/status/:userId", isAdmin, updateUserStatus); // Admin updates agent/admin status

// ** Admin Routes (Manage Agents) **
router.put("/approve/:agentId", isAdmin, approveAgent); // Approve an agent

// ** Super Admin Routes (Admin Management) **
router.post("/admin/create", isSuperAdmin, createAdmin); // Create a new admin
router.put("/admin/promote/:agentId", isSuperAdmin, promoteAgent); // Promote agent to admin
router.put("/admin/demote/:adminId", isSuperAdmin, demoteAdmin); // Demote admin to agent

module.exports = router;
