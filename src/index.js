const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const dotenv = require("dotenv");

dotenv.config();
connectDB();

const server = http.createServer(app);

// Vercel expects a function export, so we export the Express app
module.exports = app;

// WebSockets setup - Vercel does NOT support WebSockets, so deploy this elsewhere
if (process.env.NODE_ENV !== "production") {
  const io = socketIo(server, {
    cors: {
      origin: "*", // Allow requests from any domain
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected");

    socket.on("sendMessage", (data) => {
      io.emit("message", { text: data.text });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // Start server only in development or on a compatible hosting service
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
