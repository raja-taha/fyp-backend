const express = require("express");
const router = express.Router();
const {
  getSuperAdminDashboardStats,
  getClientsOverPeriod,
  getAdminDashboardStats,
  getAdminClientsOverPeriod,
  getAgentDashboardStats,
  getAgentClientsOverPeriod,
} = require("../controllers/dashboardController");

const {
  protect,
  isSuperAdmin,
  isAdmin,
  isAgent,
} = require("../middlewares/authMiddleware");

// ** Protected Routes (Require Authentication) **
router.use(protect);

// Superadmin dashboard stats
router.get("/superadmin/stats", isSuperAdmin, getSuperAdminDashboardStats);

// Clients over a specified period for superadmin
router.get("/clients/period/:period", isSuperAdmin, getClientsOverPeriod);

// Admin dashboard stats
router.get("/admin/stats", isAdmin, getAdminDashboardStats);

// Clients over a specified period for admin
router.get("/admin/clients/period/:period", isAdmin, getAdminClientsOverPeriod);

// Agent dashboard stats
router.get("/agent/stats", isAgent, getAgentDashboardStats);

// Clients handled over a specified period for agent
router.get("/agent/clients/period/:period", isAgent, getAgentClientsOverPeriod);

module.exports = router;
