const express = require("express");
const cors = require("cors");
const path = require("path");
const errorHandler = require("./middlewares/errorHandler");
const userRoutes = require("./routes/userRoutes");
const clientRoutes = require("./routes/clientRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");

const app = express();

// Middleware setup
app.use(express.json());

app.use(
  cors({
    origin: "*", // Change this to your frontend domain
    methods: ["GET", "POST", "PUT", "DELETE"],
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

// API routes
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/chatbots", chatbotRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
