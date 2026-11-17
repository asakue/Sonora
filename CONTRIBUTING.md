# Contributing to Sonora

Thank you for your interest in contributing to Sonora. This document outlines the guidelines and workflow for submitting issues, feature requests, and code changes.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the repository maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to ensure the problem has not already been reported.

When opening an issue, include:
- A clear, descriptive title.
- Steps to reproduce the behavior.
- Expected behavior versus actual behavior.
- Application version and operating system version.
- Relevant log output from `sonora_desktop.log` if applicable.

### Suggesting Enhancements

Feature requests are tracked as GitHub issues. When suggesting a feature:
- Clearly explain the problem or gap this feature addresses.
- Describe the proposed solution and how it fits into Sonora's architecture.
- Consider performance, user experience, and backwards compatibility.

## Development Setup

Sonora consists of two components:
1. **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Electron.
2. **Backend**: Python 3.10+, FastAPI, httpx, yt-dlp.

### Prerequisites

- Node.js 20+ and npm
- Python 3.10+
- Git

### Initializing the Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/asakue/Sonora.git
   cd Sonora
   ```

2. Set up the Python backend:
   ```bash
   cd backend
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   pip install -r requirements.txt
   cd ..
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running Locally

To start both the backend server and frontend development environment:
- On Windows: run `start-desktop.bat` or launch services separately:
  ```bash
  # Terminal 1 (Backend):
  cd backend
  python run.py

  # Terminal 2 (Frontend):
  cd frontend
  npm run dev
  ```

## Development Workflow

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or for bugfixes:
   git checkout -b fix/issue-description
   ```

2. Make your modifications following the established code style:
   - Run type checks and linters:
     ```bash
     cd frontend
     npm run build
     ```
   - Keep pull requests focused on a single responsibility.

3. Commit your changes using descriptive commit messages:
   - `feat: add feature description`
   - `fix: resolve issue with audio playback`
   - `docs: update setup instructions`
   - `refactor: simplify audio node graph`

4. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Open a Pull Request against the `main` branch of `asakue/Sonora`.

## Pull Request Guidelines

- Ensure your branch is rebased onto the latest `main`.
- Fill out the provided Pull Request template completely.
- Verify that both the frontend build and backend tests pass locally.
- Keep changes clean, without unnecessary dependencies or commented-out code.

