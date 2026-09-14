import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Fix DB path resolving to root
const dbPath = path.resolve(__dirname, '../../data/results.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log(`Connected to results.db at ${dbPath}`);
  }
});

// Helper to parse JSON from DB
const parseJSON = (row, field) => {
  if (row && row[field]) {
    try {
      row[field] = JSON.parse(row[field]);
    } catch (e) {
      console.warn(`Failed to parse ${field} for row:`, row);
    }
  }
  return row;
};

// Global Probe State Cache
let lastProbeStatus = 'UNKNOWN';
let lastDataReady = 'UNKNOWN';
let lastModelReady = 'UNKNOWN';
let lastExperimentReady = 'UNKNOWN';
let isProbing = false;

// 1. Get latest experiment
app.get('/api/experiments/latest', (req, res) => {
  db.get('SELECT * FROM experiments ORDER BY timestamp DESC LIMIT 1', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(parseJSON(row, 'manifest') || null);
  });
});

// 2. Get nodes for an experiment
app.get('/api/graph/nodes', (req, res) => {
  const expId = req.query.experiment_id;
  if (!expId) return res.status(400).json({ error: 'Missing experiment_id parameter' });
  
  db.all('SELECT * FROM neurons WHERE experiment_id = ?', [expId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const nodes = rows.map(r => {
      let parsed = parseJSON(r, 'provenance');
      return parseJSON(parsed, 'skeleton');
    });
    res.json(nodes);
  });
});

// 3. Get edges for an experiment
app.get('/api/graph/edges', (req, res) => {
  const expId = req.query.experiment_id;
  if (!expId) return res.status(400).json({ error: 'Missing experiment_id parameter' });
  
  db.all('SELECT * FROM connections WHERE experiment_id = ?', [expId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const edges = rows.map(r => {
      let parsed = parseJSON(r, 'provenance');
      return parseJSON(parsed, 'synapse_locations');
    });
    res.json(edges);
  });
});

