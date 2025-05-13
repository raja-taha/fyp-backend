const socketIo = require("socket.io");
const Message = require("./models/Message");
const User = require("./models/User");
const Client = require("./models/Client");

let io;
// Track active users and their socket IDs for more efficient communication
const activeUsers = new Map(); // userId -> socketId
// Track first-time client messages to avoid duplicate notifications
const firstTimeMessages = new Set(); // Set of clientId-agentId pairs

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    // Add compression for more efficient data transfer
    perMessageDeflate: true,
    // Increase performance with binary transport when possible
    transports: ["websocket", "polling"],
    // Ping timeout optimization
    pingTimeout: 60000,
    // Reduce unnecessary polling
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", ({ userId, language }) => {
      if (!userId) return;

      // Store user in room and track active status
      socket.join(userId);
      activeUsers.set(userId, socket.id);

      // Store user's language preference in socket data
      socket.data.language = language || "en";
      socket.data.userId = userId;

      console.log(`User ${userId} joined with language ${language || "en"}`);
    });

    socket.on("typing", ({ recipientId, isTyping }) => {
      if (recipientId) {
        // Only emit to specific recipient for better efficiency
        socket.to(recipientId).emit("userTyping", {
          isTyping,
          userId: socket.data.userId,
        });
      }
    });

    socket.on("sendMessage", async (messageData) => {
      try {
        // Extract message data
        const { clientId, agentId, sender, text, timestamp, isVoiceMessage } =
          messageData;

        if (!clientId || !agentId) return;

        // Check if this is a first-time message from client to agent
        if (sender === "client") {
          const chatPairKey = `${clientId}-${agentId}`;

          // Check if this client has messaged this agent before
          const existingMessages = await Message.findOne({
            clientId,
            agentId,
            "messages.0": { $exists: true }, // Check if any messages exist
          });

          // If no existing messages and this is the first time we're seeing this pair
          if (!existingMessages && !firstTimeMessages.has(chatPairKey)) {
            firstTimeMessages.add(chatPairKey);

            // Find client details
            const client = await Client.findById(clientId);

            if (client) {
              // Send new client notification to agent
              io.to(agentId).emit("newClientNotification", {
                clientId,
                agentId,
                clientName: `${client.firstName} ${client.lastName}`,
                message: text,
                timestamp: timestamp || new Date(),
              });
            }
          }
        }

        const PROTOCOL = process.env.PROTOCOL || "http";
        const HOSTNAME = process.env.HOSTNAME || "localhost";
        const PORT = process.env.PORT || 6000;

        // Forward the message to the message controller via API
        const response = await fetch(
          `${
            `${PROTOCOL}://${HOSTNAME}:${PORT}` || "http://localhost:6000"
          }/api/chats/message`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              clientId,
              agentId,
              sender,
              text,
              timestamp,
              isVoiceMessage,
            }),
          }
        );

        if (!response.ok) {
          console.error(
            "Error sending message via API:",
            await response.text()
          );
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    socket.on("disconnect", () => {
      // Clean up user tracking on disconnect
      if (socket.data.userId) {
        activeUsers.delete(socket.data.userId);
      }
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// Utility function to send message directly to a specific user if they're online
const sendToUser = (userId, eventName, data) => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  // Check if user is active before sending
  if (activeUsers.has(userId)) {
    io.to(userId).emit(eventName, data);
    return true;
  }
  return false;
};

module.exports = { initializeSocket, getIo, sendToUser };
