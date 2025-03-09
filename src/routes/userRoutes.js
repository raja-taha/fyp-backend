const express = require("express");
const router = express.Router();
const {
  createAgent,
  loginUser,
  logoutUser,
  updateUserStatus,
  createAdmin,
  verifyAdmin,
  getAgents,
  getAdmins,
  deleteAgent,
} = require("../controllers/userController");

const {
  protect,
  isAdmin,
  isSuperAdmin,
  isAgent,
} = require("../middlewares/authMiddleware");

// ** Public Routes **
router.post("/login", loginUser);
router.post("/admin/create", createAdmin); // Public route for creating admin

// ** Protected Routes (Require Authentication) **
router.use(protect);
router.post("/logout", logoutUser);
router.patch("/status", updateUserStatus);
router.patch("/status/:userId", isAdmin, updateUserStatus);
router.get("/agents", isAdmin, getAgents);
router.post("/agent/create", isAdmin, createAgent);
router.delete("/agent/:agentId", deleteAgent);
router.patch("/admin/verify/:adminId", isSuperAdmin, verifyAdmin); // Superadmin verifies admin
router.get("/admins", isSuperAdmin, getAdmins);

module.exports = router;
