const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Chatbot = require("../models/Chatbot");
const fs = require("fs");
const path = require("path");

const createChatbot = async (req, res) => {
  const { chatbotName, description } = req.body;
  if (!chatbotName) {
    return res.status(400).json({ message: "Chatbot name is required" });
  }
  try {
    const newChatbot = new Chatbot({
      name: chatbotName,
      description,
      createdBy: req.user.userId,
      active: true,
    });
    await newChatbot.save();
    res
      .status(201)
      .json({ message: "Chatbot created successfully", chatbot: newChatbot });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all chatbots
const getChatbots = async (req, res) => {
  try {
    const chatbots = await Chatbot.find().populate(
      "createdBy",
      "firstName lastName email username verified"
    );

    res.status(200).json(chatbots);
  } catch (error) {
    console.error("Error fetching chatbots:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getChatbotByAdmin = async (req, res) => {
  try {
    const adminId = req.user.userId; // Get logged-in admin's ID
    const chatbot = await Chatbot.findOne({ createdBy: adminId });

    if (!chatbot) {
      return res
        .status(404)
        .json({ message: "No chatbot found for this admin" });
    }

    res.status(200).json(chatbot);
  } catch (error) {
    console.error("Error fetching chatbot:", error);
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
          iframe.id = "chatbot-iframe";
          iframe.src = "${process.env.VITE_PUBLIC_BACKEND_URL}/api/chatbots/view?chatbot_id=${chatbotId}";
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "none";
          iframe.style.borderRadius = "10px";
          iframe.setAttribute("allow", "microphone");
          container.appendChild(iframe);
  
          // Set container dimensions based on window size
          if (window.innerWidth > 768) {
            container.style.width = "400px";
            container.style.height = "800px";
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
          button.style.backgroundColor = "#2b7fff";
          button.style.color = "white";
          button.style.border = "none";
          button.style.fontSize = "24px";
          button.style.cursor = "pointer";
          button.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
          button.style.zIndex = "99999";
          button.style.display = "flex";
          button.style.alignItems = "center";
          button.style.justifyContent = "center";
          
          // Create SVG element for chat icon
          const chatIconElement = document.createElement("img");
          chatIconElement.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIyIDEwVjEzQzIyIDE3IDIwIDE5IDE2IDE5SDE1LjVDMTUuMTkgMTkgMTQuODkgMTkuMTUgMTQuNyAxOS40TDEzLjIgMjEuNEMxMi41NCAyMi4yOCAxMS40NiAyMi4yOCAxMC44IDIxLjRMOS4zIDE5LjRDOS4xNCAxOS4xOCA4Ljc3IDE5IDguNSAxOUg4QzQgMTkgMiAxOCAyIDEzVjhDMiA0IDQgMiA4IDJIMTQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkuNSA3QzIwLjg4MDcgNyAyMiA1Ljg4MDcxIDIyIDQuNUMyMiAzLjExOTI5IDIwLjg4MDcgMiAxOS41IDJDMTguMTE5MyAyIDE3IDMuMTE5MjkgMTcgNC41QzE3IDUuODgwNzEgMTguMTE5MyA3IDE5LjUgN1oiIGZpbGw9IiNGNzI1ODUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTE1Ljk5NjUgMTFIMTYuMDA1NCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTExLjk5NTUgMTFIMTIuMDA0NSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTcuOTk0NTEgMTFIOC4wMDM0OSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+";
          chatIconElement.style.width = "30px";
          chatIconElement.style.height = "30px";
          button.appendChild(chatIconElement);
          document.body.appendChild(button);
          
          // Function to reset button to chat icon state
          function resetButtonToChatIcon() {
            button.innerHTML = "";
            const newChatIcon = chatIconElement.cloneNode(true);
            button.appendChild(newChatIcon);
          }
          
          // Function to handle closing the chatbot
          function closeChatbot() {
            container.style.display = "none";
            resetButtonToChatIcon();
            
            // Refresh the iframe content when closed to ensure it can be reopened properly
            const iframe = document.getElementById("chatbot-iframe");
            if (iframe) {
              iframe.src = iframe.src;
            }
          }
          
          // Toggle chatbot visibility
          button.onclick = function() {
            if (container.style.display === "none") {
              // If we're opening the chatbot and it was previously closed with the header X
              // Check if we need to refresh the iframe content
              const iframe = document.getElementById("chatbot-iframe");
              if (iframe) {
                // Check localStorage for user data to determine if we should reload
                const storedUser = localStorage.getItem("clientUser");
                if (storedUser) {
                  // If we have a stored user, just make sure the iframe is loaded
                  if (!iframe.src || iframe.src === "about:blank") {
                    iframe.src = "${process.env.VITE_PUBLIC_BACKEND_URL}/api/chatbots/view?chatbot_id=${chatbotId}";
                  }
                }
              }
              
              container.style.display = "block";
              button.innerHTML = "✕";
            } else {
              closeChatbot();
            }
          };
          
          // Listen for close message from iframe
          window.addEventListener("message", function(event) {
            
            if (event.data === "close") {
              
              closeChatbot();
            }
          });
          
          // Check if the user is already logged in via localStorage
          try {
            const storedUser = localStorage.getItem("clientUser");
            if (storedUser) {
              // Auto-open chat for returning users (can be adjusted as needed)
              setTimeout(function() {
                if (container.style.display === "none") {
                  container.style.display = "block";
                  button.innerHTML = "✕";
                }
              }, 1000);
            }
          } catch (error) {
            console.error("Error checking stored user data:", error);
          }
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
        s.src = "${process.env.VITE_PUBLIC_BACKEND_URL}/api/chatbots/widget?chatbot_id=${chatbot._id}";
        document.head.appendChild(s);
      </script>`;

    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(scriptCode);
  } catch (error) {
    console.error("Error serving script:", error);
    res.status(500).json({ error: "Error generating script" });
  }
};

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

    // Read the chatbot.html file
    const filePath = path.join(__dirname, "../public/chatbot.html");
    let html = fs.readFileSync(filePath, "utf8");

    // Replace placeholders with actual chatbot data
    html = html.replace(
      /\${chatbot\.name \|\| "Chatbot"}/g,
      chatbot.name || "Chatbot"
    );
    html = html.replace(/\${chatbotId}/g, chatbotId);

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

const getChatbotById = async (req, res) => {
  try {
    const chatbotId = req.params.chatbotId;
    const chatbot = await Chatbot.findById(chatbotId);

    if (!chatbot) {
      return res.status(404).json({ message: "Chatbot not found" });
    }

    res.status(200).json({
      id: chatbot._id,
      name: chatbot.name,
      description: chatbot.description,
    });
  } catch (error) {
    console.error("Error fetching chatbot:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Public endpoint to get basic chatbot info without authentication
const getPublicChatbotInfo = async (req, res) => {
  try {
    const chatbotId = req.params.chatbotId;

    if (!chatbotId) {
      return res.status(400).json({ message: "Chatbot ID is required" });
    }

    const chatbot = await Chatbot.findById(chatbotId);

    if (!chatbot) {
      return res.status(404).json({ message: "Chatbot not found" });
    }

    // Return only public/basic information
    res.status(200).json({
      id: chatbot._id,
      name: chatbot.name,
    });
  } catch (error) {
    console.error("Error fetching chatbot info:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createChatbot,
  getChatbots,
  getChatbotWidget,
  getChatbotScript,
  viewChatbot,
  handleChatbotMessage,
  getChatbotById,
  getChatbotByAdmin,
  getPublicChatbotInfo,
};
