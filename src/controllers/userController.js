const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

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
      return res.status(400).json({ message: "Account not verified by superadmin" });
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
  const { firstName, lastName, email, username, password, confirmPassword } = req.body;
  if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or username already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new User({
      firstName, lastName, email, username, password: hashedPassword,
      role: "admin", verified: false, status: "Not Active"
    });
    await newAdmin.save();
    res.status(201).json({ message: "Admin created successfully. Awaiting verification." });
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

module.exports = {
  createAgent,
  loginUser,
  logoutUser,
  updateUserStatus,
  getAgents,
  createAdmin,
  verifyAdmin,
  getAdmins
};
