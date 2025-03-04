// middleware/authMiddleware.js

const jwt = require("jsonwebtoken");

// Protect route for verifying token and role
const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Expecting `Bearer token`

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Add decoded token to request for access control

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

// Check if the user is an admin
const isAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Expecting `Bearer token`

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user to the request object
    req.user = decoded;

    // Check if the user has the admin or superadmin role
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware to check if the user is a superadmin
const isSuperAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Expecting `Bearer token`

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user to the request object
    req.user = decoded;

    // Check if the user is a superadmin
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Not authorized as superadmin" });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const isAgent = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Expecting `Bearer token`

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user to the request object
    req.user = decoded;

    // Check if the user has the admin or superadmin role
    if (req.user.role !== "agent") {
      return res.status(403).json({ message: "Not authorized as agent" });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { protect, isAdmin, isSuperAdmin, isAgent };
