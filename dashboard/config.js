const config = {
  development: {
    DISCORD_CLIENT_ID: "1335084588212551702",
    API_ENDPOINT: "http://localhost:8081/api",
    WS_ENDPOINT: "ws://localhost:8081/ws",
    REDIRECT_URI: "http://localhost:8081/dashboard/callback",
    YOUR_USER_ID: "1241605075047153776",
  },
  production: {
    DISCORD_CLIENT_ID: "1335084588212551702",
    API_ENDPOINT: "https://neosentrix.com/api",
    WS_ENDPOINT: "wss://neosentrix.com/ws",
    REDIRECT_URI: "https://neosentrix.com/dashboard/callback",
    YOUR_USER_ID: "1241605075047153776",
  },
};

// Determine environment
const env =
  window.location.hostname === "localhost" ? "development" : "production";

// Export configuration
export default config[env];