// 4. Get latest metrics timeline for an experiment
app.get('/api/metrics', (req, res) => {
  const expId = req.query.experiment_id;
  if (!expId) return res.status(400).json({ error: 'Missing experiment_id parameter' });
  
  db.all('SELECT * FROM metrics WHERE experiment_id = ? ORDER BY epoch ASC', [expId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 5. Trigger/Check Live Probe Status
app.get('/api/status', (req, res) => {
  const isFixture = process.env.NEUROFLY_ENV === 'development';
  if (isFixture) {
    return res.json({ status: 'DEVELOPMENT_FIXTURE', scientific_execution_allowed: false });
  }

  // If already probing, return last known to avoid hammer
  if (isProbing) {
    return res.json({ 
      status: lastProbeStatus, 
      scientific_execution_allowed: lastProbeStatus === 'READY',
      DATA_READY: lastDataReady,
      MODEL_READY: lastModelReady,
      EXPERIMENT_READY: lastExperimentReady
    });
  }

  isProbing = true;
  // Note: For windows compatibility and correct pathing we run python from venv
  const pythonCmd = process.platform === 'win32' 
    ? 'venv\\Scripts\\python.exe -m src.scientific_readiness'
    : 'venv/bin/python -m src.scientific_readiness';
    
  exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
    isProbing = false;
    try {
      const jsonMatch = stdout.match(/\{\s*"scientific_execution"[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        lastProbeStatus = result.scientific_execution;
        lastDataReady = result.DATA_READY || 'UNKNOWN';
        lastModelReady = result.MODEL_READY || 'UNKNOWN';
        lastExperimentReady = result.EXPERIMENT_READY || 'UNKNOWN';
      } else {
        lastProbeStatus = 'UNKNOWN_ERROR';
      }
    } catch (e) {
      lastProbeStatus = 'PARSE_ERROR';
    }
    
    res.json({ 
      status: lastProbeStatus, 
      scientific_execution_allowed: lastProbeStatus === 'READY',
      DATA_READY: lastDataReady,
      MODEL_READY: lastModelReady,
      EXPERIMENT_READY: lastExperimentReady
    });
  });
});

// 6. Data Provenance Contract
app.get('/api/provenance', (req, res) => {
  const isFixture = process.env.NEUROFLY_ENV === 'development';
  
  if (isFixture) {
    res.json({
      source_type: 'DEVELOPMENT FIXTURE',
      dataset_version: 'N/A',
      data_provenance: 'Synthetically generated for UI testing',
      biological_status: 'FAKE DATA - NOT BIOLOGICAL',
      simulation_status: 'Mock graph',
      confidence: 'ZERO',
      assumptions: 'None',
      isFixture: true,
      probe_status: 'DEVELOPMENT_FIXTURE'
    });
  } else {
    res.json({
      source_type: 'Google/HHMI Janelia Connectome',
      dataset_version: 'male-cns:v1.0',
      data_provenance: 'NeuPrint API (gs://flyem-male-cns/v1.0/)',
      biological_status: 'Verified structural data',
      simulation_status: 'Model-derived (Brian2 LIF)',
      confidence: 'HIGH (Structure) / ASSUMED (Dynamics)',
      assumptions: 'Uniform tau_m, Linear synaptic weight mapping',
      isFixture: false,
      probe_status: lastProbeStatus
    });
  }
});

// 7. Local Mode Endpoints
app.get('/api/local/manifest', (req, res) => {
  const manifestPath = path.resolve(__dirname, '../../data/local_cache/manifest.json');
  if (fs.existsSync(manifestPath)) {
    res.sendFile(manifestPath);
  } else {
    res.status(404).json({ error: "Local cache not found." });
  }
});

// Legacy JSON endpoints
app.get('/api/local/nodes', (req, res) => {
  const p = path.resolve(__dirname, '../../data/local_cache/nodes.json');
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).json({ error: "Nodes not found." });
});

app.get('/api/local/skeletons', (req, res) => {
  const p = path.resolve(__dirname, '../../data/local_cache/skeletons.json');
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).json({ error: "Skeletons not found." });
});

// New Binary Chunk Endpoints
app.get('/api/local/chunks', (req, res) => {
  const manifestPath = path.resolve(__dirname, '../../data/local_cache/manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      res.json(manifest.chunks || []);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse manifest" });
    }
  } else {
    res.status(404).json({ error: "Local cache not found." });
  }
});

app.get('/api/local/chunks/:id', (req, res) => {
  // ensure no directory traversal
  const safeId = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const p = path.resolve(__dirname, `../../data/local_cache/${safeId}.nbf`);
  if (fs.existsSync(p)) {
    // Send binary
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(p);
  } else {
    res.status(404).json({ error: "Chunk not found." });
  }
});

// 8. Scientific Analysis Endpoints
app.get('/api/analysis/dopaminergic-neurons', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  db.all('SELECT * FROM dopaminergic_neurons LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const nodes = rows.map(r => parseJSON(r, 'provenance'));
    res.json(nodes);
  });
});

app.get('/api/analysis/circuit/:bodyId', (req, res) => {
  const bodyId = req.params.bodyId;
  if (!bodyId) return res.status(400).json({ error: 'Missing bodyId' });
  
  const sendCircuit = () => {
    db.get('SELECT * FROM circuits WHERE body_id = ?', [bodyId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Circuit not found after extraction." });
      
      db.get('SELECT * FROM circuit_metrics WHERE body_id = ?', [bodyId], (merr, mrow) => {
        const result = {
          body_id: row.body_id,
          nodes: parseJSON(row, 'nodes_json').nodes_json,
          edges: parseJSON(row, 'edges_json').edges_json,
          provenance: parseJSON(row, 'provenance').provenance,
          metrics: mrow ? parseJSON(mrow, 'metrics_json').metrics_json : null,
          last_updated: row.last_updated
        };
        res.json(result);
      });
    });
  };

  // Check cache first
  db.get('SELECT body_id FROM circuits WHERE body_id = ?', [bodyId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      return sendCircuit();
    }
    
    // Not cached, spawn Python to extract
    console.log(`Extracting circuit for ${bodyId} via Python...`);
    const pythonCmd = process.platform === 'win32' 
      ? `venv\\Scripts\\python.exe src/analysis/circuit_extraction.py --bodyId ${bodyId}`
      : `venv/bin/python src/analysis/circuit_extraction.py --bodyId ${bodyId}`;
      
    exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to extract circuit" });
      }
      sendCircuit();
    });
  });
});

