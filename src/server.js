const http = require("http");
const socketIo = require("socket.io");
const app = require("./app");
const configureEnvironment = require("./config/env");
const connectDB = require("./config/db");

// Load environment variables
configureEnvironment();

// Connect to the database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow requests from any domain
    methods: ["GET", "POST"],
  },
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("joinChat", ({ chatbotId }) => {
    socket.join(chatbotId);
    console.log(`User joined chatbot room: ${chatbotId}`);
  });

  socket.on("sendMessage", ({ chatbotId, text }) => {
    io.to(chatbotId).emit("message", { text });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export `io` so it can be used in other files
module.exports = { server, io };
