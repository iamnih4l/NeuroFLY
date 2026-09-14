# NeuroFly Science & Methodology

This document outlines the scientific foundations, modeling assumptions, and experimental methodologies driving NeuroFly. 

## 1. Core Philosophy

The central premise of NeuroFly is to bridge empirical structural data with computational neuroscience:

- **The anatomy is real:** We use the `male-cns:v1.0` dataset from Janelia FlyEM.
- **The stimulus can be real:** Live YouTube feeds or curated events are translated into sensory inputs.
- **The neural activity is modeled:** We simulate dynamics using the Brian2 spiking neural network engine.

NeuroFly does **not** claim to measure actual subjective emotion, living dopamine concentrations, or empirical neural activity of a living fly. All activity is **model-derived**.

## 2. The Structural Connectome (MaleCNS v1.0)

The foundation of the simulation is the complete *Drosophila melanogaster* male central nervous system. 

- **Data Source:** Google Research / HHMI Janelia `neuprint.janelia.org`
- **Graph Model:** Directed graph where nodes are neurons (somas) and edges are aggregated synaptic connections.
- **Biological Validity:** The structural constraints (which neuron can talk to which) are strictly empirical. No synthetic edges are created.

## 3. Computational Neural Model

NeuroFly uses **Brian2** to simulate the dynamics of the extracted circuits.

- **Neuron Model:** Leaky Integrate-and-Fire (LIF).
- **Sensory Input:** Multimodal features (novelty, salience, brightness) are translated into Poisson spike trains injected into the simulated sensory neurons.
- **Dopaminergic Modulation (PAM vs PPL1):** 
  - **PAM (Protocerebral Anterior Medial):** Functionally associated with positive valence/reward.
  - **PPL1 (Protocerebral Posterior Lateral 1):** Functionally associated with negative valence/punishment.
  - In our computational model, "dopamine" is represented as an abstract modulatory variable (e.g., $DA \in [0, 1]$) that alters the resting potential or excitability of downstream targets (e.g., MBONs).

## 4. Modeling Assumptions & Limitations

1. **Uniform Electrophysiology:** We assume uniform membrane time constants ($\tau_m$) and resting potentials across different neuron types for computational tractability, which is a significant abstraction from biology.
2. **Abstracted Plasticity:** Synaptic plasticity is modeled using simplified Hebbian or engineered rate-based learning rules rather than complex continuous STDP traces, to allow for faster-than-real-time rendering and evaluation.
3. **Behavioral Proxy:** System outputs (adaptation, habituation, dopamine state) are proxies for computational state, not claims of biological emotion.
4. **Computational Ablation:** The system allows for computational ablation (zeroing the weight of an existing empirical edge) to test null models and structural hypotheses.

## 5. Experimental Protocols

NeuroFly enables in-silico experiments:
- **Baseline Calibration:** The network is run with background drive to establish a stable firing rate and avoid numerical instability (e.g., infinite firing or total silence).
- **Stimulus Window:** A curated semantic event (e.g., breaking news) is mapped to sensory features and fed into the network.
- **Analysis:** We measure aggregate spike counts, active neuron ratios, and shifts in modulatory states to observe how the *empirical structure* guides the *computational response*.
