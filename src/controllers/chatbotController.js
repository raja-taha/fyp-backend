const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Chatbot = require("../models/Chatbot");

const createChatbotWithAdmin = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    username,
    password,
    confirmPassword,
    chatbotName,
    description,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !username ||
    !password ||
    !confirmPassword ||
    !chatbotName
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already in use"
            : "Username already in use",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new User({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      role: "admin",
      verified: true,
      status: "Not Active",
      createdBy: req.user.userId, // Superadmin who created this admin
    });

    await newAdmin.save();

    // Create chatbot associated with admin
    const newChatbot = new Chatbot({
      name: chatbotName,
      createdBy: newAdmin._id,
      description,
      active: true,
    });

    await newChatbot.save();

    res.status(201).json({
      message: "Admin and Chatbot created successfully",
      admin: {
        id: newAdmin._id,
        firstName,
        lastName,
        email,
        username,
        status: newAdmin.status,
        role: newAdmin.role,
      },
      chatbot: {
        id: newChatbot._id,
        name: newChatbot.name,
        description: newChatbot.description,
        active: newChatbot.active,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all chatbots
const getChatbots = async (req, res) => {
  try {
    const chatbots = await Chatbot.find().populate(
      "createdBy",
      "firstName lastName email username"
    );

    res.status(200).json(chatbots);
  } catch (error) {
    console.error("Error fetching chatbots:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add this to chatbotController.js

const getChatbotWidget = async (req, res) => {
  try {
    const chatbotId = req.query.chatbot_id;

    if (!chatbotId) {
      return res.status(400).json({ details: "Chatbot ID is required" });
    }

    // Find the chatbot in the database
    const chatbot = await Chatbot.findById(chatbotId);

    if (!chatbot) {
      return res.status(404).json({ details: "Chatbot not found" });
    }

    // Simple widget JavaScript that loads the chatbot iframe
    const widgetJs = `
        function loadChatbot() {
          // Create container for the chatbot
          const container = document.createElement("div");
          container.style.position = "fixed";
          container.style.bottom = "0";
          container.style.right = "20px";
          container.style.zIndex = "99999";
          container.style.overflow = "hidden";
          container.style.display = "none";
          container.style.transition = "all 0.2s ease";
          document.body.appendChild(container);
  
          // Create iframe for the chatbot content
          const iframe = document.createElement("iframe");
          iframe.src = "${process.env.BASE_URL}/api/chatbots/view?chatbot_id=${chatbotId}";
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "none";
          iframe.style.borderRadius = "10px";
          container.appendChild(iframe);
  
          // Set container dimensions based on window size
          if (window.innerWidth > 768) {
            container.style.width = "400px";
            container.style.height = "600px";
          } else {
            container.style.width = "100%";
            container.style.height = "100%";
          }
  
          // Create toggle button
          const button = document.createElement("button");
          button.style.position = "fixed";
          button.style.bottom = "20px";
          button.style.right = "20px";
          button.style.width = "60px";
          button.style.height = "60px";
          button.style.borderRadius = "50%";
          button.style.backgroundColor = "#007bff";
          button.style.color = "white";
          button.style.border = "none";
          button.style.fontSize = "24px";
          button.style.cursor = "pointer";
          button.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
          button.style.zIndex = "99999";
          button.textContent = "💬";
          document.body.appendChild(button);
  
          // Toggle chatbot visibility
          button.onclick = function() {
            if (container.style.display === "none") {
              container.style.display = "block";
              button.textContent = "✕";
            } else {
              container.style.display = "none";
              button.textContent = "💬";
            }
          };
  
          // Listen for close message from iframe
          window.addEventListener("message", function(event) {
            if (event.data === "close") {
              container.style.display = "none";
              button.textContent = "💬";
            }
          });
        }
  
        // Initialize the chatbot
        loadChatbot();
      `;

    res.setHeader("Content-Type", "text/javascript");
    res.send(widgetJs);
  } catch (error) {
    console.error("Error serving widget:", error);
    res.status(500).json({ details: "Something went wrong" });
  }
};

const getChatbotScript = async (req, res) => {
  try {
    const adminId = req.user.userId;

    if (!adminId) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const chatbot = await Chatbot.findOne({ createdBy: adminId });

    if (!chatbot) {
      return res.status(404).json({ error: "No chatbot found for this admin" });
    }

    const scriptCode = `
      <script>
        window.chatbotid="${chatbot._id}";
        var s = document.createElement("script");
        s.type = "text/javascript";
        s.async = true;
        s.src = "${process.env.BASE_URL}/api/chatbots/widget?chatbot_id=${chatbot._id}";
        document.head.appendChild(s);
      </script>`;

    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(scriptCode);
  } catch (error) {
    console.error("Error serving script:", error);
    res.status(500).json({ error: "Error generating script" });
  }
};

// Add this to view the actual chatbot interface
const viewChatbot = async (req, res) => {
  try {
    const chatbotId = req.query.chatbot_id;

    if (!chatbotId) {
      return res.status(400).json({ details: "Chatbot ID is required" });
    }

    // Find the chatbot in the database
    const chatbot = await Chatbot.findById(chatbotId);

    if (!chatbot) {
      return res.status(404).json({ details: "Chatbot not found" });
    }

    // Simple chatbot HTML
    const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
            <title>Chatbot</title>
            <style>
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              
              body {
                font-family: Arial, sans-serif;
                background-color: #f9f9f9;
                height: 100vh;
                display: flex;
                flex-direction: column;
              }
              
              .chat-header {
                background-color: #007bff;
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top-left-radius: 10px;
                border-top-right-radius: 10px;
              }
              
              .chat-header h3 {
                margin: 0;
                font-size: 16px;
              }
              
              .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
              }
              
              .chat-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
                background-color: #fff;
              }
              
              .message {
                padding: 10px 15px;
                border-radius: 18px;
                max-width: 75%;
                word-wrap: break-word;
              }
              
              .bot-message {
                background-color: #f0f0f0;
                color: #333;
                align-self: flex-start;
              }
              
              .user-message {
                background-color: #007bff;
                color: white;
                align-self: flex-end;
              }
              
              .chat-input {
                display: flex;
                padding: 10px;
                background-color: #fff;
                border-top: 1px solid #e0e0e0;
              }
              
              .chat-input input {
                flex: 1;
                padding: 10px 15px;
                border: 1px solid #ddd;
                border-radius: 20px;
                outline: none;
              }
              
              .chat-input button {
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 10px 15px;
                margin-left: 10px;
                cursor: pointer;
              }
              
              .chat-footer {
                padding: 10px;
                text-align: center;
                font-size: 12px;
                color: #999;
                background-color: #fff;
                border-bottom-left-radius: 10px;
                border-bottom-right-radius: 10px;
              }
            </style>
          </head>
          <body>
            <div class="chat-header">
              <h3>${chatbot.name || "Chatbot"}</h3>
              <button class="close-btn" id="closeBtn">&times;</button>
            </div>
            
            <div class="chat-messages" id="chatMessages">
              <div class="message bot-message">
                Hello! How can I help you today?
              </div>
            </div>
            
            <form class="chat-input" id="messageForm">
              <input type="text" id="userInput" placeholder="Type your message here..." autocomplete="off">
              <button type="submit">Send</button>
            </form>
            
            <div class="chat-footer">
              Powered by Your Company
            </div>
            
            <script>
              // Get DOM elements
              const chatMessages = document.getElementById('chatMessages');
              const messageForm = document.getElementById('messageForm');
              const userInput = document.getElementById('userInput');
              const closeBtn = document.getElementById('closeBtn');
              
              // Handle message submission
              messageForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const message = userInput.value.trim();
                if (!message) return;
                
                // Add user message to chat
                addMessage(message, 'user');
                userInput.value = '';
                
                // Simulate processing (replace with actual API call)
                setTimeout(() => {
                  // API call to your backend would go here
                  fetch('${
                    process.env.BASE_URL
                  }/api/chatbots/${chatbotId}/message', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message })
                  })
                  .then(response => response.json())
                  .then(data => {
                    addMessage(data.response || "I'm sorry, I couldn't process your request.", 'bot');
                  })
                  .catch(error => {
                    console.error('Error:', error);
                    addMessage("I'm having trouble connecting. Please try again later.", 'bot');
                  });
                }, 500);
              });
              
              // Add message to chat
              function addMessage(text, sender) {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${sender}-message\`;
                messageDiv.textContent = text;
                chatMessages.appendChild(messageDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
              
              // Handle close button
              closeBtn.addEventListener('click', function() {
                window.parent.postMessage('close', '*');
              });
            </script>
          </body>
        </html>
      `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error("Error rendering chatbot:", error);
    res.status(500).send("Error rendering chatbot");
  }
};

// Message handling endpoint
const handleChatbotMessage = async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // This is where you would integrate with your AI service
    // For example, OpenAI, your own NLP system, etc.

    // Simple example response - replace with actual AI processing
    let response;

    if (
      message.toLowerCase().includes("hello") ||
      message.toLowerCase().includes("hi")
    ) {
      response = "Hello! How can I assist you today?";
    } else if (message.toLowerCase().includes("bye")) {
      response = "Goodbye! Have a great day!";
    } else if (message.toLowerCase().includes("help")) {
      response = "I'm here to help! What do you need assistance with?";
    } else {
      response =
        "I'm a simple chatbot. I'll be more intelligent in the future!";
    }

    // Send the response back
    res.json({ response });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
};

module.exports = {
  createChatbotWithAdmin,
  getChatbots,
  getChatbotWidget,
  getChatbotScript,
  viewChatbot,
  handleChatbotMessage,
};
