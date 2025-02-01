import config from "./config.js";

class Dashboard {
  constructor() {
    // Load configuration
    this.config = config;
    this.socket = null;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;

    this.initializeUI();
    this.setupEventListeners();
    this.checkAuth();

    // Handle page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.handlePageVisible();
      }
    });
  }

  initializeUI() {
    // Cache DOM elements
    this.elements = {
      loginScreen: document.getElementById("loginScreen"),
      dashboardContent: document.getElementById("dashboardContent"),
      loginBtn: document.getElementById("loginBtn"),
      loginBtnMain: document.getElementById("loginBtnMain"),
      userInfo: document.getElementById("userInfo"),
      userAvatar: document.getElementById("userAvatar"),
      username: document.getElementById("username"),
      console: document.getElementById("console"),
      botStatus: document.getElementById("botStatus"),
      botStatusText: document.getElementById("botStatusText"),
      uptimeValue: document.getElementById("uptimeValue"),
      memoryValue: document.getElementById("memoryValue"),
      latencyValue: document.getElementById("latencyValue"),
    };

    // Validate all elements exist
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element) {
        console.error(`Required element not found: ${key}`);
      }
    });
  }

  setupEventListeners() {
    // Use event delegation for better performance
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-action]");
      if (target) {
        const action = target.dataset.action;
        this.handleQuickAction(action);
      }
    });

    // Login buttons
    this.elements.loginBtn?.addEventListener("click", () => this.login());
    this.elements.loginBtnMain?.addEventListener("click", () => this.login());

    // Restart bot button
    document.getElementById("restartBot")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to restart the bot?")) {
        this.sendCommand("restart");
      }
    });

    // Clear console button
    document.getElementById("clearConsole")?.addEventListener("click", () => {
      this.clearConsole();
    });
  }

  login() {
    try {
      const params = new URLSearchParams({
        client_id: this.config.DISCORD_CLIENT_ID,
        redirect_uri: this.config.REDIRECT_URI,
        response_type: "code",
        scope: "identify",
        prompt: "consent",
      });

      const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
      window.location.href = authUrl;
    } catch (error) {
      this.log("Failed to initiate login: " + error.message, "error");
    }
  }

  async checkAuth() {
    // Check for auth errors
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("error")) {
      this.log("Authentication failed: " + urlParams.get("error"), "error");
      this.showLoginScreen();
      // Clear the error from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const token = localStorage.getItem("discord_token");
    if (!token) {
      this.showLoginScreen();
      return;
    }

    try {
      const response = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Authentication failed");

      const userData = await response.json();

      if (userData.id === this.config.YOUR_USER_ID) {
        this.isAuthenticated = true;
        this.showDashboard(userData);
        this.connectWebSocket();
        this.log("Successfully authenticated as " + userData.username);
      } else {
        throw new Error("Unauthorized user");
      }
    } catch (error) {
      this.log("Authentication failed: " + error.message, "error");
      this.logout();
    }
  }

  showLoginScreen() {
    this.elements.loginScreen.style.display = "flex";
    this.elements.dashboardContent.style.display = "none";
    this.elements.loginBtn.style.display = "block";
    this.elements.userInfo.style.display = "none";
  }

  showDashboard(userData) {
    this.elements.loginScreen.style.display = "none";
    this.elements.dashboardContent.style.display = "block";
    this.elements.loginBtn.style.display = "none";
    this.elements.userInfo.style.display = "flex";

    this.elements.userAvatar.src = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`;
    this.elements.username.textContent = userData.username;
  }

  logout() {
    localStorage.removeItem("discord_token");
    this.isAuthenticated = false;
    this.showLoginScreen();
    this.disconnectWebSocket();
  }

  disconnectWebSocket() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  connectWebSocket() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(this.config.WS_ENDPOINT);

    this.socket.onopen = () => {
      this.log("Connected to bot");
      this.updateBotStatus(true);
      this.reconnectAttempts = 0;
    };

    this.socket.onclose = () => {
      this.log("Disconnected from bot");
      this.updateBotStatus(false);
      this.handleReconnect();
    };

    this.socket.onerror = (error) => {
      this.log("WebSocket error: " + error.message, "error");
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        this.log("Failed to process message: " + error.message, "error");
      }
    };
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log(
        "Max reconnection attempts reached. Please refresh the page.",
        "error"
      );
      return;
    }

    this.reconnectAttempts++;
    const delay =
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    setTimeout(() => this.connectWebSocket(), delay);
  }

  handlePageVisible() {
    if (
      this.isAuthenticated &&
      (!this.socket || this.socket.readyState !== WebSocket.OPEN)
    ) {
      this.connectWebSocket();
    }
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case "stats":
        this.updateStats(data);
        break;
      case "log":
        this.log(data.message);
        break;
      case "error":
        this.log(data.message, "error");
        break;
      default:
        console.warn("Unknown message type:", data.type);
    }
  }

  updateStats(data) {
    if (!data) return;

    const { uptime, memory, latency } = data;
    this.elements.uptimeValue.textContent = uptime || "--:--:--";
    this.elements.memoryValue.textContent = memory
      ? `${Math.round(memory)} MB`
      : "-- MB";
    this.elements.latencyValue.textContent = latency
      ? `${latency} ms`
      : "-- ms";
  }

  updateBotStatus(isOnline) {
    this.elements.botStatus.className = `status-dot ${
      isOnline ? "online" : "offline"
    }`;
    this.elements.botStatusText.textContent = isOnline ? "Online" : "Offline";
  }

  handleQuickAction(action) {
    if (!action) return;

    switch (action) {
      case "sendMessage":
        this.sendCommand("test_message");
        break;
      case "clearCache":
        if (confirm("Are you sure you want to clear the cache?")) {
          this.sendCommand("clear_cache");
        }
        break;
      case "updateStatus":
        this.sendCommand("update_status");
        break;
      case "viewLogs":
        this.sendCommand("get_logs");
        break;
      default:
        console.warn("Unknown action:", action);
    }
  }

  sendCommand(command) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.log("Not connected to bot", "error");
      return;
    }

    try {
      this.socket.send(
        JSON.stringify({
          command,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      this.log("Failed to send command: " + error.message, "error");
    }
  }

  log(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement("div");
    line.className = `console-line ${type}`;

    const sanitizedMessage = this.sanitizeHTML(message);
    line.innerHTML = `
      <span class="timestamp">${timestamp}</span>
      <span class="console-text">${sanitizedMessage}</span>
    `;

    this.elements.console.appendChild(line);
    this.elements.console.scrollTop = this.elements.console.scrollHeight;

    // Limit console lines
    while (this.elements.console.children.length > 100) {
      this.elements.console.removeChild(this.elements.console.firstChild);
    }
  }

  sanitizeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  clearConsole() {
    this.elements.console.innerHTML = "";
    this.log("Console cleared");
  }
}

// Initialize dashboard when the page loads
window.addEventListener("load", () => {
  new Dashboard();
});
