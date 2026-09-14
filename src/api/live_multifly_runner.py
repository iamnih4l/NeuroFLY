import sys
import json
import argparse
import networkx as nx
import os
import random

from src.api.youtube_provider import YouTubeLiveProvider
from src.analysis.sensory_encoder import SemanticEncoder
from src.state.neuro_state import NeuroStateManager
from src.analysis.circuit_extraction import CircuitExtractor
from src.simulation import NeuroFlySimulator
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.request

# Global state for daemon
global_simulators = {}
global_G_real = None

def init_simulators(body_id: int):
    global global_simulators, global_G_real
    if global_G_real is None:
        print("Extracting circuit...")
        extractor = CircuitExtractor()
        circuit_data = extractor.extract_circuit(body_id)
        
        global_G_real = nx.DiGraph()
        for n in circuit_data['nodes']:
            global_G_real.add_node(n['id'], type=n['type'], role=n['role'])
        for e in circuit_data['edges']:
            global_G_real.add_edge(e['source'], e['target'], weight=e['weight'])
            
    for topic_id in [101, 102, 103]:
        if topic_id not in global_simulators:
            print(f"Initializing simulator for fly {topic_id}...")
            global_simulators[topic_id] = NeuroFlySimulator(global_G_real)

def run_multifly_step(body_id: int):
    global global_simulators
    if not global_simulators:
        init_simulators(body_id)
    # 1. Prepare 3 distinct topics
    topics = [
        {"id": 101, "query": "sports live", "name": "SPORTS"},
        {"id": 102, "query": "breaking news live", "name": "NEWS"},
        {"id": 103, "query": "science space live", "name": "SCIENCE"}
    ]
    
    results = []
    provider = YouTubeLiveProvider()
    
    for topic in topics:
        # Override query
        provider.query = topic["query"]
        items = provider.fetch_latest(limit=1)
        if not items:
            results.append({"error": f"No input available for {topic['name']}"})
            continue
            
        news_item = items[0]
        
        # State & History
        # Use isolated multifly db
        db_path = 'data/multifly.db'
        state_manager = NeuroStateManager(db_path=db_path, instance_id=topic["id"])
        history_hashes = state_manager.get_history_hashes()
        
        # Extract features
        semantic_features = SemanticEncoder.extract_features(news_item.to_dict(), global_history_hashes=history_hashes)
        
        visual_features = {
            'brightness': random.uniform(0.3, 0.7),
            'contrast': random.uniform(0.3, 0.7),
            'color_diversity': random.uniform(0.3, 0.7),
            'edge_density': random.uniform(0.3, 0.7),
            'visual_complexity': random.uniform(0.3, 0.7)
        }
        
        features = {**semantic_features, **visual_features}
        features['source_type'] = "multimodal" if getattr(news_item, 'embed_url', None) else "text"
        features['timestamp'] = __import__('time').time()
        features['analysis_input_available'] = False
        features['topic_name'] = topic["name"]
        features['topic_id'] = topic["id"]
        
        # Run Simulation
        current_state = state_manager.current_state
        adaptation = current_state.get('adaptation', 0.0)
        habituation = current_state.get('habituation', 0.0)
        
        base_drive = features.get('brightness', 0.5) * 60.0
        background_drive = max(10.0, base_drive - (adaptation * 15.0))
        
        sim = global_simulators[topic["id"]]
        kc_count = len(sim.kc_indices)
        active_kcs = []
        if kc_count > 0:
            complexity = features.get('visual_complexity', 0.5) * 0.5 + features.get('semantic_complexity', 0.5) * 0.5
            habituated_complexity = max(0.05, complexity * (1.0 - (habituation * 0.5)))
            num_active = int(habituated_complexity * kc_count)
            
            random.seed(int(features['novelty'] * 1000) + topic["id"])
            active_kcs = random.sample(sim.kc_indices, min(num_active, kc_count))
            
        stim_dict = {
            'active_kc_indices': active_kcs,
            'pam_stimulus': 0.0,
            'ppl1_stimulus': 0.0
        }
        
        sim_result = sim.apply_stimulus_and_run(stim_dict, duration_ms=150, background_drive_mv=background_drive)
        
        # Update state
        new_state = state_manager.process_exposure(news_item.to_dict(), features, sim_result)
        
        results.append({
            "fly_id": topic["id"],
            "topic_name": topic["name"],
            "news_item": news_item.to_dict(),
            "features": features,
            "neuro_state": new_state,
            "simulation": {
                "total_spikes": int(sim_result.get('total_spikes', 0)),
                "active_neurons": int(sim_result.get('active_neurons', 0)),
                "active_neuron_ids": sim_result.get('active_neuron_ids', []),
                "duration_ms": float(sim_result.get('window_duration_ms', 0.0) * 3)
            }
        })
        
    return results

class MultiFlyDaemon(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            res = run_multifly_step(125080)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', type=str, required=True, choices=['step', 'daemon'])
    parser.add_argument('--bodyId', type=int, default=125080)
    args = parser.parse_args()
    
    try:
        env_path = os.path.join(os.path.dirname(__file__), '../../.env')
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        k, v = line.strip().split('=', 1)
                        v = v.strip('"\'')
                        os.environ[k] = v
    except:
        pass
        
    if args.action == 'step':
        print(json.dumps(run_multifly_step(args.bodyId)))
    elif args.action == 'daemon':
        init_simulators(args.bodyId)
        server = HTTPServer(('127.0.0.1', 3002), MultiFlyDaemon)
        print("MultiFly Daemon listening on port 3002...")
        server.serve_forever()
