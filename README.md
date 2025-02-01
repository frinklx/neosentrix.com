# Discord Bot Dashboard

A simple Discord bot with a web dashboard for monitoring and control.

## Features

- Real-time bot status monitoring
- Server (guild) information display
- Message sending capabilities
- WebSocket-based live updates
- Simple, single-server setup

## Prerequisites

- Node.js 16.x or higher
- npm
- A Discord bot token
- Your Discord user ID

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/neosentrix.com.git
cd neosentrix.com
```

2. Install dependencies:
```bash
# Install API dependencies
cd api
npm install

# Install dashboard dependencies (if separate)
cd ../dashboard
npm install
```

3. Create a `.env` file in the `api` directory:
```env
DISCORD_TOKEN=your_discord_bot_token
PORT=3001
YOUR_USER_ID=your_discord_user_id
```

## Usage

1. Start the server:
```bash
cd api
npm install -g pm2
pm2 start server.js --name neosentrix-api
```

2. Access the dashboard:
- Open `http://localhost:3001/dashboard` in your browser

## Development

1. Start the server in development mode:
```bash
cd api
npm run dev
```

2. The dashboard will automatically connect to the local server

## Project Structure

```
.
├── api/                # Backend server and bot logic
│   ├── server.js      # Main server file
│   └── package.json   # API dependencies
├── dashboard/         # Frontend dashboard
│   ├── index.html    # Dashboard interface
│   └── config.js     # Dashboard configuration
├── public/           # Static files
│   ├── css/         # Stylesheets
│   └── js/          # Client-side JavaScript
└── README.md        # This file
```

## Configuration

### Bot Configuration
- Create a Discord application at https://discord.com/developers/applications
- Create a bot for your application
- Enable necessary intents (SERVER MEMBERS, MESSAGE CONTENT)
- Copy the bot token to your `.env` file

### Dashboard Configuration
- Update `dashboard/config.js` with your settings
- Set your Discord user ID in the configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 