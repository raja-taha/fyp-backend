const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const app = require("./app");
const connectDB = require("./config/db");
const { initializeSocket } = require("./socket"); // Import socket setup

dotenv.config();
connectDB();

const server = http.createServer(app);
initializeSocket(server); // Initialize Socket.io

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
