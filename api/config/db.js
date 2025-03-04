const mongoose = require("mongoose");
const checkAndCreateSuperAdmin = require("../utils/checkAndCreateSuperAdmin");

/**
 * Connects to the MongoDB database using Mongoose.
 * Logs a message on successful connection or an error on failure.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    // Check if superadmin exists
    checkAndCreateSuperAdmin();
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
