# Caddyy

> A Modern Media Management Solution

## Overview

Caddyy is a media automation application that simplifies the process of fetching and organizing media content. Designed as a simple-to-use alternative to Radarr/Sonarr.

### Key Features

- 🎬 **Unified Media Management**: Movies and TV shows with collection tracking
- 📡 **TMDB Integration**: Live search and metadata fetching with automatic matching
- 📂 **Media Import**: TRaSH Guides compatible scanning and import of existing libraries
- ⚙️ **Configuration Management**: YAML-based configuration with live validation
- 🎨 **Modern UI**: Dark/light theme support with responsive design
- 🗂️ **Path Management**: Visual directory browser with validation
- 🎯 **Simple Deployment**: Single Docker container with web UI configuration
- 🚀 **Modern Stack**: FastAPI backend + React frontend

### Planned Features
- 🔍 **Direct Indexer Integration**: Built-in Newznab-compatible indexer support
- ⬇️ **SABnzbd Integration**: Seamless download management
- 📊 **Advanced Monitoring**: Episode/season tracking and quality management

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

1. **Configure TMDB API**: Add your TMDB API key in General Settings
2. **Set Library Paths**: Configure library paths for TV Shows and Movies in their respective settings
3. **Configure Download Paths**: Set up download directories in General Settings
4. **Choose Theme**: Select your preferred theme (System, Light, or Dark)

### Importing Existing Media

**TV Shows Import**:
1. Navigate to TV Shows → Import TV Shows
2. Select library paths to scan using the pill-style selectors
3. Click "Start Import Session" to begin scanning
4. Review the import preview with automatic TMDB matching
5. Use filters to view different categories (All, Ready for Import, Need Review, etc.)
6. Manually search and select matches for shows that need review
7. Set monitoring preferences for each show (All Episodes, Future Episodes, etc.)
8. Select shows to import using the checkboxes
9. Click "Import to Collection" to complete the import

**Supported Media Structure**:
Caddyy follows TRaSH Guides naming conventions:
```
TV Shows/
├── Show Name (Year)/
│   ├── Season 01/
│   │   ├── Show Name S01E01.mkv
│   │   └── Show Name S01E02.mkv
│   └── Season 02/
│       └── Show Name S02E01.mkv
```

### Collection Management

- **View Collections**: Browse your imported media in the TV Shows and Movies pages
- **Show Details**: Click on any show to view seasons, episodes, and download status
- **Monitor Settings**: Manage monitoring preferences for automatic downloads (coming soon)

## Current Status

### ✅ Completed
- [x] Project scaffolding and structure
- [x] FastAPI backend with health endpoint
- [x] React frontend with routing and basic UI
- [x] SQLite database setup with Alembic migrations
- [x] Development environment and build process
- [x] Static file serving integration
- [x] Modern UI layout with sidebar navigation and page headers
- [x] **YAML Configuration System**: GitOps-friendly config with live validation
- [x] **Theme Support**: System/light/dark mode with persistent selection
- [x] **Reusable PathInput component** with file browser modal and validation
- [x] **Path validation utility** (client & server-side directory validation)
- [x] **General Settings**: Theme, auto-match threshold, download paths, TMDB API key
- [x] **Movies Settings**: Library path configuration with validation
- [x] **TV Shows Settings**: Library path configuration with validation
- [x] **File Browser**: Server-side directory navigation and selection
- [x] **Database Models**: Movies, TV shows, seasons, episodes with metadata tracking
- [x] **TMDB Integration**: Live search, details fetching, and metadata matching
- [x] **Media Scanner**: TRaSH Guides compatible filesystem scanning
- [x] **Media Matcher**: Intelligent TMDB matching with confidence scoring
- [x] **Import Workflow**: Complete TV show import with preview and manual matching
- [x] **Collection Management**: Database-driven TV show collections with status tracking
- [x] **Import UI**: Interactive import with filtering, sorting, and batch operations

### 🚧 In Progress
- [ ] **TV Show Detail Pages**: Season/episode management and monitoring controls
- [ ] **Movie Import Workflow**: Scanning and importing existing movie libraries
- [ ] **Collection Enhancement**: Advanced filtering, sorting, and bulk operations
- [ ] **Quality Management**: Quality profiles and upgrade tracking

### 📋 Planned
- [ ] **Indexer Integration**: Newznab-compatible search and NZB management
- [ ] **SABnzbd Integration**: Download client integration and monitoring
- [ ] **Automated Monitoring**: Episode release tracking and automatic downloads
- [ ] **File Management**: Renaming, organization, and post-processing
- [ ] **Docker Deployment**: Production-ready containerization
- [ ] **GitHub Actions CI/CD**: Automated testing and deployment
- [ ] **Music Support**: Future expansion to music libraries

## Contributing

This project follows clean code principles and incremental development:

1. **Small, focused commits**: Each commit should represent a complete, working feature
2. **Modular design**: Components should be loosely coupled and highly cohesive
3. **Test as you go**: Validate functionality before moving to the next feature
4. **Documentation**: Keep README and code documentation up to date

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
