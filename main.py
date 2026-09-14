import os
import matplotlib.pyplot as plt
from src.data_extraction import DataExtractor
from src.simulation import build_and_run_simulation
from src.config import Config

def plot_raster(spike_monitor, reverse_mapping, output_path):
    """
    Plots a raster plot of the spike times and saves it to a file.
    """
    print(f"Generating raster plot...")
    plt.figure(figsize=(10, 6))
    
    # Plot spikes
    plt.plot(spike_monitor.t / 1e-3, spike_monitor.i, '.k', markersize=2)
    
    plt.xlabel('Time (ms)')
    plt.ylabel('Neuron Index')
    plt.title(f'NeuroFly MVP Spiking Activity ({Config.SIM_DURATION_MS}ms)')
    
    # Optional: Highlight MBONs and DANs with different colors
    # For a large graph, this might be messy, but fine for MVP
    mbon_indices = [i for i, node in reverse_mapping.items() if "MBON" in node]
    dan_indices = [i for i, node in reverse_mapping.items() if "DAN" in node]
    
    if mbon_indices:
        plt.axhspan(min(mbon_indices)-0.5, max(mbon_indices)+0.5, color='blue', alpha=0.1, label='MBONs')
    if dan_indices:
        plt.axhspan(min(dan_indices)-0.5, max(dan_indices)+0.5, color='orange', alpha=0.1, label='DANs')
        
    plt.legend(loc="upper right")
    plt.tight_layout()
    
    # Save plot
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path)
    print(f"Raster plot saved to {output_path}")

def main():
    print("=== NeuroFly MVP (Milestones 1 & 2) ===")
    
    # 1. Data Extraction
    extractor = DataExtractor()
    graph = extractor.get_mushroom_body_subgraph(mock=True) # Using mock by default for reliable MVP execution
    
    if graph.number_of_nodes() == 0:
        print("Error: Graph is empty.")
        return
        
    # 2. Simulation
    spike_monitor, reverse_mapping = build_and_run_simulation(graph)
    
    # 3. Output/Visualization
    output_path = os.path.join(os.getcwd(), 'output', 'raster_plot.png')
    plot_raster(spike_monitor, reverse_mapping, output_path)
    
    print("=== Execution Complete ===")

if __name__ == "__main__":
    main()
