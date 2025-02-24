// controllers/agentController.js

const Agent = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken"); // Import the token generation utility

// Agent signup
const signupAgent = async (req, res) => {
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
    const existingAgent = await Agent.findOne({ email });
    if (existingAgent) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAgent = new Agent({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      status: "Not Active", // Default status
    });

    await newAgent.save();

    res.status(201).json({
      message: "Agent signup successful. Await admin approval.",
      agent: { firstName, lastName, email, username },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Agent login
const loginAgent = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const agent = await Agent.findOne({ email });
    if (!agent) {
      return res.status(400).json({ message: "Agent not found" });
    }

    if (!agent.verified) {
      return res.status(400).json({ message: "Account not verified by admin" });
    }

    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update status to "Active"
    agent.status = "Active";
    await agent.save();

    // Generate JWT token
    const token = generateToken(agent.role);

    res.status(200).json({
      message: "Login successful",
      token,
      agent: {
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        username: agent.username,
        status: agent.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Agent logout
const logoutAgent = async (req, res) => {
  try {
    const agentId = req.agentId; // Ensure this is set in middleware
    const agent = await Agent.findById(agentId);

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // Update status to "Not Active"
    agent.status = "Not Active";
    await agent.save();

    res
      .status(200)
      .json({ message: "Logout successful, status set to Not Active" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Manually update status
const updateAgentStatus = async (req, res) => {
  const { status } = req.body;

  if (!["Active", "Not Active", "Busy"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const agentId = req.agentId; // Ensure this is set in middleware
    const agent = await Agent.findById(agentId);

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    agent.status = status;
    await agent.save();

    res.status(200).json({
      message: `Status updated to ${status}`,
      agent: {
        id: agent._id,
        status: agent.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  signupAgent,
  loginAgent,
  logoutAgent,
  updateAgentStatus,
};
