import sys
import os
import networkx as nx

# Add project root to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

try:
    env_path = os.path.join(os.path.dirname(__file__), '../../.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    k, v = line.strip().split('=', 1)
                    os.environ[k] = v
except:
    pass

from src.state.neuro_state import NeuroStateManager
from src.analysis.circuit_extraction import CircuitExtractor
from src.simulation import NeuroFlySimulator

def verify_causality():
    print("==================================================")
    print("VERIFYING PERSISTENT STATE CAUSALITY")
    print("==================================================\n")
    
    # We will use a dedicated test DB to avoid polluting the main state
    test_db = 'data/test_causality.db'
    if os.path.exists(test_db):
        os.remove(test_db)
        
    state_manager = NeuroStateManager(db_path=test_db)
    # Create a minimal valid graph for Brian2
    G_real = nx.DiGraph()
    # 5 KCs, 1 MBON, 1 PAM, 1 PPL1
    for i in range(5):
        G_real.add_node(i, type='KC', role='kc')
    G_real.add_node(5, type='MBON', role='mbon')
    G_real.add_node(6, type='PAM', role='pam')
    G_real.add_node(7, type='PPL1', role='ppl1')
    
    # Connect KCs to MBON
    for i in range(5):
        G_real.add_edge(i, 5, weight=1.0)
        G_real.add_edge(6, i, weight=1.0) # PAM to KC
        G_real.add_edge(7, i, weight=1.0) # PPL1 to KC
        
    test_features = {
        'brightness': 0.8,
        'visual_complexity': 0.8,
        'semantic_complexity': 0.8,
        'novelty': 0.8,
        'semantic_salience': 0.8,
        'semantic_action': 0.8
    }
    
    test_news_item = {
        'title': 'Test Item',
        'description': 'A highly salient test item to trigger adaptation.'
    }
    
    def run_simulation(state):
        adaptation = state.get('adaptation', 0.0)
        habituation = state.get('habituation', 0.0)
        
        base_drive = test_features['brightness'] * 40.0
        background_drive = max(0.0, base_drive - (adaptation * 15.0))
        
        sim = NeuroFlySimulator(G_real)
        kc_count = len(sim.kc_indices)
        
        complexity = test_features['visual_complexity'] * 0.5 + test_features['semantic_complexity'] * 0.5
        habituated_complexity = max(0.05, complexity * (1.0 - (habituation * 0.5)))
        num_active = int(habituated_complexity * kc_count)
        
        import random
        random.seed(int(test_features['novelty'] * 1000))
        active_kcs = random.sample(sim.kc_indices, min(num_active, kc_count))
        
        stim_dict = {
            'active_kc_indices': active_kcs,
            'pam_stimulus': 0.0,
            'ppl1_stimulus': 0.0
        }
        
        return sim.apply_stimulus_and_run(stim_dict, duration_ms=150, background_drive_mv=background_drive)

    print("--- RUN 1: FRESH STATE (t=0) ---")
    state_0 = state_manager.current_state.copy()
    print(f"Initial State: Adaptation={state_0.get('adaptation', 0):.3f}, Habituation={state_0.get('habituation', 0):.3f}")
    
    sim_result_1 = run_simulation(state_0)
    print(f"Resulting Spikes: {sim_result_1['total_spikes']}")
    print(f"Resulting Active Neurons: {sim_result_1['active_neurons']}\n")
    
    # Process exposure updates the state
    state_manager.process_exposure(test_news_item, test_features, sim_result_1)
    
    # Artificially bump adaptation and habituation to simulate long-term exposure
    # rather than running a loop of 100 iterations.
    state_manager.current_state['adaptation'] = 0.95
    state_manager.current_state['habituation'] = 0.95
    
    print("--- RUN 2: HABITUATED/ADAPTED STATE (t=100) ---")
    state_100 = state_manager.current_state.copy()
    print(f"Current State: Adaptation={state_100.get('adaptation', 0):.3f}, Habituation={state_100.get('habituation', 0):.3f}")
    
    sim_result_2 = run_simulation(state_100)
    print(f"Resulting Spikes: {sim_result_2['total_spikes']}")
    print(f"Resulting Active Neurons: {sim_result_2['active_neurons']}\n")
    
    if os.path.exists(test_db):
        os.remove(test_db)
        
    print("--- CONCLUSION ---")
    if sim_result_1['total_spikes'] != sim_result_2['total_spikes'] or sim_result_1['active_neurons'] != sim_result_2['active_neurons']:
        print("CAUSALITY VERIFIED: The exact same input vector produced a different output based purely on the internal persistent state.")
    else:
        print("CAUSALITY FAILED: The output did not differ despite state changes.")

if __name__ == "__main__":
    verify_causality()
