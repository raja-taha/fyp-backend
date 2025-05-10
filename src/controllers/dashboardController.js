const User = require("../models/User");
const Chatbot = require("../models/Chatbot");
const Client = require("../models/Client");
const mongoose = require("mongoose");

// Get dashboard statistics for superadmin
const getSuperAdminDashboardStats = async (req, res) => {
  try {
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalChatbots = await Chatbot.countDocuments();
    const totalAgents = await User.countDocuments({ role: "agent" });
    const totalClients = await Client.countDocuments();

    res.status(200).json({
      totalAdmins,
      totalChatbots,
      totalAgents,
      totalClients,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get number of clients over a specified period
const getClientsOverPeriod = async (req, res) => {
  const { period } = req.params;
  let startDate;
  let groupFormat;

  switch (period) {
    case "day":
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      groupFormat = "%Y-%m-%d %H:00"; // Group by hour
      break;
    case "week":
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      groupFormat = "%Y-%m-%d"; // Group by day
      break;
    case "month":
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      groupFormat = "%Y-%m-%d"; // Group by day
      break;
    case "year":
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      groupFormat = "%Y-%m"; // Group by month
      break;
    default:
      return res.status(400).json({ message: "Invalid period specified" });
  }

  try {
    const clientStats = await Client.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({ data: clientStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get dashboard statistics for admin
const getAdminDashboardStats = async (req, res) => {
  try {
    const adminId = req.user.userId;

    // Count agents created by this admin
    const totalAgents = await User.countDocuments({
      role: "agent",
      createdBy: adminId,
    });

    // Find all agents created by this admin
    const agents = await User.find({
      role: "agent",
      createdBy: adminId,
    }).select("_id");

    const agentIds = agents.map((agent) => agent._id);

    // Find all chatbots created by this admin
    const chatbots = await Chatbot.find({
      createdBy: adminId,
    }).select("_id");

    const chatbotIds = chatbots.map((chatbot) => chatbot._id);

    // Count total chatbots
    const totalChatbots = chatbotIds.length;

    // Count clients assigned to the admin's agents OR using the admin's chatbots
    const totalClients = await Client.countDocuments({
      $or: [
        { assignedAgent: { $in: agentIds } },
        { chatbot: { $in: chatbotIds } },
      ],
    });

    res.status(200).json({
      totalAgents,
      totalClients,
      totalChatbots,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get admin's clients over a specified period (for graph)
const getAdminClientsOverPeriod = async (req, res) => {
  const { period } = req.params;
  const adminId = req.user.userId;
  let startDate;
  let groupFormat;

  switch (period) {
    case "day":
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      groupFormat = "%Y-%m-%d %H:00"; // Group by hour
      break;
    case "week":
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      groupFormat = "%Y-%m-%d"; // Group by day
      break;
    case "month":
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      groupFormat = "%Y-%m-%d"; // Group by day
      break;
    case "year":
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      groupFormat = "%Y-%m"; // Group by month
      break;
    default:
      return res.status(400).json({ message: "Invalid period specified" });
  }

  try {
    // Find all agents created by this admin
    const agents = await User.find({
      role: "agent",
      createdBy: adminId,
    }).select("_id");

    const agentIds = agents.map((agent) => agent._id);

    // Find all chatbots created by this admin
    const chatbots = await Chatbot.find({
      createdBy: adminId,
    }).select("_id");

    const chatbotIds = chatbots.map((chatbot) => chatbot._id);

    const clientStats = await Client.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          $or: [
            { assignedAgent: { $in: agentIds } },
            { chatbot: { $in: chatbotIds } },
          ],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({ data: clientStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get dashboard statistics for agent
const getAgentDashboardStats = async (req, res) => {
  try {
    const agentId = req.user.userId;

    // Get the agent's user record
    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // Count clients assigned to this agent
    const totalClientsHandled = await Client.countDocuments({
      assignedAgent: agentId,
    });

    res.status(200).json({
      totalClientsHandled,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get agent's clients handled over a specified period (for graph)
const getAgentClientsOverPeriod = async (req, res) => {
  const { period } = req.params;
  const agentId = req.user.userId;
  let startDate;
  let groupFormat;

  switch (period) {
    case "day":
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      groupFormat = "%Y-%m-%d %H:00"; // Group by hour
      break;
    case "week":
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      groupFormat = "%Y-%m-%d"; // Group by day
      break;
    case "month":
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      groupFormat = "%Y-%m-%d"; // Group by day
      break;
    case "year":
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      groupFormat = "%Y-%m"; // Group by month
      break;
    default:
      return res.status(400).json({ message: "Invalid period specified" });
  }

  try {
    // Count clients handled by the agent over time
    const clientStats = await Client.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          assignedAgent: new mongoose.Types.ObjectId(agentId),
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({ data: clientStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getSuperAdminDashboardStats,
  getClientsOverPeriod,
  getAdminDashboardStats,
  getAdminClientsOverPeriod,
  getAgentDashboardStats,
  getAgentClientsOverPeriod,
};
