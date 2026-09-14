import sys
import json
import argparse
import networkx as nx
import os

from src.api.news_provider import NewsFactory
from src.analysis.sensory_encoder import SemanticEncoder
from src.analysis.visual_encoder import VisualEncoder
from src.state.neuro_state import NeuroStateManager
from src.analysis.circuit_extraction import CircuitExtractor
from src.simulation import NeuroFlySimulator

def run_watch_step(body_id: int):
    # 1. Fetch News from Cache
    from src.state.news_cache import NewsCacheManager
    cache = NewsCacheManager()
    news_item = cache.get_current_article()
    
    if not news_item:
        print(json.dumps({"error": "No cached news items available."}))
        return
    
    # 2. Get State & History Hashes
    state_manager = NeuroStateManager()
    history_hashes = state_manager.get_history_hashes()
    
    # 3. Extract Sensory Features
    semantic_features = SemanticEncoder.extract_features(news_item, global_history_hashes=history_hashes)
    
    # We explicitly do not have live video frame analysis for YouTube Live right now.
    visual_features = {
        'brightness': 0.5,
        'contrast': 0.5,
        'color_diversity': 0.5,
        'edge_density': 0.5,
        'visual_complexity': 0.5
    }
    
    # Unified Sensory State
    features = {**semantic_features, **visual_features}
    
    # Add source type based on presence of embed URL
    features['source_type'] = "multimodal" if news_item.get('embed_url') else "text"
    features['timestamp'] = __import__('time').time()
    features['analysis_input_available'] = False
    
    # 4. Extract Real Circuit (MaleCNS)
    extractor = CircuitExtractor()
    circuit_data = extractor.extract_circuit(body_id)
    
    G_real = nx.DiGraph()
    for n in circuit_data['nodes']:
        G_real.add_node(n['id'], type=n['type'], role=n['role'])
    for e in circuit_data['edges']:
        G_real.add_edge(e['source'], e['target'], weight=e['weight'])
        
    # 5. Run Computational Simulation
    # Map features to biological drive, modulated by Persistent State
    # Adaptation reduces overall background drive (transient fatigue)
    # Habituation reduces the number of recruited KCs (long-term tuning)
    
    current_state = state_manager.current_state
    adaptation = current_state.get('adaptation', 0.0)
    habituation = current_state.get('habituation', 0.0)
    
    # We scale base_drive up slightly to ensure neurons can reach V_THRESH (-50mV) from V_REST (-70mV)
    base_drive = features.get('brightness', 0.5) * 60.0 # 0 to 60 mV
    background_drive = max(0.0, base_drive - (adaptation * 15.0))
    # Guarantee at least some background drive so spontaneous activity occurs
    background_drive = max(10.0, background_drive)
    
    # Select KCs based on complexity hash
    sim = NeuroFlySimulator(G_real)
    kc_count = len(sim.kc_indices)
    active_kcs = []
    if kc_count > 0:
        # Pseudo-randomly activate KCs based on visual complexity or semantic complexity
        complexity = features.get('visual_complexity', 0.5) * 0.5 + features.get('semantic_complexity', 0.5) * 0.5
        
        # Habituation suppresses KC recruitment
        habituated_complexity = max(0.05, complexity * (1.0 - (habituation * 0.5)))
        num_active = int(habituated_complexity * kc_count)
        
        # Select them deterministically based on novelty score to represent a "pattern"
        import random
        random.seed(int(features['novelty'] * 1000))
        active_kcs = random.sample(sim.kc_indices, min(num_active, kc_count))
        
    stim_dict = {
        'active_kc_indices': active_kcs,
        'pam_stimulus': 0.0,
        'ppl1_stimulus': 0.0
    }
    
    # Run Brian2 Model
    sim_result = sim.apply_stimulus_and_run(stim_dict, duration_ms=150, background_drive_mv=background_drive)
    
    # 6. Update Persistent State
    new_state = state_manager.process_exposure(news_item, features, sim_result)
    
    # 7. Output result
    # We fetch the actual exposure_id assigned by the cache
    import sqlite3
    conn = sqlite3.connect('data/results.db')
    c = conn.cursor()
    c.execute('SELECT exposure_id_counter FROM news_metadata WHERE id = 1')
    exp_id = c.fetchone()[0]
    conn.close()
    
    output = {
        "exposure_id": f"EXPOSURE #{exp_id:03d}",
        "news_item": dict(news_item),
        "features": features,
        "neuro_state": new_state,
        "simulation": {
            "total_spikes": int(sim_result.get('total_spikes', 0)),
            "active_neurons": int(sim_result.get('active_neurons', 0)),
            "duration_ms": float(sim_result.get('window_duration_ms', 0.0) * 3)
        }
    }
    
    print(json.dumps(output))

def run_get_history():
    state_manager = NeuroStateManager()
    history = state_manager.get_history(limit=50)
    print(json.dumps(history))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', type=str, required=True, choices=['step', 'history'])
    parser.add_argument('--bodyId', type=int, default=125080)
    args = parser.parse_args()
    
    try:
        # Load .env manually if needed (python-dotenv might not be installed)
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
        run_watch_step(args.bodyId)
    elif args.action == 'history':
        run_get_history()
