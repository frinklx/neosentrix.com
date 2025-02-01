const config = {
  development: {
    DISCORD_CLIENT_ID: "1199445891861975040",
    API_ENDPOINT: "http://localhost:8080/api",
    WS_ENDPOINT: "ws://localhost:8080/ws",
    YOUR_USER_ID: "1241605075047153776",
    REDIRECT_URI: "http://localhost:8080/dashboard/callback",
  },
  production: {
    DISCORD_CLIENT_ID: "1335084588212551702",
    API_ENDPOINT: "/api",
    WS_ENDPOINT: `wss://${window.location.host}/ws`,
    YOUR_USER_ID: "1241605075047153776",
    REDIRECT_URI: `${window.location.origin}/dashboard/callback`,
  },
};

// Determine environment based on URL
const isProduction =
  window.location.hostname === "neosentrix.com" ||
  window.location.hostname === "www.neosentrix.com";

// Export the appropriate configuration
export default isProduction ? config.production : config.development;
