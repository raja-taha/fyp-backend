const express = require("express");
const router = express.Router();
const {
  createAgent,
  loginUser,
  logoutUser,
  updateUserStatus,
  createAdmin,
  getAgents,
} = require("../controllers/userController");

const {
  protect,
  isAdmin,
  isSuperAdmin,
  isAgent,
} = require("../middlewares/authMiddleware");

// ** Public Routes **
router.post("/login", loginUser); // Unified login for both agents and admins

// ** Protected Routes (Require Authentication) **
router.use(protect);

// ** Logout Route (For Both Agents & Admins) **
router.post("/logout", logoutUser);

// ** User Status Management **
router.patch("/status", updateUserStatus); // User updates their own status
router.patch("/status/:userId", isAdmin, updateUserStatus); // Admin updates any user's status

// ** Admin Routes (Agent Management) **
router.get("/agents", isAdmin, getAgents);
router.post("/agent/create", isAdmin, createAgent); // Admin creates an agent

module.exports = router;
