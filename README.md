# NeoSentrix Learning Platform

A modern web-based learning platform built with JavaScript and Firebase.

## Project Structure

```
neosentrix.com/
├── src/                      # Source code
│   ├── auth/                 # Authentication
│   │   ├── login/           # Login page
│   │   └── signup/          # Signup pages
│   ├── onboarding/          # User onboarding
│   ├── dashboard/           # User dashboard
│   ├── features/            # Feature pages
│   ├── about/               # About pages
│   ├── privacypolicy/       # Privacy policy
│   ├── tos/                 # Terms of service
│   ├── usecases/           # Use cases
│   ├── shared/             # Shared code
│   │   ├── components/     # Reusable components
│   │   ├── styles/         # Global styles
│   │   ├── utils/          # Utility functions
│   │   └── layouts/        # Layout components
│   ├── assets/             # Static assets
│   │   ├── images/         # Images
│   │   └── icons/          # Icons
│   ├── index.html          # Main HTML
│   └── index.js            # Main entry point
├── webpack.config.js        # Webpack configuration
└── package.json            # Project dependencies
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Features

- Modern authentication system
- Personalized learning paths
- Progress tracking
- Interactive dashboard
- Responsive design
- Real-time updates

## Technologies

- JavaScript (ES6+)
- Firebase (Authentication & Firestore)
- Webpack
- CSS3 with modern features
- Responsive design
- Progressive Web App capabilities

## Development

The project uses a modular architecture with:
- Shared components for reusability
- Utility functions for common operations
- CSS variables for consistent styling
- Webpack for bundling and optimization

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request 