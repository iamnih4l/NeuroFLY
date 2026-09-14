# Persistent Neural State: Mathematical Formalization

NeuroFly implements a persistent computational state that evolves continuously. This document formalizes the update rules governing this state. 

> [!WARNING]
> **COMPUTATIONAL ASSUMPTIONS**
> These variables represent modeled abstractions of neuromodulatory principles, NOT direct biological measurements of a living fly. The MaleCNS connectome provides the *structure*, but these equations govern the *simulation's continuous state*.

## State Variables

### 1. Adaptation ($A_t$)
**Definition:** A transient suppression of the system's sensitivity to high-intensity stimuli, analogous to sensory or network adaptation.
- **Range:** $[0.0, 1.0]$
- **Initial Condition:** $A_0 = 0.0$
- **Units:** Dimensionless (Proxy)
- **Interpretation:** High adaptation means the network requires a stronger stimulus to elicit the same response.

**Update Rule:**
$$ A_{t} = \min(1.0, 0.95 \cdot A_{t-1} + 0.3 \cdot S_{combined}) $$
Where $S_{combined}$ is the combined incoming salience:
$$ S_{combined} = 0.4 \cdot S_{semantic} + 0.3 \cdot A_{semantic} + 0.3 \cdot C_{visual} $$

### 2. Habituation ($H_t$)
**Definition:** A longer-term reduction in response specifically to *repeated* or *non-novel* stimuli.
- **Range:** $[0.0, 1.0]$
- **Initial Condition:** $H_0 = 0.0$
- **Units:** Dimensionless (Proxy)
- **Interpretation:** High habituation implies the network has "learned" the current environment and will produce lower dopaminergic responses.

**Update Rule:**
$$ H_{t} = \min(1.0, 0.9 \cdot H_{t-1} + 0.2 \cdot (1 - N_t)) $$
Where $N_t$ is the Novelty score $[0.1, 0.9]$ derived from historical hashing.

### 3. Modulatory Output Proxy ($D_t$)
**Definition:** The modeled dopaminergic response (or general neuromodulatory proxy) driving global network state changes.
- **Range:** $[0.0, 1.0]$
- **Units:** Dimensionless (Proxy)
- **Interpretation:** Represents "reward-associated" or "salience-associated" network drive.

**Update Rule:**
$$ D_{t} = (0.5 \cdot N_t + 0.5 \cdot S_{combined}) \cdot \min(1.0, \frac{\text{ActiveNeurons}_t}{10.0}) $$
Note: The response scales non-linearly based on both the stimulus features (Novelty, Salience) and the *actual resulting activity* of the Brian2 simulation.

## Causality Guarantee
Because $D_t$ depends on $\text{ActiveNeurons}_t$, and $\text{ActiveNeurons}_t$ is calculated via Brian2 simulation driven by $A_{t-1}$, the state is strictly causal. An identical input vector $I$ applied at $t=1$ and $t=100$ will yield different $D_t$ values depending on the accumulated Adaptation and Habituation histories.
