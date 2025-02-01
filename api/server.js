require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const WebSocket = require("ws");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(
  express.static(path.join(__dirname, "../public"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      } else if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      } else if (filePath.endsWith(".svg")) {
        res.setHeader("Content-Type", "image/svg+xml");
      }
    },
  })
);

// Serve dashboard files
app.use("/dashboard", express.static(path.join(__dirname, "../dashboard")));

// Serve root files
app.use(express.static(path.join(__dirname, "..")));

// Add CORS headers for WebSocket
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

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

// Create WebSocket server
const wss = new WebSocket.Server({
  noServer: true,
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    concurrencyLimit: 10,
    threshold: 1024,
  },
});

// Store connected WebSocket clients
const clients = new Set();

// Discord bot events
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  botData.status = "online";
  updateBotData();
  broadcastToAll({
    type: "status",
    data: {
      status: "online",
      uptime: client.uptime,
      ping: client.ws.ping,
    },
  });
});

client.on("messageCreate", (message) => {
  if (message.author.id === process.env.YOUR_USER_ID) {
    botData.lastMessage = {
      content: message.content,
      timestamp: message.createdTimestamp,
    };
    broadcastToAll({
      type: "newMessage",
      data: {
        content: message.content,
        author: message.author.tag,
        channelId: message.channelId,
      },
    });
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
  broadcastToAll({
    type: "stats",
    data: {
      uptime: client.uptime,
      ping: client.ws.ping,
      guildCount: client.guilds.cache.size,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
    },
  });
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
  console.log("Received OAuth callback with code:", code);

  if (!code) {
    console.error("No code provided in OAuth callback");
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    const redirectUri = "http://localhost:3001/dashboard/callback";
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      scope: "identify guilds bot applications.commands",
    });

    console.log("Exchanging code for token with params:", {
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "identify guilds bot applications.commands",
    });

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: params,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange failed:", error);
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("Successfully obtained token");

    // Get user data
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to get user data");
    }

    const userData = await userResponse.json();
    console.log("Got user data:", userData.username);

    // Store token in session or send to client
    res.cookie("discord_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to dashboard
    res.redirect("/dashboard?token=" + tokenData.access_token);
  } catch (error) {
    console.error("OAuth error:", error);
    res.redirect("/dashboard?error=" + encodeURIComponent(error.message));
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

// WebSocket connection handler
wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("New WebSocket client connected");

  // Send initial bot status
  ws.send(
    JSON.stringify({
      type: "status",
      data: {
        status: client.isReady() ? "online" : "offline",
        uptime: client.uptime,
        ping: client.ws.ping,
      },
    })
  );

  // Handle client messages
  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "sendTestMessage":
          // Send test message to specified channel
          if (data.channelId) {
            const channel = await client.channels.fetch(data.channelId);
            if (channel) {
              await channel.send("Test message from dashboard!");
              ws.send(
                JSON.stringify({
                  type: "messageSent",
                  success: true,
                })
              );
            }
          }
          break;

        case "getStats":
          // Send bot statistics
          ws.send(
            JSON.stringify({
              type: "stats",
              data: {
                uptime: client.uptime,
                ping: client.ws.ping,
                guildCount: client.guilds.cache.size,
                memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
              },
            })
          );
          break;
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: error.message,
        })
      );
    }
  });

  // Handle client disconnect
  ws.on("close", () => {
    clients.delete(ws);
    console.log("WebSocket client disconnected");
  });
});

// Utility function to broadcast to all WebSocket clients
function broadcastToAll(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    client.send(message);
  }
}

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("WebSocket server available");

  // Login to Discord
  client
    .login(process.env.DISCORD_TOKEN)
    .then(() => console.log("Discord bot connected"))
    .catch((error) => console.error("Discord bot connection error:", error));
});

// Handle WebSocket upgrade
server.on("upgrade", (request, socket, head) => {
  // Add WebSocket specific headers
  const headers = {
    "Sec-WebSocket-Protocol": "neosentrix-protocol",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  wss.handleUpgrade(request, socket, head, (ws) => {
    for (const [key, value] of Object.entries(headers)) {
      ws.protocol = value;
    }
    wss.emit("connection", ws, request);
  });
});

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
