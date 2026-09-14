import os
import json
import networkx as nx
import numpy as np
from brian2 import mV, Hz, seed, Network

from src.analysis.circuit_extraction import CircuitExtractor
from src.simulation import NeuroFlySimulator
from src.experiments.cohort_selection import CohortSelector
from src.config import Config

def run_calibration():
    print("--- Starting Model Calibration and Validation ---")
    
    # 1. Select the same circuit as Experiment 01
    selector = CohortSelector()
    cohort = selector.select_cohort(limit=1)
    if not cohort:
        print("No dopaminergic cohort members found!")
        return
    
    target_body_id = cohort[0]['body_id']
    extractor = CircuitExtractor()
    circuit_data = extractor.extract_circuit(target_body_id)
    
    nodes = circuit_data['nodes']
    edges = circuit_data['edges']
    
    G = nx.DiGraph()
    for n in nodes:
        G.add_node(n['id'], type=n['type'], role=n['role'])
    for e in edges:
        G.add_edge(e['source'], e['target'], weight=e['weight'])
        
    downstream_ids = [n['id'] for n in nodes if n['role'] in ('DOWNSTREAM', 'RECIPROCAL')]
    
    print(f"\nCircuit loaded. Central DAN: {target_body_id}, N={len(nodes)}, Edges={len(edges)}")
    
    results = {}
    
    # 2. Phase 4 - Baseline Activity Test (v_drive = 22mV)
    print("\n--- PHASE 4: Baseline Activity Test (v_drive = 22mV) ---")
    sim = NeuroFlySimulator(G)
    stim = {'active_kc_indices': [], 'pam_stimulus': 0, 'ppl1_stimulus': 0}
    
    # Reset state
    sim.neurons.v = -70 * mV * np.ones(sim.N)
    sim.neurons.v_drive = 22 * mV
    sim.spike_monitor = type(sim.spike_monitor)(sim.neurons)
    
    res_baseline = sim.apply_stimulus_and_run(stim, duration_ms=150, sim_seed=42)
    
    print(f"Spikes: {res_baseline['total_spikes']}, Active Neurons: {res_baseline['active_neurons']}")
    
    baseline_hz = (res_baseline['total_spikes'] / sim.N) / 0.150
    print(f"Mean Population Firing Rate: {baseline_hz:.2f} Hz")
    
    results['baseline'] = {
        'v_drive_mv': 22,
        'spikes': int(res_baseline['total_spikes']),
        'active_neurons': int(res_baseline['active_neurons']),
        'mean_hz': float(baseline_hz)
    }
    
    # 3. Phase 5 - Input Sensitivity Sweep
    print("\n--- PHASE 5: Input Sensitivity Sweep (v_drive) ---")
    sweep_values = [0, 5, 10, 15, 20, 22, 25, 30]
    sweep_results = []
    
    for val in sweep_values:
        sim = NeuroFlySimulator(G)
        sim.neurons.v = -70 * mV * np.ones(sim.N)
        sim.neurons.v_drive = val * mV
        sim.spike_monitor = type(sim.spike_monitor)(sim.neurons)
        
        res = sim.apply_stimulus_and_run(stim, duration_ms=150, sim_seed=42, background_drive_mv=val)
        hz = (res['total_spikes'] / sim.N) / 0.150
        
        sweep_results.append({
            'v_drive_mv': int(val),
            'spikes': int(res['total_spikes']),
            'active_neurons': int(res['active_neurons']),
            'mean_hz': float(hz)
        })
        print(f"v_drive = {val} mV -> Spikes: {res['total_spikes']}, Rate: {hz:.2f} Hz")
        
    results['input_sweep'] = sweep_results
    
    # 4. Phase 7 - Synaptic Coupling Audit
    print("\n--- PHASE 7: Synaptic Coupling Audit ---")
    if len(edges) > 0:
        # Trace heaviest edge
        heaviest_edge = max(edges, key=lambda x: x['weight'])
        src = heaviest_edge['source']
        tgt = heaviest_edge['target']
        w_struct = heaviest_edge['weight']
        w_model = w_struct * 0.5  # As defined in Config/simulation.py
        
        print(f"Traced Edge: {src} -> {tgt}")
        print(f"Structural Weight: {w_struct} synapses")
        print(f"Model Weight: {w_model} mV")
        print(f"Relative to (v_thresh - v_rest): {w_model} / 20.0 = {w_model/20.0:.2%}")
        
        results['synaptic_audit'] = {
            'traced_edge': f"{src} -> {tgt}",
            'structural_weight': w_struct,
            'model_weight_mv': w_model,
            'impact_ratio': w_model/20.0
        }

    # 5. Phase 8 - Modulation Effectiveness Test
    print("\n--- PHASE 8: Modulation Effectiveness Test ---")
    mod_values = [0.0, 0.5, 1.0, 2.0, 5.0]
    mod_results = []
    
    for mv_val in mod_values:
        sim = NeuroFlySimulator(G)
        downstream_indices = [sim.node_mapping[nid] for nid in downstream_ids if nid in sim.node_mapping]
        
        # Capture v_rest BEFORE
        v_rest_before = np.mean(np.array(sim.neurons.v_rest)) / mV
        
        # Apply modulation
        sim.apply_dopamine_modulation(downstream_indices, mv_val)
        
        # Capture v_rest AFTER
        v_rest_after = np.mean(np.array(sim.neurons.v_rest)) / mV
        
        mod_results.append({
            'modulation_mv': float(mv_val),
            'mean_v_rest_before': float(v_rest_before),
            'mean_v_rest_after': float(v_rest_after),
            'delta_v_rest': float(v_rest_after - v_rest_before)
        })
        print(f"Modulation {mv_val} mV -> v_rest changed by {v_rest_after - v_rest_before:.2f} mV")
        
    results['modulation_effectiveness'] = mod_results
    
    # 6. Assess Model Health
    # Check if there is any condition in the sweep that produces activity
    activity_produced = any(r['spikes'] > 0 for r in sweep_results)
    
    if activity_produced:
        print("\nMODEL HEALTH STATUS: HEALTHY_BASELINE (Activity observed under specific drive conditions)")
        results['model_health'] = "HEALTHY_BASELINE"
        results['model_ready'] = True
    else:
        print("\nMODEL HEALTH STATUS: REQUIRES_CALIBRATION (No activity observed across standard sweep)")
        results['model_health'] = "REQUIRES_CALIBRATION"
        results['model_ready'] = False
        
    # Write output to json
    os.makedirs("output", exist_ok=True)
    with open("output/calibration_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_calibration()
