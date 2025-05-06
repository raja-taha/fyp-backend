# Multilingual Chat System - Backend

## Overview

This backend provides a real-time multilingual chat system with the following features:

- User authentication for agents and clients
- Real-time messaging with socket.io
- Automatic message translation
- Voice messaging
- New client notifications
- Typing indicators

## Socket Implementation

The socket implementation has been optimized for efficiency with the following features:

1. Improved connection handling with websocket transport prioritization
2. Direct message delivery to specific users when online
3. Efficient tracking of active users
4. Support for typing indicators
5. New client notifications
6. Message compression for better network performance
7. Both clientId and agentId included in all messages and events for proper routing and persistence

## Frontend Socket Integration Guide

### 1. Connect to Socket Server

```javascript
import { io } from "socket.io-client";

// Initialize socket connection
const socket = io(BACKEND_URL, {
  transports: ["websocket", "polling"], // Prioritize websocket for better performance
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Handle connection events
socket.on("connect", () => {
  console.log("Connected to socket server");
});

socket.on("disconnect", () => {
  console.log("Disconnected from socket server");
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
});
```

### 2. Join a Chat Room

Users must join a room to receive messages:

```javascript
// For clients
socket.emit("joinRoom", {
  userId: clientId,
  language: clientLanguage, // e.g., "en", "es", "fr"
});

// For agents
socket.emit("joinRoom", {
  userId: agentId,
  language: agentLanguage,
});
```

### 3. Send and Receive Messages

```javascript
// Send message
const sendMessage = (message) => {
  socket.emit("sendMessage", {
    clientId: activeClient.id,
    agentId: currentUser.id,
    sender: "agent", // or "client" depending on user role
    text: message,
    timestamp: new Date(),
    isVoiceMessage: false,
  });
};

// Listen for incoming messages
socket.on("newMessage", (messageData) => {
  // Each message includes clientId and agentId for proper routing and persistence
  const {
    sender,
    clientId,
    agentId,
    text,
    translatedText,
    timestamp,
    isVoiceMessage,
  } = messageData;

  // Add message to your UI
  addMessageToChat({
    clientId,
    agentId,
    text: sender === currentUserType ? text : translatedText,
    sender: sender,
    timestamp: new Date(timestamp),
    isVoiceMessage,
  });
});
```

### 4. Typing Indicators

```javascript
// Send typing status
const handleTyping = (isTyping) => {
  socket.emit("typing", {
    recipientId: isAgentRole ? activeClient.id : assignedAgent.id,
    isTyping,
  });
};

// Listen for typing status
socket.on("userTyping", ({ isTyping, userId }) => {
  // Update UI to show/hide typing indicator
  setIsTyping(isTyping);
});
```

### 5. New Client Notifications

Add this to your agent interface:

```javascript
// Listen for new client notifications
socket.on("newClientNotification", (data) => {
  // All notifications include both clientId and agentId for proper handling
  const { clientId, agentId, clientName, timestamp, message } = data;

  // Check if browser notifications are supported
  if ("Notification" in window) {
    // Request permission if not granted
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    // Show notification if permission granted
    if (Notification.permission === "granted") {
      const notification = new Notification("New Client Message", {
        body: `${clientName}: ${message}`,
        icon: "/path-to-your-icon.png", // Add your app's icon
      });

      // Optional: Add click handler to open chat
      notification.onclick = () => {
        window.focus();
        navigateToChat(clientId, agentId);
      };
    }
  }

  // Add visual indicator in the UI
  addNewClientIndicator(clientId, agentId, clientName);

  // Optional: Play sound alert
  const notificationSound = new Audio("/path-to-your-sound.mp3");
  notificationSound.play();
});

// Function to navigate to chat with the new client
const navigateToChat = (clientId, agentId) => {
  // Implement your navigation logic with both IDs
  setActiveChat({ clientId, agentId });
};

// Function to add visual indicator in the clients list
const addNewClientIndicator = (clientId, agentId, clientName) => {
  // Update your UI to highlight the new client using both IDs for proper identification
  const clientElement = document.querySelector(
    `[data-client-id="${clientId}"][data-agent-id="${agentId}"]`
  );
  if (clientElement) {
    clientElement.classList.add("new-client");
  } else {
    // If client isn't in the current list, you may want to refresh the list
    refreshClientList();
  }
};
```

### 6. Voice Messages

```javascript
// Send voice message
const sendVoiceMessage = async (audioBlob) => {
  const formData = new FormData();
  formData.append("audio", audioBlob, "voice-message.webm");
  formData.append("clientId", activeClient.id);
  formData.append("agentId", currentUser.id);
  formData.append("sender", "agent"); // or "client"
  formData.append("timestamp", new Date().toISOString());
  formData.append("saveMessage", "true");

  try {
    const response = await fetch(`${BACKEND_URL}/api/chats/voice-message`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload voice message");
    }
  } catch (error) {
    console.error("Error sending voice message:", error);
  }
};
```

### 7. Cleanup on Unmount

```javascript
// Make sure to disconnect and clean up socket when component unmounts
useEffect(() => {
  return () => {
    socket.disconnect();
  };
}, []);
```

## Important Implementation Notes

1. All messages in the database now include both clientId and agentId at the message level, not just at the chat session level.
2. When displaying messages in the UI, make sure to use both IDs for proper identification.
3. When querying for messages, include both IDs in your queries to ensure correct results.
4. User interface elements that display chat participants should use data attributes for both IDs: `data-client-id` and `data-agent-id`.

## API Endpoints

This backend supports the following API endpoints:

- `/api/users` - User management
- `/api/clients` - Client management
- `/api/chatbots` - Chatbot configuration
- `/api/chats` - Message and chat operations
- `/api/dashboard` - Dashboard data

## Setup and Installation

1. Install dependencies:

   ```
   npm install
   ```

2. Setup environment variables:

   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PYTHON_MICROSERVICE_URL=http://translation-service-url:8000
   ```

3. Start the development server:

   ```
   npm run dev
   ```

4. For production:
   ```
   npm start
   ```
