const socketIo = require("socket.io");
const Message = require("./models/Message");

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

    socket.on("joinRoom", ({ userId }) => {
      socket.join(userId);
    });

    socket.on("sendMessage", async (messageData) => {
      console.log("Message received:", messageData);

      try {
        // Save message to database
        const { clientId, agentId, sender, text, timestamp, isVoiceMessage } =
          messageData;

        let chatSession = await Message.findOne({ clientId, agentId });
        if (!chatSession) {
          chatSession = new Message({ clientId, agentId, messages: [] });
        }

        // Use the provided timestamp if available, otherwise use current time
        const messageTimestamp = timestamp ? new Date(timestamp) : new Date();

        chatSession.messages.push({
          sender,
          text,
          timestamp: messageTimestamp,
          isVoiceMessage: isVoiceMessage || false,
        });

        await chatSession.save();

        // Forward the message to both client and agent rooms
        io.to(agentId.toString()).emit("newMessage", messageData);
        io.to(clientId.toString()).emit("newMessage", messageData);
      } catch (error) {
        console.error("Error saving message:", error);
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
