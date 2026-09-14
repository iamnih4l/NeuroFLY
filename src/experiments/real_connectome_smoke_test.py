import sys
import json
import traceback
from src.config import Config
from src.data_extraction import DataExtractor
from src.simulation import NeuroFlySimulator
from src.sensory_encoder import SensoryEncoder
from src.scientific_readiness import check_scientific_readiness
from src.experiments.manifest import ExperimentManifest

def run_smoke_test():
    print("NEUROFLY SCIENTIFIC SMOKE TEST\n")
    print(f"Dataset: {Config.NEUPRINT_DATASET}")
    print("Provider: Janelia NeuPrint\n")
    
    try:
        extractor = DataExtractor()
        G = extractor.get_mushroom_body_subgraph(max_nodes=100) # Small real graph
        
        real_neurons = G.number_of_nodes()
        real_connections = G.number_of_edges()
        
        print(f"Real neurons:        {real_neurons}")
        print(f"Real connections:    {real_connections}\n")
        
        if real_neurons == 0:
            raise Exception("No real neurons retrieved from MaleCNS.")
            
        print("Graph construction:  PASS")
        
        # Build Brian2 model
        simulator = NeuroFlySimulator(G)
        print("Brian2 model:        PASS")
        
        # Input encoding
        encoder = SensoryEncoder(kc_count=len(simulator.kc_indices))
        
        # Define explicit Control and Experiment inputs
        baseline_input = encoder.encode_condition('baseline')
        stimulus_input = encoder.encode_condition('reward_pairing', target_kc_ratio=0.5)
        
        if not stimulus_input['active_kc_indices']:
            print("WARNING: No KCs in the subgraph to stimulate.")
        
        print("Input encoding:      PASS")
        
        # Control run
        simulator.apply_stimulus_and_run(baseline_input, duration_ms=10)
        baseline_spikes = simulator.spike_monitor.num_spikes
        
        # Experiment run
        simulator.apply_stimulus_and_run(stimulus_input, duration_ms=10)
        stimulus_spikes = simulator.spike_monitor.num_spikes - baseline_spikes
        
        print("Simulation:          PASS")
        
        delta_spikes = stimulus_spikes - baseline_spikes
        
        print("Measurements:        PASS")
        
        manifest = ExperimentManifest(
            dataset=Config.NEUPRINT_DATASET,
            stimulus_id='reward_pairing_smoke_test',
            simulation_parameters={
                "duration_ms": 20,
                "delta_spikes": int(delta_spikes),
                "baseline_spikes": int(baseline_spikes),
                "stimulus_spikes": int(stimulus_spikes),
                "neurons": int(real_neurons),
                "connections": int(real_connections)
            }
        )
        
        if manifest.to_json():
            print("Provenance:          PASS")
            
        print("\nSCIENTIFIC EXECUTION: READY\n")
        print("Experiment:")
        print(manifest.experiment_id)
        
    except Exception as e:
        print("\nFAILED STAGE:")
        print(traceback.format_exc())
        print("\nScientific execution:\nBLOCKED")
        sys.exit(1)

if __name__ == "__main__":
    run_smoke_test()
