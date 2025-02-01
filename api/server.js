require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const WebSocket = require("ws");
const cors = require("cors");
const path = require("path");

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(
  express.static(path.join(__dirname, ".."), {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  })
);

// Serve dashboard files
app.use(
  "/dashboard",
  express.static(path.join(__dirname, "../dashboard"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  })
);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// Store bot status and data
let botData = {
  status: "offline",
  lastMessage: null,
  guilds: [],
  uptime: 0,
};

// Discord bot events
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  botData.status = "online";
  updateBotData();
});

client.on("messageCreate", (message) => {
  if (message.author.id === process.env.YOUR_USER_ID) {
    botData.lastMessage = {
      content: message.content,
      timestamp: message.createdTimestamp,
    };
    broadcastUpdate();
  }
});

// Update bot data periodically
function updateBotData() {
  botData.guilds = Array.from(client.guilds.cache).map(([id, guild]) => ({
    id,
    name: guild.name,
    memberCount: guild.memberCount,
  }));
  botData.uptime = client.uptime;
  broadcastUpdate();
}

setInterval(updateBotData, 5000);

// API endpoints
app.get("/api/status", (req, res) => {
  res.json(botData);
});

app.post("/api/send-message", async (req, res) => {
  const { channelId, message } = req.body;
  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send(message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth2 callback endpoint
app.get("/dashboard/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    // Redirect to dashboard after successful authentication
    res.redirect("/dashboard");
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Catch-all route for SPA
app.get("*", (req, res) => {
  if (req.path.startsWith("/dashboard")) {
    res.sendFile(path.join(__dirname, "../dashboard/index.html"));
  } else {
    res.sendFile(path.join(__dirname, "../index.html"));
  }
});

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

function broadcastUpdate() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(botData));
    }
  });
}

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle WebSocket upgrade
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  ws.send(JSON.stringify(botData));

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

// Login Discord bot
client.login(process.env.DISCORD_TOKEN).catch(console.error);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("SIGINT received. Closing server...");
  wss.close(() => {
    console.log("WebSocket server closed");
    server.close(() => {
      console.log("HTTP server closed");
      client.destroy();
      process.exit(0);
    });
  });
});
