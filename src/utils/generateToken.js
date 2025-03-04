const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role }, // Include role in the token
    process.env.JWT_SECRET,
    { expiresIn: "30d" } // Set token expiry
  );
};

module.exports = generateToken;
