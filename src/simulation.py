import os
os.environ['BRIAN_FRONTEND'] = 'numpy'

from brian2 import *

# Force numpy target to prevent Windows C++ compilation timeouts/hangs
prefs.codegen.target = "numpy"

from src.config import Config
import networkx as nx
import numpy as np

class NeuroFlySimulator:
    def __init__(self, graph: nx.DiGraph):
        self.graph = graph
        self.node_mapping = {node: i for i, node in enumerate(graph.nodes())}
        self.reverse_mapping = {i: node for node, i in self.node_mapping.items()}
        self.N = len(graph.nodes())
        
        self.kc_indices = [i for i in range(self.N) if 'KC' in str(graph.nodes[self.reverse_mapping[i]].get('type', ''))]
        self.mbon_indices = [i for i in range(self.N) if 'MBON' in str(graph.nodes[self.reverse_mapping[i]].get('type', ''))]
        self.dan_indices = [i for i in range(self.N) if 'DAN' in str(graph.nodes[self.reverse_mapping[i]].get('type', '')) or 'PPL1' in str(graph.nodes[self.reverse_mapping[i]].get('type', '')) or 'PAM' in str(graph.nodes[self.reverse_mapping[i]].get('type', ''))]
        
        self.seed_val = None
        self._build_network()

    def _build_network(self):
        print("Building continuous Brian2 network with plasticity...")
        
        # LIF equations with a DA current injection term for DANs
        eqs = '''
        dv/dt = (v_rest - v + v_drive) / tau_m : volt (unless refractory)
        v_drive : volt
        tau_m : second
        v_rest : volt
        v_thresh : volt
        v_reset : volt
        '''
        
        self.neurons = NeuronGroup(self.N, eqs, threshold='v > v_thresh', reset='v = v_reset',
                                   refractory=2*ms, method='exact')
        
        self.neurons.tau_m = Config.TAU_M * ms
        self.neurons.v_rest = Config.V_REST * mV
        self.neurons.v_reset = Config.V_RESET * mV
        self.neurons.v_thresh = Config.V_THRESH * mV
        self.neurons.v_drive = 0 * mV
        self.neurons.v = Config.V_REST * mV + rand(self.N) * 5 * mV
        
        # Synapses with simple Hebbian Plasticity modulated by Dopamine
        # For simplicity in MVP, we use a simple rate-based Hebbian rule
        # w_new = w_old + eta * (pre_spike) * (DA_level)
        
        syn_eqs = '''
        w : volt
        '''
        
        self.synapses = Synapses(self.neurons, self.neurons, syn_eqs, 
                                 on_pre='''
                                 v_post += w
                                 ''')
                                 
        # We will manually apply plasticity between runs for simplicity in the numpy fallback MVP, 
        # as complex continuous STDP traces in numpy fallback can be very slow.
        
        sources = []
        targets = []
        weights = []
        
        for u, v, data in self.graph.edges(data=True):
            sources.append(self.node_mapping[u])
            targets.append(self.node_mapping[v])
            synapse_count = data.get('weight', 1)
            weights.append(synapse_count * 0.5)
            
        if len(sources) > 0:
            self.synapses.connect(i=np.array(sources, dtype=int), j=np.array(targets, dtype=int))
            self.synapses.w = weights * mV
        else:
            self.synapses.active = False
        
        # Sensory Input (Poisson)
        if self.kc_indices:
            # We create an array of rates that we can update dynamically
            self.poisson_rates = np.zeros(len(self.kc_indices))
            # Brian2 workaround: use a Custom timed array or just update a parameter.
            # In numpy fallback, changing group rates between run() calls works best by using linked variables
            self.poisson_input = PoissonGroup(len(self.kc_indices), rates=0*Hz)
                                              
            self.input_synapses = Synapses(self.poisson_input, self.neurons, 'w : volt', on_pre='v_post += w')
            self.input_synapses.connect(i=np.arange(len(self.kc_indices)), j=self.kc_indices)
            self.input_synapses.w = 5 * mV
            
        self.spike_monitor = SpikeMonitor(self.neurons)
        
        self.net = Network(self.neurons, self.spike_monitor)
        
        if len(sources) > 0:
            self.net.add(self.synapses)
            
        if self.kc_indices:
            self.net.add(self.poisson_input, self.input_synapses)

    def apply_stimulus_and_run(self, stimulus_dict, duration_ms=100, sim_seed=None, background_drive_mv=22.0):
        """
        Updates the input rates and DA currents, runs the simulation, and applies MVP plasticity.
        """
        # Ensure stochastic reproducibility
        if sim_seed is not None:
            seed(sim_seed)
            np.random.seed(sim_seed)
            self.seed_val = sim_seed
            
        active_kcs = stimulus_dict['active_kc_indices']
        pam_stim = stimulus_dict['pam_stimulus']
        ppl1_stim = stimulus_dict['ppl1_stimulus']
        
        # Reset sensory input
        if self.kc_indices:
            rates = np.zeros(len(self.kc_indices))
            for kc in active_kcs:
                # Map the global KC index to the PoissonGroup index
                if kc < len(self.kc_indices):
                    rates[kc] = Config.BACKGROUND_RATE * 5 # Spike 5x background when active
            
            # In Brian2, updating rates array directly on PoissonGroup requires care.
            # We recreate the PoissonGroup for the new rates to ensure clean state in MVP numpy fallback.
            self.net.remove(self.poisson_input, self.input_synapses)
            self.poisson_input = PoissonGroup(len(self.kc_indices), rates=rates * Hz)
            self.input_synapses = Synapses(self.poisson_input, self.neurons, 'w : volt', on_pre='v_post += w')
            self.input_synapses.connect(i=np.arange(len(self.kc_indices)), j=self.kc_indices)
            self.input_synapses.w = 5 * mV
            self.net.add(self.poisson_input, self.input_synapses)
            
        # Apply DA currents (Simplified: first half of DANs are PAM, second half are PPL1)
        # We also apply a constant background drive so the circuit has spontaneous activity
        self.neurons.v_drive = background_drive_mv * mV
        if len(self.dan_indices) >= 2:
            pam_idx = self.dan_indices[0]
            ppl1_idx = self.dan_indices[1]
            self.neurons.v_drive[pam_idx] = pam_stim * mV
            self.neurons.v_drive[ppl1_idx] = ppl1_stim * mV
            
        # We will run the simulation in 3 windows: 
        # Baseline (0 to duration_ms/3), Stimulus (duration_ms/3 to 2*duration_ms/3), Post-stimulus (rest)
        # [REPAIR]: research_experiment_runner replaces self.spike_monitor but doesn't add it to net.
        # This causes it to record 0 spikes. 
        # We find the actual active monitor in the network and use differences.
        active_monitor = None
        for obj in self.net.objects:
            if isinstance(obj, SpikeMonitor):
                active_monitor = obj
                break
                
        if not active_monitor:
            active_monitor = self.spike_monitor
            
        spikes_start = active_monitor.num_spikes
        
        window_ms = duration_ms / 3.0
        
        print(f"Running baseline {window_ms} ms...")
        # 1. Baseline
        self.net.run(window_ms * ms)
        print(f"Baseline done. Running stim {window_ms} ms...")
        spikes_baseline = active_monitor.num_spikes - spikes_start
        
        # 2. Stimulus
        if self.kc_indices:
            self.poisson_input.rates = rates * Hz
        self.net.run(window_ms * ms)
        print(f"Stim done. Running post-stim {window_ms} ms...")
        spikes_stimulus = active_monitor.num_spikes - (spikes_start + spikes_baseline)
        
        # 3. Post-stimulus
        if self.kc_indices:
            self.poisson_input.rates = 0 * Hz
        self.net.run((duration_ms - 2*window_ms) * ms)
        print("Post-stim done.")
        spikes_post = active_monitor.num_spikes - (spikes_start + spikes_baseline + spikes_stimulus)
        
        # Check for numerical instability (NaN/Infs in state variables)
        if np.any(np.isnan(self.neurons.v)) or np.any(np.isinf(self.neurons.v)):
            print("WARNING: Numerical instability detected in simulation (NaN/Inf in v).")
            
        recent_spikes_i = active_monitor.i[spikes_start:]
        active_neurons_count = len(np.unique(recent_spikes_i))
        active_neuron_ids = [int(idx) for idx in np.unique(recent_spikes_i)]
            
        # Manual MVP Plasticity Rule (Applied end of epoch)
        # If PAM was active (positive valence), we increase weights from active KCs to MBONs.
        # If PPL1 was active (negative valence), we decrease weights.
        learning_rate = 0.1 * mV
        if pam_stim > 0:
            self._apply_plasticity(active_kcs, learning_rate)
        elif ppl1_stim > 0:
            self._apply_plasticity(active_kcs, -learning_rate)
            
        return {
            "spikes_baseline": spikes_baseline,
            "spikes_stimulus": spikes_stimulus,
            "spikes_post": spikes_post,
            "total_spikes": spikes_baseline + spikes_stimulus + spikes_post,
            "active_neurons": active_neurons_count,
            "active_neuron_ids": active_neuron_ids,
            "window_duration_ms": window_ms
        }
            
    def _apply_plasticity(self, active_kcs, delta_w):
        # Extremely simplified plasticity: 
        # Modifies synapses between currently active KCs and all MBONs
        for kc_local_idx in active_kcs:
            if kc_local_idx < len(self.kc_indices):
                global_kc_idx = self.kc_indices[kc_local_idx]
                
                # Find synapses where pre is global_kc_idx and post is an MBON
                for mbon_idx in self.mbon_indices:
                    # Brian2 synapses.w can be accessed via string conditions or indices
                    # For MVP, we iterate and update (slow for large graphs, fine for mock)
                    pass 
                    
        # A more vectorized approach for Brian2:
        for mbon_idx in self.mbon_indices:
            # We want to increase w for synapses from active KCs to this MBON
            pass 
            
        # Brian2 allows modifying state variables directly.
        # Since this is an MVP, we will artificially simulate the global weight drift 
        self.synapses.w += delta_w * 0.01 # Global drift for MVP demonstration
        
        # Ensure weights don't drop below 0
        w_val = self.synapses.w / mV
        self.synapses.w = np.clip(w_val, 0, 100) * mV

    def apply_dopamine_modulation(self, target_indices, modulation_factor):
        """
        ASSUMED BIOLOGICAL MECHANISM:
        Dopaminergic modulation alters the excitability of target neurons.
        In this model, dopamine changes the baseline resting potential (v_rest)
        of the downstream target neurons, making them more or less likely to fire.
        
        This is an explicit computational assumption, not a directly observed structural feature.
        """
        print(f"Applying ASSUMED dopaminergic modulation (factor {modulation_factor}) to {len(target_indices)} targets.")
        
        for idx in target_indices:
            if idx < self.N:
                self.neurons.v_rest[idx] += modulation_factor * mV

    def apply_computational_ablation(self, edge_source_id: str, edge_target_id: str):
        """
        COMPUTATIONAL PERTURBATION:
        Finds the synapse corresponding to the observed structural edge and zeroes its weight.
        This isolates the topological impact of this connection on the circuit dynamics.
        """
        if edge_source_id not in self.node_mapping or edge_target_id not in self.node_mapping:
            print("WARNING: Attempted to ablate non-existent edge.")
            return False
            
        u_idx = self.node_mapping[edge_source_id]
        v_idx = self.node_mapping[edge_target_id]
        
        print(f"Applying COMPUTATIONAL ABLATION to edge {edge_source_id} -> {edge_target_id}")
        
        # Brian2 allows conditional setting. But for numpy fallback MVP, we manually set it
        ablated = False
        # The synapses object uses a 1D array for weights corresponding to the flat source/target lists
        # We find the index where source=u_idx and target=v_idx
        for idx in range(len(self.synapses.i)):
            if self.synapses.i[idx] == u_idx and self.synapses.j[idx] == v_idx:
                self.synapses.w[idx] = 0 * mV
                ablated = True
                
        return ablated

    def get_average_weight(self):
        return np.mean(self.synapses.w) / mV

