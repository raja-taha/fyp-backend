// controllers/clientController.js
const Client = require("../models/Client");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken"); // JWT generation
const mongoose = require("mongoose");

// Client signup
const clientSignup = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    phone,
    chatbotId,
    language,
  } = req.body;

  // Validation checks
  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !confirmPassword ||
    !phone ||
    !chatbotId
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new client with language
    const newClient = new Client({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      chatbot: chatbotId,
      language: language || "en", // Use provided language or default to english ISO code
    });

    await newClient.save();

    const token = generateToken(newClient._id);

    res.status(201).json({
      message: "Client created successfully",
      token,
      client: {
        id: newClient._id,
        firstName,
        lastName,
        email,
        phone,
        language: newClient.language,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Client Login & Automatic Agent Assignment
const clientLogin = async (req, res) => {
  try {
    const { email, password, language } = req.body;

    // Find client by email and populate the chatbot field to access createdBy
    const client = await Client.findOne({ email })
      .populate({ path: "assignedAgent", select: "username" })
      .populate({ path: "chatbot", select: "createdBy" });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Use the createdBy field from the populated chatbot as chatbotOwnerId
    const chatbotOwnerId = client.chatbot.createdBy;

    // Verify password
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update language if provided
    if (language && language !== client.language) {
      client.language = language;
      await client.save();
    }

    // If client has no assigned agent, find one with the least clients
    if (!client.assignedAgent) {
      const agents = await User.find({
        role: "agent",
        createdBy: chatbotOwnerId,
      })
        .sort({ clientsHandled: 1 }) // Sort by least clients
        .limit(2); // Get top 2 agents in case of tie

      if (agents.length === 0) {
        return res.status(400).json({ message: "No available agents" });
      }

      // Select randomly if multiple agents have the same client count
      const assignedAgent =
        agents.length > 1
          ? agents[Math.floor(Math.random() * agents.length)]
          : agents[0];

      // Assign the agent to the client
      client.assignedAgent = assignedAgent._id;
      await client.save();

      // Increment agent's client count
      assignedAgent.clientsHandled += 1;
      await assignedAgent.save();
    }

    // Generate JWT token
    const token = generateToken(client);

    res.json({
      message: "Login successful",
      client: {
        id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        language: client.language,
        assignedAgent: client.assignedAgent
          ? {
              id: client.assignedAgent._id,
              username: client.assignedAgent.username,
            }
          : null,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get all clients handled by agents under the admin
const getAllClients = async (req, res) => {
  try {
    const adminId = req.user.userId; // Assuming admin ID is retrieved from authenticated user

    // ✅ Fetch agents created by this admin
    const agents = await User.find({ createdBy: adminId, role: "agent" });

    // If no agents found under this admin
    if (!agents.length) {
      return res
        .status(404)
        .json({ message: "No agents found under this admin" });
    }

    const agentIds = agents.map((agent) => agent._id); // Extract agent IDs

    // ✅ Fetch clients assigned to these agents & include agent's username
    const clients = await Client.find({ assignedAgent: { $in: agentIds } })
      .populate("assignedAgent", "username") // Fetch assigned agent's username only
      .select("firstName lastName email phone language assignedAgent");

    res.status(200).json({ totalClients: clients.length, clients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getClients = async (req, res) => {
  try {
    const { agentId } = req.params;

    // First get all clients for this agent
    const clients = await Client.find({ assignedAgent: agentId }).select(
      "_id firstName lastName email phone language"
    );

    // Get the message collections for these clients
    const Message = require("../models/Message");
    const clientIds = clients.map((client) => client._id);

    // Find the most recent message for each client
    const messageData = await Message.aggregate([
      {
        $match: {
          clientId: { $in: clientIds },
          agentId: new mongoose.Types.ObjectId(agentId),
        },
      },
      { $unwind: "$messages" },
      {
        $sort: { "messages.timestamp": -1 },
      },
      {
        $group: {
          _id: "$clientId",
          lastMessageTime: { $first: "$messages.timestamp" },
        },
      },
    ]);

    // Create a map of client IDs to last message times
    const lastMessageMap = {};
    messageData.forEach((item) => {
      lastMessageMap[item._id.toString()] = item.lastMessageTime;
    });

    // Add the last message time to each client
    const clientsWithLastMessage = clients.map((client) => {
      const clientObj = client.toObject();
      clientObj.lastMessageTime = lastMessageMap[client._id.toString()] || null;
      return clientObj;
    });

    res.status(200).json(clientsWithLastMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update Client Language
const updateClientLanguage = async (req, res) => {
  try {
    const { clientId, language } = req.body;

    if (!clientId || !language) {
      return res
        .status(400)
        .json({ message: "Client ID and language are required" });
    }

    // Import languages list
    const { byCode } = require("../utils/languages");

    // Validate if the language code exists in our supported languages
    if (!byCode[language]) {
      return res.status(400).json({
        message: "Invalid language code",
        supportedLanguages: byCode,
      });
    }

    // Find and update the client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    client.language = language;
    await client.save();

    res.status(200).json({
      message: `Language updated to ${byCode[language]} (${language})`,
      client: {
        id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        language: client.language,
        assignedAgent: client.assignedAgent,
      },
    });
  } catch (error) {
    console.error("Error updating client language:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  clientSignup,
  clientLogin,
  getAllClients,
  getClients,
  updateClientLanguage,
};
