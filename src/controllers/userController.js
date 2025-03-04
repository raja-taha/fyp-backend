const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// Signup Agent
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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAgent = new User({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      role: "agent",
      verified: false,
      status: "Not Active",
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

    if (user.role === "agent" && !user.verified) {
      return res.status(400).json({ message: "Account not verified by admin" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    user.status = "Active";
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
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
    // console.log(req);
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

// Approve Agent
const approveAgent = async (req, res) => {
  const { agentId } = req.params;

  try {
    const agent = await User.findById(agentId);
    if (!agent || agent.role !== "agent") {
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

// Promote Agent to Admin
const promoteAgent = async (req, res) => {
  const { agentId } = req.params;

  try {
    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(400).json({ message: "Agent not found" });
    }

    agent.role = "admin";
    await agent.save();

    res.status(200).json({ message: "Agent promoted to admin", agent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Demote Admin to Agent
const demoteAdmin = async (req, res) => {
  const { adminId } = req.params;

  try {
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }

    if (admin.role === "superadmin") {
      return res.status(400).json({ message: "Cannot demote superadmin" });
    }

    admin.role = "agent";
    await admin.save();

    res.status(200).json({ message: "Admin demoted to agent", admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update User Status
const updateUserStatus = async (req, res) => {
  const { userId } = req.params;
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

    res.status(200).json({ message: `Status updated to ${status}`, user });
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

module.exports = {
  signupAgent,
  loginUser,
  logoutUser,
  approveAgent,
  promoteAgent,
  demoteAdmin,
  updateUserStatus,
  createAdmin,
};
