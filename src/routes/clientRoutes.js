// routes/clientRoutes.js
const express = require("express");
const router = express.Router();
const {
  clientSignup,
  clientLogin,
  getAllClients,
} = require("../controllers/clientController");
const { isAdmin, protect } = require("../middlewares/authMiddleware");

// Client signup route
router.post("/signup", clientSignup);

// Client login route
router.post("/login", clientLogin);

// ** Protected Routes (Require Authentication) **
router.use(protect);

router.get("/getAllClients", isAdmin, getAllClients);

module.exports = router;
