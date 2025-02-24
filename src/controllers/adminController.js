const Admin = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken"); // JWT generation

// Admin login
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const admin = await Admin.findOne({ email }); // Change Agent to Admin
    if (!admin || admin.role !== "superadmin") {
      return res
        .status(400)
        .json({ message: "Superadmin not found or invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    admin.status = "Active"; // Set status to Active on login
    await admin.save();

    const token = generateToken(admin.role);

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        username: admin.username,
        status: admin.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin logout
const logoutAdmin = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required for logout" });
  }

  try {
    const admin = await Agent.findOne({ email });
    if (!admin || admin.role !== "superadmin") {
      return res.status(400).json({ message: "Superadmin not found" });
    }

    admin.status = "Not Active"; // Set status to Not Active on logout
    await admin.save();

    res.status(200).json({ message: "Logout successful", admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve agent (only accessible by admin)
const approveAgent = async (req, res) => {
  const { agentId } = req.params;

  try {
    const agent = await Admin.findById(agentId);
    if (!agent) {
      return res.status(400).json({ message: "Agent not found" });
    }

    agent.verified = true;
    await agent.save();

    res.status(200).json({ message: "Agent approved successfully", agent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Promote agent to admin (only accessible by superadmin)
const promoteAgent = async (req, res) => {
  const { agentId } = req.params;

  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(400).json({ message: "Agent not found" });
    }

    agent.role = "admin"; // Promote agent to admin
    await agent.save();

    res.status(200).json({ message: "Agent promoted to admin", agent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Demote admin to agent (only accessible by superadmin)
const demoteAdmin = async (req, res) => {
  const { adminId } = req.params;

  try {
    const admin = await Agent.findById(adminId);
    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }

    if (admin.role === "superadmin") {
      return res.status(400).json({ message: "Cannot demote superadmin" });
    }

    admin.role = "agent"; // Demote admin to agent
    await admin.save();

    res.status(200).json({ message: "Admin demoted to agent", admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new admin (only accessible by superadmin)
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
    const existingAdmin = await Agent.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Agent({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      role: "admin", // Set role as admin
      verified: true,
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Admin created successfully",
      admin: { firstName, lastName, email, username },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update agent status
const updateAgentStatus = async (req, res) => {
  const { agentId } = req.params;
  const { status } = req.body;

  if (!["Active", "Not Active", "Busy"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    agent.status = status;
    await agent.save();

    res.status(200).json({
      message: `Agent status updated to ${status}`,
      agent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  loginAdmin,
  logoutAdmin,
  approveAgent,
  promoteAgent,
  createAdmin,
  demoteAdmin,
  updateAgentStatus,
};
