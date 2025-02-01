const config = {
  development: {
    DISCORD_CLIENT_ID: "1335084588212551702",
    API_ENDPOINT: "http://localhost:3001",
    WS_ENDPOINT: "ws://localhost:3001",
    REDIRECT_URI: "http://localhost:3000/dashboard/callback",
    YOUR_USER_ID: "1241605075047153776",
  },
  production: {
    DISCORD_CLIENT_ID: "1335084588212551702",
    API_ENDPOINT: "https://api.neosentrix.com",
    WS_ENDPOINT: "wss://api.neosentrix.com",
    REDIRECT_URI: "https://neosentrix.com/dashboard/callback",
    YOUR_USER_ID: "1241605075047153776",
  },
};

// Determine environment
const env =
  window.location.hostname === "localhost" ? "development" : "production";

// Export configuration
export default config[env];