app.post('/api/analysis/experiment/:bodyId', (req, res) => {
  const bodyId = req.params.bodyId;
  if (!bodyId) return res.status(400).json({ error: 'Missing bodyId' });
  
  console.log(`Running dopamine modulation experiment on ${bodyId}...`);
  const pythonCmd = process.platform === 'win32' 
    ? `venv\\Scripts\\python.exe src/experiments/dopamine_modulation_experiment.py --bodyId ${bodyId}`
    : `venv/bin/python src/experiments/dopamine_modulation_experiment.py --bodyId ${bodyId}`;
    
  exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
    if (error) {
      console.error(stderr);
      return res.status(500).json({ error: "Failed to run experiment" });
    }
    try {
      // Find the JSON block at the end
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const result = JSON.parse(lastLine);
      res.json(result);
    } catch (e) {
      console.error("Failed to parse experiment output", stdout);
      res.status(500).json({ error: "Failed to parse experiment output" });
    }
  });
});

app.get('/api/research/cohort', (req, res) => {
  db.all('SELECT * FROM research_cohort', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) {
      // Extract first if empty
      console.log('Cohort empty, extracting via Python...');
      const pythonCmd = process.platform === 'win32' 
        ? `venv\\Scripts\\python.exe src/experiments/cohort_selection.py`
        : `venv/bin/python src/experiments/cohort_selection.py`;
        
      exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../../'), PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
        db.all('SELECT * FROM research_cohort', [], (err, newRows) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(newRows.map(r => parseJSON(r, 'metadata').metadata));
        });
      });
    } else {
      res.json(rows.map(r => parseJSON(r, 'metadata').metadata));
    }
  });
});

app.post('/api/research/run/:bodyId', (req, res) => {
  const bodyId = req.params.bodyId;
  const replicates = req.query.replicates || 10;
  if (!bodyId) return res.status(400).json({ error: 'Missing bodyId' });
  
  console.log(`Running research experiment on ${bodyId} with ${replicates} replicates...`);
  const pythonCmd = process.platform === 'win32' 
    ? `venv\\Scripts\\python.exe src/experiments/research_experiment_runner.py --bodyId ${bodyId} --replicates ${replicates}`
    : `venv/bin/python src/experiments/research_experiment_runner.py --bodyId ${bodyId} --replicates ${replicates}`;
    
  exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../../'), PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
    if (error) {
      console.error(stderr);
      return res.status(500).json({ error: "Failed to run experiment", details: stderr });
    }
    try {
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const result = JSON.parse(lastLine);
      res.json(result);
    } catch (e) {
      console.error("Failed to parse experiment output", stdout);
      res.status(500).json({ error: "Failed to parse experiment output" });
    }
  });
});

// 9. Watch Mode Endpoints
app.get('/api/watch/step', (req, res) => {
  const bodyId = req.query.bodyId || 125080;
  console.log(`Watch mode: executing step on bodyId ${bodyId}...`);
  const pythonCmd = process.platform === 'win32' 
    ? `venv\\Scripts\\python.exe src/api/live_watch_runner.py --action step --bodyId ${bodyId}`
    : `venv/bin/python src/api/live_watch_runner.py --action step --bodyId ${bodyId}`;
    
  exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../../'), PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
    if (error) {
      console.error(stderr);
      return res.status(500).json({ error: "Failed to execute watch step" });
    }
    try {
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const result = JSON.parse(lastLine);
      res.json(result);
    } catch (e) {
      console.error("Failed to parse watch output", stdout);
      res.status(500).json({ error: "Failed to parse watch output" });
    }
  });
});

let multiflyDaemon = null;

app.get('/api/watch/multifly_step', (req, res) => {
  const bodyId = req.query.bodyId || 125080;
  console.log(`Watch mode: executing MULTI-FLY step on bodyId ${bodyId}...`);
  
  const ensureDaemon = () => {
    return new Promise((resolve) => {
      if (multiflyDaemon) return resolve();
      
      console.log("Starting multifly daemon...");
      const pythonCmd = process.platform === 'win32' ? 'venv\\Scripts\\python.exe' : 'venv/bin/python';
      multiflyDaemon = spawn(pythonCmd, ['src/api/live_multifly_runner.py', '--action', 'daemon', '--bodyId', bodyId], {
        cwd: path.resolve(__dirname, '../../'),
        env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../../'), PYTHONUTF8: '1' }
      });
      
      multiflyDaemon.stdout.on('data', data => {
        const out = data.toString();
        console.log("DAEMON:", out);
        if (out.includes("listening")) {
          resolve();
        }
      });
      
      multiflyDaemon.stderr.on('data', data => console.error("DAEMON ERR:", data.toString()));
      multiflyDaemon.on('close', () => { multiflyDaemon = null; });
    });
  };

  ensureDaemon().then(() => {
    fetch('http://127.0.0.1:3002/')
      .then(r => r.json())
      .then(data => res.json(data))
      .catch(err => {
         console.error("Failed to fetch from daemon", err);
         res.status(500).json({ error: "Failed to parse multifly watch output" });
      });
  });
});

