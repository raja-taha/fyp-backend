const Message = require("../models/Message");
const { getIo } = require("../socket"); // Import the socket instance

// Send message
const sendMessage = async (req, res) => {
  try {
    const { clientId, agentId, sender, text, timestamp } = req.body;

    if (!clientId || !agentId || !sender || !text) {
      return res.status(400).json({ error: "All fields are required" });
    }

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
    });

    await chatSession.save();

    // Get Socket.io instance and emit messages
    const io = getIo();
    io.to(agentId.toString()).emit("newMessage", {
      clientId,
      agentId,
      sender,
      text,
      timestamp: messageTimestamp,
    });

    io.to(clientId.toString()).emit("newMessage", {
      clientId,
      agentId,
      sender,
      text,
      timestamp: messageTimestamp,
    });

    res.status(201).json({ message: "Message sent successfully", chatSession });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all messages between a client and agent
const getMessages = async (req, res) => {
  try {
    const { clientId, agentId } = req.query;

    if (!clientId || !agentId) {
      return res
        .status(400)
        .json({ error: "Client ID and Agent ID are required" });
    }

    const chatSession = await Message.findOne({ clientId, agentId });

    if (!chatSession) {
      return res.status(404).json({ message: "No messages found" });
    }

    res.status(200).json(chatSession.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { sendMessage, getMessages };
