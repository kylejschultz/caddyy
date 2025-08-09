# Caddyy

> Simple, opinionated media library management

## Overview

Caddyy is a lightweight media manager for personal libraries. It helps you organize and track your Movies and TV shows with clean metadata, clear progress, and a modern UI. The goal is a focused alternative to the “do everything” tools — fast to set up, easy to live with.

What Caddyy does today:
- Organize per-library collections for Movies and TV
- Fetch rich metadata from TMDB (titles, posters, networks, status)
- Show progress (episodes downloaded vs total), sizes, and disk usage
- Provide a fast, polished UI with search, cards/table views, sorting, and flexible columns

### Key Features

- Libraries with folders: multiple libraries, each with one or more folders (disks), with usage at a glance
- Collections: Movies and TV with status, progress, networks, and sizes
- TMDB integration: live search and metadata
- Modern UI: dark/light theme, responsive, keyboard-friendly
- File browser: server-side directory browser with validation
- Config: YAML-based configuration with live validation
- Stack: FastAPI backend + React/TypeScript frontend

### Planned Features
- Indexer integration: Newznab-compatible search
- SABnzbd integration: download client support
- Quality/monitoring: profiles, upgrades, and smarter monitoring

## Tech Stack

### Backend
- **FastAPI**: Modern, async Python web framework
- **SQLAlchemy**: Database ORM with SQLite
- **Pydantic**: Data validation and settings
- **HTTPX**: Async HTTP client for external APIs

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Server state management

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm/yarn

### Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repo-url>
   cd caddyy
   ```

2. **Install dependencies**:
   ```bash
   # Backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -e .
   
   # Frontend
   cd frontend
   npm install
   cd ..
   ```

3. **Start development servers**:
   ```bash
   ./dev.sh
   ```

The `dev.sh` script will:
- Start the FastAPI backend on `http://localhost:8000`
- Start the Vite frontend dev server on `http://localhost:3000`
- Provide hot-reload for both frontend and backend changes
- Display health status and useful URLs

### Manual Development

If you prefer to run services separately:

**Backend**:
```bash
source venv/bin/activate
python -m backend.main
# Serves on http://localhost:8000
# API docs: http://localhost:8000/docs
```

**Frontend**:
```bash
cd frontend
npm run dev
# Serves on http://localhost:3000
```

**Production Build**:
```bash
cd frontend
npm run build
# Builds to ../backend/static/
```

## Usage

### Initial Configuration

1. Add your TMDB API key in Settings → General
2. Create one or more Libraries in Settings → Libraries, adding folders (disks) to each
3. Pick a theme (System, Light, or Dark)

### What you can do right now
- Browse per-library collections (cards or table), search, and sort
- Open TV show or movie detail pages with rich metadata
- See disk usage per folder and collection sizes
- Add TV shows via TMDB search (early flows; subject to change)

> Note: collection management and import flows are evolving. Detailed guides will return once they stabilize.

## Current Status

### In Progress
- Library-centric UI (per-library views, folders/disks, usage)
- TV collection flows and detail pages
- Movie collection and import flows

### Planned
- Indexer integration (Newznab-compatible) and download client (SABnzbd)
- Quality profiles, upgrades, and smarter monitoring
- File management (rename/organize) and post-processing
- Docker images and CI/CD

## Contributing

This project follows clean code principles and incremental development:

1. **Small, focused commits**: Each commit should represent a complete, working feature
2. **Modular design**: Components should be loosely coupled and highly cohesive
3. **Test as you go**: Validate functionality before moving to the next feature
4. **Documentation**: Keep README and code documentation up to date

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
