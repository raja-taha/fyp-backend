# New Client Notification Feature

## Overview

This feature adds a notification system that alerts agents when a client messages them for the first time, ensuring no new conversations are missed.

## Implementation Details

### Server-Side Implementation (Completed)

Added logic in `src/socket.js` to:

1. Detect when a client sends their first message to an agent
2. Emit a `newClientNotification` event to the agent with client details

### Agent-Side Implementation (To Be Added)

Add the following socket event listener to the agent interface:

```javascript
// Add this to the agent dashboard JavaScript
socket.on("newClientNotification", (data) => {
  // Extract client information
  const { clientId, timestamp, message } = data;

  // Create notification
  const notification = new Notification("New Client Message", {
    body: message,
    icon: "/robot-logo.svg", // Use your app's icon
  });

  // Optional: Add sound alert
  const notificationSound = new Audio("/notification-sound.mp3"); // Add a sound file to your assets
  notificationSound.play();

  // Optional: Add visual indicator to the client in the list
  const clientElement = document.querySelector(
    `[data-client-id="${clientId}"]`
  );
  if (clientElement) {
    clientElement.classList.add("new-client");
  } else {
    // If client isn't in the current list, you may want to refresh the list
    refreshClientList();
  }

  // Optional: Add click handler to navigate to the chat
  notification.onclick = function () {
    window.focus();
    navigateToChat(clientId);
  };
});

// Function to request notification permissions on page load
function requestNotificationPermission() {
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

// Call this when the agent dashboard loads
document.addEventListener("DOMContentLoaded", requestNotificationPermission);
```

### Testing the Feature

1. Make sure an agent is logged in
2. Have a new client sign up and send their first message
3. Verify the agent receives a notification

### Customization Options

- Adjust notification sound
- Change notification styling
- Add persistence for unread notifications
- Implement a notification counter in the UI
