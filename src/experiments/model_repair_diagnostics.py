import numpy as np
from brian2 import *

def run_diagnostics():
    print("=== BRIAN2 MODEL REPAIR DIAGNOSTICS ===")
    
    # EXACT EQUATION FROM simulation.py
    eqs = '''
    dv/dt = (v_rest - v + v_drive) / tau_m : volt (unless refractory)
    v_drive : volt
    tau_m : second
    v_rest : volt
    v_thresh : volt
    v_reset : volt
    '''
    
    # PARAMETERS FROM config.py
    TAU_M = 20 * ms
    V_REST = -70 * mV
    V_RESET = -70 * mV
    V_THRESH = -50 * mV
    DURATION = 150 * ms
    
    print("\n--- PHASE 3: SINGLE-NEURON ISOLATION TEST & PHASE 4: NUMERICAL TRAJECTORY AUDIT ---")
    drives = [0, 10, 20, 22, 30]
    
    for drive in drives:
        start_scope()
        
        # ONE NEURON, NO SYNAPSES
        neurons = NeuronGroup(1, eqs, threshold='v > v_thresh', reset='v = v_reset',
                              refractory=2*ms, method='exact')
                              
        neurons.tau_m = TAU_M
        neurons.v_rest = V_REST
        neurons.v_reset = V_RESET
        neurons.v_thresh = V_THRESH
        neurons.v_drive = drive * mV
        
        # INITIALIZATION FROM simulation.py: Config.V_REST * mV + rand(self.N) * 5 * mV
        # We will use deterministic -67.5 mV for consistency in test
        initial_v = -67.5 * mV
        neurons.v = initial_v
        
        state_mon = StateMonitor(neurons, 'v', record=0)
        spike_mon = SpikeMonitor(neurons)
        
        run(DURATION)
        
        v_trace = state_mon.v[0] / mV
        
        print(f"\nCondition: v_drive = {drive} mV")
        print(f"  v_initial : {v_trace[0]:.2f} mV (Expected: {initial_v/mV:.2f} mV)")
        print(f"  v_min     : {np.min(v_trace):.2f} mV")
        print(f"  v_max     : {np.max(v_trace):.2f} mV")
        print(f"  v_final   : {v_trace[-1]:.2f} mV")
        print(f"  Threshold : {V_THRESH/mV:.2f} mV")
        print(f"  Spikes    : {spike_mon.num_spikes}")
        
        # PHASE 5: EQUATION ANALYSIS
        v_eq = (V_REST/mV) + drive
        print(f"  Theoretical Equilibrium: {v_eq:.2f} mV")
        if np.max(v_trace) >= (V_THRESH/mV) and spike_mon.num_spikes == 0:
            print("  ANOMALY DETECTED: max(v) >= threshold, but no spikes generated.")
        if np.max(v_trace) < (V_THRESH/mV) and v_eq >= (V_THRESH/mV):
            print("  ANOMALY DETECTED: Theoretical equilibrium exceeds threshold, but trajectory does not.")
            
    print("\n--- PHASE 9: UNIT AUDIT ---")
    try:
        check_eqs = Equations(eqs)
        check_eqs.check_units()
        print("  Brian2 Unit Check: PASS")
    except Exception as e:
        print(f"  Brian2 Unit Check: FAIL -> {e}")
        
    print("\n--- PHASE 10: INTEGRATION METHOD AUDIT ---")
    methods = ['exact', 'euler', 'rk4']
    for method in methods:
        start_scope()
        neurons = NeuronGroup(1, eqs, threshold='v > v_thresh', reset='v = v_reset',
                              refractory=2*ms, method=method)
        neurons.tau_m = TAU_M
        neurons.v_rest = V_REST
        neurons.v_reset = V_RESET
        neurons.v_thresh = V_THRESH
        neurons.v_drive = 30 * mV
        neurons.v = -67.5 * mV
        state_mon = StateMonitor(neurons, 'v', record=0)
        spike_mon = SpikeMonitor(neurons)
        try:
            run(DURATION)
            print(f"  Method '{method}' -> v_max: {np.max(state_mon.v[0]/mV):.2f} mV, Spikes: {spike_mon.num_spikes}")
        except Exception as e:
            print(f"  Method '{method}' -> Error: {e}")

if __name__ == "__main__":
    run_diagnostics()
