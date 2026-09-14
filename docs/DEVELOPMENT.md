# Development Guide

This document provides technical guidelines for developers contributing to NeuroFly.

## 1. Project Structure

NeuroFly is organized into distinct layers to separate data parsing, simulation, and visualization:

```text
NeuroFLY/
├── src/                        # Python Backend
│   ├── api/                    # Flask / Live runner scripts (Python API)
│   ├── data/                   # NeuPrint Cypher extraction & NBF generation
│   ├── simulation.py           # Brian2 SNN implementation
│   └── state/                  # SQLite State and Metrics tracking
├── frontend/                   # Frontend Application
│   ├── src/                    # React / Three.js UI Code
│   ├── server/                 # Node.js Express proxy
│   └── public/                 # Static assets
├── data/                       # Local Cache (Git-ignored)
│   ├── local_cache/            # High-res MaleCNS skeletons (.nbf, .json)
│   └── NeuroFly_Results.db     # Active Simulation SQLite database
└── docs/                       # Technical Documentation
```

## 2. Working on the Python Backend

The backend is entirely responsible for the computational state.
- **Dependencies:** We use `brian2` for simulation and `pandas`/`numpy` for data manipulation. Keep the dependencies minimal.
- **Daemons:** The multi-fly comparison uses persistent background processes (`live_multifly_runner.py --action daemon`) to keep memory states alive across HTTP polls.
- **API Contracts:** The Express server polls the Python layer. Ensure any changes to Python JSON outputs match the TypeScript interfaces in the frontend.

## 3. Working on the Frontend (WebGL / UI)

- **Renderer:** The 3D view is built with Three.js. It streams binary `.nbf` chunks to avoid JavaScript garbage collection pauses.
- **Styling:** The UI uses raw CSS (`index.css`) for high-performance cinematic styling. Avoid importing heavy CSS frameworks unless strictly necessary.
- **State:** We use lightweight React state management. The UI should always be considered a "dumb" visualizer of the backend's "smart" state.

## 4. Testing

*Currently, NeuroFly relies on manual end-to-end verification. Automated tests will be added in a future release.*

Always test your changes by running both the Python layer and the Web UI in tandem, ensuring that the 3D visualizer renders cleanly at 60 FPS without crashing during polling intervals.
