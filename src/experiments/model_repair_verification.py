import numpy as np
import networkx as nx
from brian2 import *

# Force numpy early to prevent cython hangs on Windows
prefs.codegen.target = "numpy"

from src.simulation import NeuroFlySimulator
from src.analysis.circuit_extraction import CircuitExtractor

def run_verification():
    print("=== BRIAN2 MODEL REPAIR VERIFICATION ===")
    
    # 1. Phase 12 - SINGLE NEURON REGRESSION
    print("\n--- PHASE 12: SINGLE-NEURON REGRESSION ---")
    G_single = nx.DiGraph()
    G_single.add_node('N1', type='KC', role='UPSTREAM')
    
    sim_single = NeuroFlySimulator(G_single)
    # Silent Condition
    sim_single.neurons.v = -67.5 * mV
    res_silent = sim_single.apply_stimulus_and_run({'active_kc_indices': [], 'pam_stimulus':0, 'ppl1_stimulus':0}, duration_ms=150, background_drive_mv=0)
    print(f"Silent Condition (0mV drive) -> Spikes: {res_silent['total_spikes']}")
    
    # Spiking Condition
    sim_single.neurons.v = -67.5 * mV
    res_spiking = sim_single.apply_stimulus_and_run({'active_kc_indices': [], 'pam_stimulus':0, 'ppl1_stimulus':0}, duration_ms=150, background_drive_mv=30)
    print(f"Spiking Condition (30mV drive) -> Spikes: {res_spiking['total_spikes']}")
    
    if res_silent['total_spikes'] == 0 and res_spiking['total_spikes'] > 0:
        print("  Single-Neuron Test: PASS")
    else:
        print("  Single-Neuron Test: FAIL")
        
    # 2. Phase 13 - MULTI-NEURON TEST
    print("\n--- PHASE 13: MULTI-NEURON TEST ---")
    G_multi = nx.DiGraph()
    G_multi.add_node('N1', type='KC', role='UPSTREAM')
    G_multi.add_node('N2', type='MBON', role='DOWNSTREAM')
    G_multi.add_edge('N1', 'N2', weight=50) # strong synapse
    
    sim_multi = NeuroFlySimulator(G_multi)
    # Drive only N1 by setting drive to 30. Since N1 is KC, it is also driven by Poisson input if active_kc_indices is given.
    # But apply_stimulus_and_run drives ALL neurons with background_drive_mv.
    # We will just run apply_stimulus_and_run with active_kc_indices=[0], pam_stim=0, ppl1_stim=0, background=0
    # so ONLY N1 gets spiked by Poisson input, and propagates to N2.
    sim_multi.neurons.v = -67.5 * mV
    res_multi = sim_multi.apply_stimulus_and_run({'active_kc_indices': [0], 'pam_stimulus':0, 'ppl1_stimulus':0}, duration_ms=150, background_drive_mv=0)
    print(f"  Multi-Neuron Test total spikes (Poisson driven): {res_multi['total_spikes']}")
    if res_multi['active_neurons'] >= 2:
        print("  Multi-Neuron Test: PASS (propagation occurred)")
    else:
        print("  Multi-Neuron Test: FAIL")

    # 3. Phase 14 - REAL CONNECTOME SMOKE TEST
    print("\n--- PHASE 14: REAL CONNECTOME SMOKE TEST ---")
    target_body_id = 125080
    extractor = CircuitExtractor()
    circuit_data = extractor.extract_circuit(target_body_id)
    
    G_real = nx.DiGraph()
    for n in circuit_data['nodes']:
        G_real.add_node(n['id'], type=n['type'], role=n['role'])
    for e in circuit_data['edges']:
        G_real.add_edge(e['source'], e['target'], weight=e['weight'])
        
    sim_real = NeuroFlySimulator(G_real)
    res_real = sim_real.apply_stimulus_and_run({'active_kc_indices': [], 'pam_stimulus':0, 'ppl1_stimulus':0}, duration_ms=150, background_drive_mv=22)
    print(f"Real Connectome (22mV drive) -> Spikes: {res_real['total_spikes']}, Active Neurons: {res_real['active_neurons']}")
    
    # 4. Phase 15 - DOPAMINE MODULATION REGRESSION
    print("\n--- PHASE 15: DOPAMINE MODULATION REGRESSION ---")
    downstream_ids = [n['id'] for n in circuit_data['nodes'] if n['role'] in ('DOWNSTREAM', 'RECIPROCAL')]
    mod_values = [0.0, 0.5, 1.0, 2.0, 5.0]
    
    for mv_val in mod_values:
        sim = NeuroFlySimulator(G_real)
        downstream_indices = [sim.node_mapping[nid] for nid in downstream_ids if nid in sim.node_mapping]
        
        v_rest_before = np.mean(np.array(sim.neurons.v_rest)) / mV
        sim.apply_dopamine_modulation(downstream_indices, mv_val)
        v_rest_after = np.mean(np.array(sim.neurons.v_rest)) / mV
        
        print(f"Modulation {mv_val} mV -> v_rest changed by {v_rest_after - v_rest_before:.2f} mV")

if __name__ == "__main__":
    run_verification()
