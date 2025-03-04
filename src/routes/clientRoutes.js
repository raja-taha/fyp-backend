// routes/clientRoutes.js
const express = require("express");
const router = express.Router();
const {
  clientSignup,
  clientLogin,
} = require("../controllers/clientController");

// Client signup route
router.post("/signup", clientSignup);

// Client login route
router.post("/login", clientLogin);

module.exports = router;