app.get('/api/watch/history', (req, res) => {
  const pythonCmd = process.platform === 'win32' 
    ? `venv\\Scripts\\python.exe src/api/live_watch_runner.py --action history`
    : `venv/bin/python src/api/live_watch_runner.py --action history`;
    
  exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../../'), PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
    if (error) {
      console.error(stderr);
      return res.status(500).json({ error: "Failed to fetch watch history" });
    }
    try {
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const result = JSON.parse(lastLine);
      res.json(result);
    } catch (e) {
      console.error("Failed to parse watch history", stdout);
      res.status(500).json({ error: "Failed to parse watch history" });
    }
  });
});



app.get('/api/connectome/status', (req, res) => {
  res.json({
    "dataset": "male-cns:v1.0",
    "population_complete": false,
    "morphology_complete": false,
    "connectivity_available": true,
    "rendering_complete": false,
    "notes": "Currently using local DB cache subset (Mushroom Body). Full soma extraction script exists but requires NEUPRINT_TOKEN to execute."
  });
});

app.get('/api/news/current', (req, res) => {
  const pythonCmd = process.platform === 'win32' 
    ? `venv\\Scripts\\python.exe src/api/news_cli.py --action current`
    : `venv/bin/python src/api/news_cli.py --action current`;
    
  exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../../'), PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ status: "UNAVAILABLE", error: stderr || error.message });
    }
    try {
      const items = JSON.parse(stdout.trim().split('\n').pop());
      if (items && items.length > 0) {
        res.json({
          status: items[0].is_demo ? "DEMO" : "LIVE",
          provider: items[0].is_demo ? "MockNewsProvider" : "YouTubeLiveProvider",
          article: items[0]
        });
      } else {
        res.json({ status: "UNAVAILABLE", error: "No news returned" });
      }
    } catch (e) {
      res.status(500).json({ status: "UNAVAILABLE", error: "Parse error" });
    }
  });
});

app.get('/api/news/status', (req, res) => {
  const pythonCmd = process.platform === 'win32' 
    ? `venv\\Scripts\\python.exe src/api/news_cli.py --action status`
    : `venv/bin/python src/api/news_cli.py --action status`;
    
  exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../../'), PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
    try {
      const result = JSON.parse(stdout.trim().split('\n').pop());
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Parse error" });
    }
  });
});

app.post('/api/news/refresh', (req, res) => {
  const pythonCmd = process.platform === 'win32' 
    ? `venv\\Scripts\\python.exe src/api/news_cli.py --action refresh`
    : `venv/bin/python src/api/news_cli.py --action refresh`;
    
  exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../../'), PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
    try {
      const result = JSON.parse(stdout.trim().split('\n').pop());
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Parse error" });
    }
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`NeuroFly API server running on port ${PORT}`);
  
  // Trigger initial probe on boot if not in dev mode
  if (process.env.NEUROFLY_ENV !== 'development') {
    console.log("Triggering initial live data probe...");
    isProbing = true;
    const pythonCmd = process.platform === 'win32' 
      ? 'venv\\Scripts\\python.exe -m src.scientific_readiness'
      : 'venv/bin/python -m src.scientific_readiness';
      
    exec(pythonCmd, { cwd: path.resolve(__dirname, '../../'), env: { ...process.env, PYTHONUTF8: '1' } }, (error, stdout, stderr) => {
      isProbing = false;
      try {
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          lastProbeStatus = result.scientific_execution;
        } else {
          lastProbeStatus = 'UNKNOWN_ERROR';
        }
      } catch (e) {
        lastProbeStatus = 'PARSE_ERROR';
      }
      console.log(`Live data probe result: ${lastProbeStatus}`);
    });
  }
});
