// controllers/clientController.js
const Client = require("../models/Client");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken"); // JWT generation

// Client signup
const clientSignup = async (req, res) => {
  const { name, email, password, confirmPassword, phone } = req.body;

  // Validation checks
  if (!name || !email || !password || !confirmPassword || !phone) {
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

    // Create new client
    const newClient = new Client({
      name,
      email,
      password: hashedPassword,
      phone,
    });

    await newClient.save();

    const token = generateToken(newClient._id);

    res.status(201).json({
      message: "Client created successfully",
      token,
      client: { name, email, phone },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Client login
const clientLogin = async (req, res) => {
  const { email, password, language } = req.body;

  // Validation checks
  if (!email || !password || !language) {
    return res
      .status(400)
      .json({ message: "Email, password, and language are required" });
  }

  try {
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(400).json({ message: "Client not found" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateToken(client._id);

    // Update client's language if provided
    if (language) {
      client.language = language;
      await client.save();
    }

    res.status(200).json({
      message: "Login successful",
      token,
      client: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        language: client.language,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { clientSignup, clientLogin };
