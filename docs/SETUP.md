# NeuroFly Setup Guide

This document explains how to configure and run the NeuroFly project locally.

## 1. Prerequisites

- **Python:** 3.10 or higher.
- **Node.js:** v18 or higher.
- **npm:** 9.0 or higher.
- **Git:** for cloning the repository.
- **OS:** Windows / Linux / macOS (Windows uses PowerShell for commands).

## 2. Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/iamnih4l/NeuroFLY.git
   cd NeuroFLY
   ```

2. **Set up the Python Backend:**
   Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Set up the Node.js Frontend:**
   Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

## 3. Configuration & Environment Variables

Copy `.env.example` to `.env` in the root of the project:

```bash
cp .env.example .env
```

**Environment Variables:**

| Variable | Purpose | Required? | Example |
|---|---|---|---|
| `NEUROFLY_ENV` | Sets execution context (development/production). If `development`, uses mock fixtures instead of real data. | Optional | `development` |
| `YOUTUBE_API_KEY` | Fetches live video titles and thumbnails. | Optional (falls back to mock news) | `AIzaSyB...` |
| `NEUPRINT_APPLICATION_CREDENTIALS` | Required to download the massive MaleCNS dataset for Local Mode. | Optional (for Web Mode) | `auth_token_here` |

## 4. Running NeuroFly

NeuroFly consists of a Node.js API backend and a Vite/React frontend.

1. **Start the API Backend:**
   The backend acts as the proxy for the Python simulation and database SQLite writes.
   ```bash
   cd frontend/server
   node server.js
   ```

2. **Start the Frontend:**
   In a new terminal window, run the Vite development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Verify:**
   Open your browser to `http://localhost:5173/`. You should see the immersive 3D HUD.

## 5. Local Data Acquisition (Optional)

If you wish to use **LOCAL / FULL DATA MODE**, you must download the NeuPrint chunks to your local machine.

```bash
python -m neurofly.data.download_malecns --limit 5000 --roi "MB(R)"
```
*Note: Ensure `NEUPRINT_APPLICATION_CREDENTIALS` is set in your `.env`.*
