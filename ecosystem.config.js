module.exports = {
  apps: [
    {
      name: "neosentrix-api",
      script: "api/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DISCORD_TOKEN: process.env.DISCORD_TOKEN,
        DISCORD_CLIENT_ID: "1335084588212551702",
        YOUR_USER_ID: "1241605075047153776",
      },
      watch: true,
      ignore_watch: ["node_modules", "logs", ".git"],
      autorestart: true,
      max_memory_restart: "1G",
      error_file: "logs/error.log",
      out_file: "logs/output.log",
      time: true,
    },
  ],
};
