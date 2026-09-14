import os
import sqlite3
import pandas as pd
import json
import matplotlib.pyplot as plt
from src.data_extraction import DataExtractor
from src.sensory_encoder import SensoryEncoder
from src.simulation import NeuroFlySimulator
from src.experiments.manifest import ExperimentManifest

def setup_database():
    db_path = os.path.join(os.getcwd(), 'data', 'results.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Core tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS experiments (
            experiment_id TEXT PRIMARY KEY,
            timestamp TEXT,
            dataset TEXT,
            dataset_version TEXT,
            environment TEXT,
            manifest JSON
        )
    ''')
    
    # Store the actual graph layout for the frontend
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS neurons (
            experiment_id TEXT,
            neuron_id TEXT,
            cell_type TEXT,
            region TEXT,
            x REAL,
            y REAL,
            z REAL,
            provenance JSON,
            skeleton JSON
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS connections (
            experiment_id TEXT,
            source_id TEXT,
            target_id TEXT,
            weight REAL,
            provenance JSON,
            synapse_locations JSON
        )
    ''')
    
    # Granular simulation state for playback
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metrics (
            experiment_id TEXT,
            epoch INTEGER,
            active_kcs INTEGER,
            pam_hz REAL,
            ppl1_hz REAL,
            avg_weight REAL
        )
    ''')
    
    # Delete old runs for prototype simplicity (normally we'd keep them all)
    cursor.execute('DELETE FROM experiments')
    cursor.execute('DELETE FROM neurons')
    cursor.execute('DELETE FROM connections')
    cursor.execute('DELETE FROM metrics')
    conn.commit()
    return conn

def main():
    print("=== NeuroFly Experimental Runner ===")
    
    env_mode = os.environ.get('NEUROFLY_ENV', 'research')
    manifest = ExperimentManifest(environment=env_mode)
    
    conn = setup_database()
    cursor = conn.cursor()
    
    # 1. Initialize Components
    extractor = DataExtractor()
    print("Fetching real connectome subgraph (max 100 nodes)...")
    graph = extractor.get_mushroom_body_subgraph(max_nodes=100)
        
    if graph.number_of_nodes() == 0:
        print("Error: Graph is empty.")
        return
        
    # Store Manifest
    cursor.execute('''
        INSERT INTO experiments (experiment_id, timestamp, dataset, dataset_version, environment, manifest)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (manifest.experiment_id, manifest.timestamp, manifest.dataset, manifest.dataset_version, manifest.environment, manifest.to_json()))
    
    # Store Graph Topology
    for node, data in graph.nodes(data=True):
        cursor.execute('''
            INSERT INTO neurons (experiment_id, neuron_id, cell_type, region, x, y, z, provenance, skeleton)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (manifest.experiment_id, node, data.get('cell_type'), data.get('region'), data.get('x'), data.get('y'), data.get('z'), json.dumps(data.get('provenance', {})), json.dumps(data.get('skeleton', []))))
        
    for u, v, data in graph.edges(data=True):
        cursor.execute('''
            INSERT INTO connections (experiment_id, source_id, target_id, weight, provenance, synapse_locations)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (manifest.experiment_id, u, v, data.get('weight', 1.0), json.dumps(data.get('provenance', {})), json.dumps(data.get('synapse_locations', []))))
        
    conn.commit()
    print(f"Stored {graph.number_of_nodes()} nodes and {graph.number_of_edges()} edges to results.db")
        
    simulator = NeuroFlySimulator(graph)
    encoder = SensoryEncoder(kc_count=len(simulator.kc_indices))
    
    # 3. Experimental Loop
    epoch_duration_ms = 100
    average_weights = []
    
    print("Starting experimental loop (Control vs Experiment)...")
    
    # Baseline condition (Epoch 0)
    print("Epoch 0: Baseline")
    baseline_input = encoder.encode_condition('baseline')
    simulator.apply_stimulus_and_run(baseline_input, duration_ms=epoch_duration_ms)
    avg_w = simulator.get_average_weight()
    average_weights.append(avg_w)
    cursor.execute('''
        INSERT INTO metrics (experiment_id, epoch, active_kcs, pam_hz, ppl1_hz, avg_weight)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        manifest.experiment_id,
        0,
        len(baseline_input['active_kc_indices']),
        baseline_input['pam_stimulus'],
        baseline_input['ppl1_stimulus'],
        avg_w
    ))
    conn.commit()
    
    # Experiment condition (Epoch 1)
    print("Epoch 1: Reward Pairing")
    stimulus_input = encoder.encode_condition('reward_pairing', target_kc_ratio=0.5)
    simulator.apply_stimulus_and_run(stimulus_input, duration_ms=epoch_duration_ms)
    avg_w = simulator.get_average_weight()
    average_weights.append(avg_w)
    cursor.execute('''
        INSERT INTO metrics (experiment_id, epoch, active_kcs, pam_hz, ppl1_hz, avg_weight)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        manifest.experiment_id,
        1,
        len(stimulus_input['active_kc_indices']),
        stimulus_input['pam_stimulus'],
        stimulus_input['ppl1_stimulus'],
        avg_w
    ))
    conn.commit()
        
    print(f"Experimental loop complete. Experiment ID: {manifest.experiment_id}")
    conn.close()
    
    # 4. Visualization
    output_path = os.path.join(os.getcwd(), 'output', 'learning_curve.png')
    plt.figure(figsize=(10, 5))
    plt.plot(range(len(average_weights)), average_weights, marker='o', linestyle='-', color='g')
    plt.title("Synaptic Weight Evolution (Control vs Reward)")
    plt.xlabel("Epoch")
    plt.ylabel("Average Synaptic Weight (mV)")
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(output_path)
    print(f"Learning curve plot saved to {output_path}")

if __name__ == "__main__":
    main()
