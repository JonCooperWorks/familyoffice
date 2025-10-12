# Family Office Research - Desktop GUI

A beautiful desktop application for the Family Office stock research agent.

## Features

- **Research Tab**: Generate comprehensive stock research reports
- **Chat Tab**: Interactive AI conversations about stocks
- **Reports Tab**: Browse and manage all generated reports
- **Dependency Checker**: Automatic detection and guided setup for Docker, Codex, and dependencies
- **Docker Isolation**: Maintains security through containerized execution

## Prerequisites

The app will guide you through installing:
- Docker Desktop
- Codex CLI
- npm packages (auto-installed)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build Electron main process
npm run build:electron

# Build everything and package
npm run dist
```

## Building for Distribution

```bash
# Create macOS .dmg installer
npm run dist
```

The packaged app will be in the `release/` directory.

## Usage

1. Launch the app
2. If dependencies are missing, follow the guided setup
3. Use the tabs to research stocks, chat, or view reports
4. All reports are saved in `../reports/` directory

## Tech Stack

- Electron - Desktop framework
- React + TypeScript - UI layer
- Vite - Build tool
- Inter font - Typography

