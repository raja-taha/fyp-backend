const express = require("express");
const cors = require("cors");
const path = require("path");
const errorHandler = require("./middlewares/errorHandler");
const userRoutes = require("./routes/userRoutes");
const clientRoutes = require("./routes/clientRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const messageRoutes = require("./routes/messageRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// Middleware setup
app.use(express.json());

app.use(
  cors({
    origin: "*", // Change this to your frontend domain
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  const htmlResponse = `
    <html>
      <head>
        <title>NodeJs and Express on Vercel</title>
      </head>
      <body>
        <p>I am a backend project on Vercel</p>
      </body>
    </html>
  `;
  res.send(htmlResponse);
});

const PROTOCOL = process.env.PROTOCOL || "http";
const HOSTNAME = process.env.HOSTNAME || "localhost";
const PORT = process.env.PORT || 5000;

app.get("/config.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(
    `window.APP_CONFIG = { BACKEND_URL: "${
      `${PROTOCOL}://${HOSTNAME}:${PORT}` || "http://localhost:6000"
    }" };`
  );
});

// Language API route
app.get("/api/languages", (req, res) => {
  try {
    console.log("Languages API endpoint called");
    const languages = require("./utils/languages");
    console.log("Languages loaded, keys:", Object.keys(languages));
    res.json(languages);
  } catch (error) {
    console.error("Error in /api/languages endpoint:", error);
    res.status(500).json({ error: "Failed to load languages" });
  }
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/chatbots", chatbotRoutes);
app.use("/api/chats", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
