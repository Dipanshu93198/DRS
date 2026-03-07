# Disaster Response System (DRS) - Resilience Hub

A comprehensive disaster response and emergency management platform built with modern web technologies.

## Overview

The Resilience Hub is the frontend component of the Disaster Response System, providing a user-friendly interface for emergency coordination, resource management, and real-time communication during disaster events.

## Features

- **Real-time Emergency Alerts**: Live monitoring and notification system
- **Resource Coordination**: Track and manage emergency resources (ambulances, drones, rescue teams)
- **Citizen SOS System**: Direct communication channel for citizens in distress
- **AI Decision Assistant**: Intelligent recommendations for emergency response
- **Interactive Maps**: Real-time visualization of disaster zones and resources
- **Multi-role Access**: Support for citizens, volunteers, and officials

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React hooks and context
- **Real-time Communication**: WebSockets
- **Maps**: Interactive mapping components
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API server running (see backend README)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd resilience-hub
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Important:** make sure the backend URL is reachable from the browser.  
   In a local setup the default `VITE_API_BASE` points to `http://localhost:8000`.  
   In GitHub Codespaces the easiest approach is to run the helper script from the
   repository root:
   ```bash
   python3 ../start-all.py
   ```
   which will start both servers and forward the backend port for you.  
   Alternatively forward port 8000 manually in the Ports panel or set
   `VITE_API_BASE` to the appropriate preview URL (e.g. `https://<your>-8000.githubpreview.dev`).

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the forwarded preview URL).

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── dashboard/      # Dashboard-specific components
│   └── ...
├── pages/              # Page components
├── services/           # API service functions
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
└── types/              # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env` file with the following variables:

```env
VITE_API_BASE=http://localhost:8000
VITE_MAP_API_KEY=your_map_api_key
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the Disaster Response System and is licensed under the MIT License.
