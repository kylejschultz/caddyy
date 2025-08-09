# Caddyy

> Simple, opinionated media library management

## Overview

Caddyy is a lightweight media manager for personal libraries. It helps you organize and track your Movies and TV shows with clean metadata, clear progress, and a modern UI. The goal is a focused alternative to current media management solutions, bringing multiple tools into one application.

### Current Features

- Plex-style libraries with multiple disks/folders per library and easy-to-spot disk usage details.
   - Allows for deeper management over seperated libraries (TV Shows 1080p/4k, Anime, Movies 1080p/4k, etc)
- Live search and metadata powered by TheTVDB provides graphics and other metadata for shows or movies

### Roadmap
- Fully integrate with Newznab downloaders and indexers
- Create quality profiles (integrated with TRaSHGuides) with automated upgrades and thresholds
- New user first-time setup wizard
- File management and post-processing (custom/default naming conventions)
- Docker image creation/pipelines

## Usage
### Installation
Currently, there is no full deployment mechanism. Follow the steps in Development Setup below to run the application locally. Once the Docker image has been created, this section will contain both Docker and Docker Compose instructions.

### Initial Configuration

1. Add your TMDB API key in Settings → General
2. Create one or more Libraries in Settings → Libraries, adding folders (disks) to each
3. Pick a theme (System, Light, or Dark)

> A first-time user wizard will be created to walk through the basic steps of intitial configuration.

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm/yarn

### Quick Start

1. **Clone and setup**:
   ```bash
   git clone https://github.com/kylejschultz/caddyy
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

## Contributing

This project follows clean code principles and incremental development:

1. **Small, focused commits**: Each commit should represent a complete, working feature
2. **Modular design**: Components should be loosely coupled and highly cohesive
3. **Test as you go**: Validate functionality before moving to the next feature
4. **Documentation**: Keep README and code documentation up to date

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
