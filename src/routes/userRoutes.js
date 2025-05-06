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
  getAdminTeam,
  getAgentTeam,
  updateAgentProfile,
  updateAdminProfile,
  setUserStatus,
  updateLanguage,
  updateSuperAdminProfile,
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
router.patch("/set-status", setUserStatus); // New simplified status endpoint
router.patch("/language", updateLanguage); // New language update endpoint
router.get("/agents", isAdmin, getAgents);
router.get("/team", isAdmin, getAdminTeam); // Admin's team endpoint
router.get("/myteam", isAgent, getAgentTeam); // Agent's team endpoint
router.post("/agent/create", isAdmin, createAgent);
router.put("/agent/profile", isAgent, updateAgentProfile); // Update agent profile endpoint
router.put("/admin/profile", isAdmin, updateAdminProfile); // Update admin profile endpoint
router.put("/superadmin/profile", isSuperAdmin, updateSuperAdminProfile); // Update superadmin profile endpoint
router.delete("/agent/:agentId", deleteAgent);
router.patch("/admin/verify/:adminId", isSuperAdmin, verifyAdmin); // Superadmin verifies admin
router.get("/admins", isSuperAdmin, getAdmins);

module.exports = router;
