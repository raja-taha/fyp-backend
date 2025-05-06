const socketIo = require("socket.io");
const Message = require("./models/Message");
const User = require("./models/User");
const Client = require("./models/Client");

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", ({ userId, language }) => {
      socket.join(userId);
      // Store user's language preference in socket data
      socket.data.language = language || "en";
    });

    socket.on("sendMessage", async (messageData) => {
      try {
        // Extract message data
        const { clientId, agentId, sender, text, timestamp, isVoiceMessage } =
          messageData;

        // Forward the message to the message controller via API
        // This will handle saving and translation

        const response = await fetch(
          `${process.env.VITE_PUBLIC_BACKEND_URL || ""}/api/chats/message`,
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

        // No need to emit messages here as the controller will do that
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    socket.on("disconnect", () => {
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

module.exports = { initializeSocket, getIo };
