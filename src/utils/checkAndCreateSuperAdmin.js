const Admin = require("../models/User");
const bcrypt = require("bcryptjs");

// Function to check if a superadmin exists, if not create one
const checkAndCreateSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await Admin.findOne({ role: "superadmin" });

    if (!existingSuperAdmin) {
      console.log("No superadmin found, creating default superadmin...");

      const hashedPassword = await bcrypt.hash("superadmin123", 10);

      // Create a default superadmin
      const defaultSuperAdmin = new Admin({
        firstName: "Super",
        lastName: "Admin",
        email: "superadmin@domain.com",
        username: "superadmin",
        password: hashedPassword,
        role: "superadmin",
        verified: true,
      });

      await defaultSuperAdmin.save();
      console.log("Superadmin created successfully.");
    }
  } catch (error) {
    console.error("Error while checking/creating superadmin:", error);
  }
};

module.exports = checkAndCreateSuperAdmin;
