# Caddyy

> A Modern Media Management Solution

## Overview

Caddyy is a media automation application that simplifies the process of fetching and organizing media content. Designed as a simple-to-use alternative to Radarr/Sonarr.

### Key Features (Planned)

- 🎬 **Unified Media Management**: Movies and TV shows 
- 🔍 **Direct Indexer Integration**: Built-in Newznab-compatible indexer support
- 📡 **TMDB Integration**: Automatic metadata fetching and organization
- ⬇️ **SABnzbd Integration**: Seamless download management
- 🎯 **Simple Deployment**: Single Docker container with web UI configuration
- 🚀 **Modern Stack**: FastAPI backend + React frontend

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

## Current Status

### ✅ Completed
- [x] Project scaffolding and structure
- [x] FastAPI backend with health endpoint
- [x] React frontend with routing and basic UI
- [x] SQLite database setup with Alembic migrations
- [x] Development environment and build process
- [x] Static file serving integration
- [x] Modern UI layout with sidebar navigation and page headers
- [x] Settings management interface with validation
- [x] **Reusable PathInput component** with file browser modal and validation
- [x] **Path validation utility** (client & server-side directory validation)
- [x] **General Settings**: Theme, logging, authentication, timezone, TMDB API key
- [x] **Download Paths Management**: Add/edit/delete with validation and browse functionality
- [x] **Movies Settings**: Library path configuration with validation
- [x] **TV Shows Settings**: Library path configuration with validation
- [x] File browser component with directory navigation
- [x] Filesystem API for browsing server directories
- [x] Collection system backend (models, API, services)
- [x] Database models for movies, TV shows, and collections

### 🚧 In Progress
- [ ] Docker containerization (framework complete, testing pending)
- [ ] Library import/scanning workflow for existing media
- [ ] TMDB API integration for metadata fetching
- [ ] Indexer management system
- [ ] Search functionality
- [ ] Download queue management

### 📋 Planned
- [ ] SABnzbd integration
- [ ] File watching and post-processing
- [ ] GitHub Actions CI/CD
- [ ] Music support (future)

## Contributing

This project follows clean code principles and incremental development:

1. **Small, focused commits**: Each commit should represent a complete, working feature
2. **Modular design**: Components should be loosely coupled and highly cohesive
3. **Test as you go**: Validate functionality before moving to the next feature
4. **Documentation**: Keep README and code documentation up to date

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
