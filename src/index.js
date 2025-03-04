const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const dotenv = require("dotenv");

dotenv.config();

connectDB();

const server = http.createServer(app);

// Start server only in development or on a compatible hosting service
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
