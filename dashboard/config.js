const config = {
  development: {
    DISCORD_CLIENT_ID: "1335084588212551702",
    API_ENDPOINT: "http://localhost:3001/api",
    WS_ENDPOINT: "ws://localhost:3001",
    YOUR_USER_ID: "1241605075047153776",
  },
  production: {
    DISCORD_CLIENT_ID: "1335084588212551702",
    API_ENDPOINT: "/api",
    WS_ENDPOINT: `ws://${window.location.host}`,
    YOUR_USER_ID: "1241605075047153776",
  },
};

// Determine environment based on URL
const isProduction =
  window.location.hostname === "neosentrix.com" ||
  window.location.hostname === "www.neosentrix.com";

// Export the appropriate configuration
export default isProduction ? config.production : config.development;
