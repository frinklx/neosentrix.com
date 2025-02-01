require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const WebSocket = require("ws");
const http = require("http");

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

// Initialize Express app and WebSocket server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Your Discord user ID for DM communication
const YOUR_USER_ID = "1241605075047153776";

// Store bot start time for uptime calculation
const startTime = Date.now();

// WebSocket connections store
let dashboardConnection = null;

// Bot ready event
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  sendLogToDashboard("Bot initialized and ready");
});

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("Dashboard connected");
  dashboardConnection = ws;

  // Send initial stats
  sendStats();

  // Handle messages from dashboard
  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      handleDashboardCommand(data);
    } catch (error) {
      console.error("Error handling dashboard message:", error);
    }
  });

  // Handle disconnect
  ws.on("close", () => {
    console.log("Dashboard disconnected");
    dashboardConnection = null;
  });
});

// Handle commands from dashboard
async function handleDashboardCommand(data) {
  const { command } = data;

  switch (command) {
    case "test_message":
      sendDMToOwner("Test message from dashboard");
      sendLogToDashboard("Test message sent");
      break;

    case "clear_cache":
      // Implement cache clearing logic
      sendLogToDashboard("Cache cleared");
      break;

    case "update_status":
      await client.user.setActivity("Managing Dashboard", { type: "PLAYING" });
      sendLogToDashboard("Status updated");
      break;

    case "get_logs":
      // Implement log fetching logic
      sendLogToDashboard("Fetching logs...");
      break;

    case "restart":
      sendLogToDashboard("Restarting bot...");
      process.exit(); // PM2 or similar will restart the process
      break;

    default:
      sendLogToDashboard(`Unknown command: ${command}`, "error");
  }
}

// Utility functions
function sendStats() {
  if (!dashboardConnection) return;

  const stats = {
    type: "stats",
    uptime: formatUptime(Date.now() - startTime),
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
    latency: client.ws.ping,
  };

  dashboardConnection.send(JSON.stringify(stats));
}

function sendLogToDashboard(message, type = "info") {
  if (!dashboardConnection) return;

  const logMessage = {
    type: "log",
    message,
    timestamp: new Date().toISOString(),
    level: type,
  };

  dashboardConnection.send(JSON.stringify(logMessage));
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}

async function sendDMToOwner(message) {
  try {
    const user = await client.users.fetch(YOUR_USER_ID);
    await user.send(message);
  } catch (error) {
    console.error("Error sending DM:", error);
  }
}

// Start sending stats updates periodically
setInterval(sendStats, 5000);

// Express routes for OAuth2 callback
app.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("No code provided");
  }

  try {
    // Implement OAuth2 token exchange
    // This should be done securely, preferably on a backend server
    res.redirect("/dashboard");
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("Authentication failed");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
