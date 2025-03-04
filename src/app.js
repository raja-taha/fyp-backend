const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
// const morgan = require("morgan");
const errorHandler = require("./middlewares/errorHandler");
const userRoutes = require("./routes/userRoutes");
const clientRoutes = require("./routes/clientRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
// const logger = require("./config/logger");

dotenv.config();
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

// Morgan logging with Winston
// app.use(
//   morgan("combined", {
//     stream: {
//       write: (message) => logger.info(message.trim()), // Write logs to winston
//     },
//   })
// );

app.use("/src/public", express.static(path.join(__dirname, "src/public")));

app.get("/", (req, res) => {
  const htmlResponse = `
    <html>
      <head>
        <title>NodeJs and Express on Vercel</title>
      </head>
      <body>
        <h1>I am a backend project on Vercel</h1>
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
