const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const Client = require("../models/Client");
const Message = require("../models/Message");

// Create Agent (Admin only)
const createAgent = async (req, res) => {
  const { firstName, lastName, email, username, password } = req.body;

  if (!firstName || !lastName || !email || !username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already in use"
            : "Username already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAgent = new User({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      role: "agent",
      verified: true, // Auto-verified since created by admin
      status: "Not Active",
      createdBy: req.user.userId, // Store the admin who created this agent
    });

    await newAgent.save();

    res.status(201).json({
      message: "Agent created successfully",
      agent: {
        id: newAgent._id,
        firstName,
        lastName,
        email,
        username,
        status: newAgent.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login User (Admin or Agent)
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.role === "admin" && !user.verified) {
      return res
        .status(400)
        .json({ message: "Account not verified by superadmin" });
    }

    if (user.role === "agent" && !user.verified) {
      return res.status(400).json({ message: "Account not verified by admin" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    user.status = "Active";
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        status: user.status,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout User (Admin or Agent)
const logoutUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = "Not Active";
    await user.save();

    res
      .status(200)
      .json({ message: "Logout successful, status set to Not Active" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update User Status
const updateUserStatus = async (req, res) => {
  const userId = req.params.userId || req.user.userId;
  const { status } = req.body;

  if (!["Active", "Not Active", "Busy"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      message: `Status updated to ${status}`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        status: user.status,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAgents = async (req, res) => {
  try {
    const adminId = req.user.userId; // Get the logged-in admin's ID

    const agents = await User.find({
      role: "agent",
      createdBy: adminId,
    }).select(
      "-password" // Exclude password for security
    );

    res.status(200).json({
      message: "Agents retrieved successfully",
      agents,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const createAdmin = async (req, res) => {
  const { firstName, lastName, email, username, password, confirmPassword } =
    req.body;
  if (
    !firstName ||
    !lastName ||
    !email ||
    !username ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or username already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new User({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      role: "admin",
      verified: false,
      status: "Not Active",
    });
    await newAdmin.save();
    res
      .status(201)
      .json({ message: "Admin created successfully. Awaiting verification." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const verifyAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin not found" });
    }
    admin.verified = true;
    await admin.save();
    res.status(200).json({ message: "Admin verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select(
      "firstName lastName email username verified"
    );

    res.status(200).json({ admins });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.userId; // Logged-in user's ID
    const userRole = req.user.role; // Logged-in user's role

    // ✅ Find the agent
    const agent = await User.findOne({ _id: agentId, role: "agent" });
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // ✅ Check permissions (Admin can delete their own agents, Agent can delete themselves)
    if (userRole === "admin" && agent.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can only delete your own agents" });
    }
    if (userRole === "agent" && agent._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Agents can only delete themselves" });
    }

    // ✅ Find clients assigned to this agent
    const clients = await Client.find({ assignedAgent: agent._id });

    if (clients.length > 0) {
      // ✅ Find other available agents (least clients first)
      const availableAgents = await User.find({
        role: "agent",
        _id: { $ne: agent._id },
      })
        .sort({ clientsHandled: 1 })
        .limit(2);

      if (availableAgents.length === 0) {
        return res.status(400).json({
          message:
            "Cannot delete agent as no other agents are available to reassign clients",
        });
      }

      // ✅ Assign each client to a new agent
      const newAgent =
        availableAgents.length > 1
          ? availableAgents[Math.floor(Math.random() * availableAgents.length)]
          : availableAgents[0];

      await Client.updateMany(
        { assignedAgent: agent._id },
        { assignedAgent: newAgent._id }
      );

      const messages = await Message.find({ agentId: agent._id });

      if (messages.length > 0) {
        // ✅ Delete messages related to the agent
        await Message.updateMany(
          { agentId: agent._id },
          { agentId: newAgent._id }
        );
      }

      // ✅ Update new agent's client count
      newAgent.clientsHandled += clients.length;
      await newAgent.save();
    }

    // ✅ Delete the agent
    await User.findByIdAndDelete(agent._id);

    res.json({ message: "Agent deleted successfully and clients reassigned" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Admin and their team of agents
const getAdminTeam = async (req, res) => {
  try {
    const adminId = req.user.userId; // Get the logged-in admin's ID

    // Get admin's information
    const admin = await User.findById(adminId).select(
      "firstName lastName email username status language role createdAt"
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Get all agents created by this admin
    const agents = await User.find({
      role: "agent",
      createdBy: adminId,
    }).select(
      "firstName lastName email username status language clientsHandled createdAt"
    );

    // Count clients assigned to each agent
    const agentsWithClientCounts = await Promise.all(
      agents.map(async (agent) => {
        const clientCount = await Client.countDocuments({
          assignedAgent: agent._id,
        });
        return {
          ...agent.toObject(),
          clientCount,
        };
      })
    );

    res.status(200).json({
      admin,
      team: agentsWithClientCounts,
      totalAgents: agents.length,
    });
  } catch (error) {
    console.error("Error fetching admin team:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Agent's admin and fellow agents (for agents to view their team)
const getAgentTeam = async (req, res) => {
  try {
    const agentId = req.user.userId; // Get the logged-in agent's ID

    // Get agent's information
    const agent = await User.findById(agentId).select(
      "firstName lastName email username status language role clientsHandled createdAt createdBy"
    );

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    if (!agent.createdBy) {
      return res
        .status(404)
        .json({ message: "No admin associated with this agent" });
    }

    // Get admin information
    const admin = await User.findById(agent.createdBy).select(
      "firstName lastName email username status language role createdAt"
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Get fellow agents created by the same admin (teammates)
    const fellowAgents = await User.find({
      role: "agent",
      createdBy: admin._id,
      _id: { $ne: agentId }, // Exclude the current agent
    }).select(
      "firstName lastName email username status language clientsHandled createdAt"
    );

    // Count clients assigned to each agent
    const fellowAgentsWithClientCounts = await Promise.all(
      fellowAgents.map(async (fellowAgent) => {
        const clientCount = await Client.countDocuments({
          assignedAgent: fellowAgent._id,
        });
        return {
          ...fellowAgent.toObject(),
          clientCount,
        };
      })
    );

    // Count clients assigned to the current agent
    const myClientCount = await Client.countDocuments({
      assignedAgent: agentId,
    });

    res.status(200).json({
      agent: {
        ...agent.toObject(),
        clientCount: myClientCount,
      },
      admin,
      teammates: fellowAgentsWithClientCounts,
      totalTeammates: fellowAgents.length,
    });
  } catch (error) {
    console.error("Error fetching agent team:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Agent Profile
const updateAgentProfile = async (req, res) => {
  try {
    const agentId = req.user.userId;
    const {
      firstName,
      lastName,
      email,
      username,
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // Find the agent
    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // Check if the agent is trying to update email or username
    if (email && email !== agent.email) {
      const existingEmail = await User.findOne({
        email,
        _id: { $ne: agentId },
      });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      agent.email = email;
    }

    if (username && username !== agent.username) {
      const existingUsername = await User.findOne({
        username,
        _id: { $ne: agentId },
      });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already in use" });
      }
      agent.username = username;
    }

    // Update basic info if provided
    if (firstName) agent.firstName = firstName;
    if (lastName) agent.lastName = lastName;

    // Handle password change if requested
    if (currentPassword && newPassword && confirmPassword) {
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, agent.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Check if new passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New passwords do not match" });
      }

      // Hash and set new password
      agent.password = await bcrypt.hash(newPassword, 10);
    }

    // Save updated agent
    await agent.save();

    // Return updated agent info (excluding password)
    res.status(200).json({
      message: "Profile updated successfully",
      agent: {
        id: agent._id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        username: agent.username,
        status: agent.status,
        clientsHandled: agent.clientsHandled,
      },
    });
  } catch (error) {
    console.error("Error updating agent profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Admin Profile
const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const {
      firstName,
      lastName,
      email,
      username,
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // Find the admin
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if the admin is trying to update email or username
    if (email && email !== admin.email) {
      const existingEmail = await User.findOne({
        email,
        _id: { $ne: adminId },
      });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      admin.email = email;
    }

    if (username && username !== admin.username) {
      const existingUsername = await User.findOne({
        username,
        _id: { $ne: adminId },
      });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already in use" });
      }
      admin.username = username;
    }

    // Update basic info if provided
    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;

    // Handle password change if requested
    if (currentPassword && newPassword && confirmPassword) {
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Check if new passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New passwords do not match" });
      }

      // Hash and set new password
      admin.password = await bcrypt.hash(newPassword, 10);
    }

    // Save updated admin
    await admin.save();

    // Return updated admin info (excluding password)
    res.status(200).json({
      message: "Profile updated successfully",
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        username: admin.username,
        status: admin.status,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update User Language
const updateLanguage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { language } = req.body;

    // Import languages list
    const { byCode } = require("../utils/languages");

    // Validate if the language code exists in our supported languages
    if (!language || !byCode[language]) {
      return res.status(400).json({
        message: "Invalid language code",
        supportedLanguages: byCode,
      });
    }

    // Find and update the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.language = language;
    await user.save();

    res.status(200).json({
      message: `Language updated to ${byCode[language]} (${language})`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        status: user.status,
        language: user.language,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error updating language:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Set User Status (simplified version focused on Active/Not Active)
const setUserStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.body;

    // Validate status value (only allowing Active or Not Active)
    if (!status || !["Active", "Not Active"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Status must be 'Active' or 'Not Active'",
      });
    }

    // Find and update the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      message: `Status updated to ${status}`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        status: user.status,
        language: user.language,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update SuperAdmin Profile
const updateSuperAdminProfile = async (req, res) => {
  try {
    const superAdminId = req.user.userId;
    const {
      firstName,
      lastName,
      email,
      username,
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // Find the superadmin
    const superAdmin = await User.findById(superAdminId);
    if (!superAdmin) {
      return res.status(404).json({ message: "SuperAdmin not found" });
    }

    // Verify the user is actually a superadmin
    if (superAdmin.role !== "superadmin") {
      return res.status(403).json({
        message:
          "Unauthorized. Only superadmins can update their profile through this endpoint",
      });
    }

    // Check if the superadmin is trying to update email or username
    if (email && email !== superAdmin.email) {
      const existingEmail = await User.findOne({
        email,
        _id: { $ne: superAdminId },
      });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      superAdmin.email = email;
    }

    if (username && username !== superAdmin.username) {
      const existingUsername = await User.findOne({
        username,
        _id: { $ne: superAdminId },
      });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already in use" });
      }
      superAdmin.username = username;
    }

    // Update basic info if provided
    if (firstName) superAdmin.firstName = firstName;
    if (lastName) superAdmin.lastName = lastName;

    // Handle password change if requested
    if (currentPassword && newPassword && confirmPassword) {
      // Verify current password
      const isMatch = await bcrypt.compare(
        currentPassword,
        superAdmin.password
      );
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Check if new passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New passwords do not match" });
      }

      // Hash and set new password
      superAdmin.password = await bcrypt.hash(newPassword, 10);
    }

    // Save updated superadmin
    await superAdmin.save();

    // Return updated superadmin info (excluding password)
    res.status(200).json({
      message: "Profile updated successfully",
      superAdmin: {
        id: superAdmin._id,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        email: superAdmin.email,
        username: superAdmin.username,
        status: superAdmin.status,
        language: superAdmin.language,
        role: superAdmin.role,
      },
    });
  } catch (error) {
    console.error("Error updating superadmin profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createAgent,
  loginUser,
  logoutUser,
  updateUserStatus,
  getAgents,
  createAdmin,
  verifyAdmin,
  getAdmins,
  deleteAgent,
  getAdminTeam,
  getAgentTeam,
  updateAgentProfile,
  updateAdminProfile,
  updateLanguage,
  setUserStatus,
  updateSuperAdminProfile,
};
