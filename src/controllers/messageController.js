// controllers/messageController.js
const Message = require("../models/Message");
const Agent = require("../models/Agent");

// Automatically assign an available agent and send the message
const assignAndSendMessage = async (req, res) => {
  const { senderId, content } = req.body;

  if (!senderId || !content) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Find an available agent
    const availableAgent = await Agent.findOne({ status: "Active" });
    if (!availableAgent) {
      return res
        .status(404)
        .json({ message: "No available agents at the moment" });
    }

    // Create the message
    const message = new Message({
      senderId,
      receiverId: availableAgent._id,
      content,
    });

    // Mark the agent as busy
    availableAgent.status = "Busy";
    await availableAgent.save();
    await message.save();

    res.status(201).json({
      message: "Message sent successfully",
      assignedAgent: {
        id: availableAgent._id,
        name: `${availableAgent.firstName} ${availableAgent.lastName}`,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
