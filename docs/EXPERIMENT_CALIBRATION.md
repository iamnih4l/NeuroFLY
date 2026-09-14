# Experiment Calibration

Calibration of the dopamine modulation experiment involves testing the network's sensitivity to assumed modulation strengths.

## Calibration Sweep
The system tests a spectrum of `modulation_mv` values to evaluate network response:
- `0.0 mV` (CONTROL A: Baseline null hypothesis)
- `0.5 mV` 
- `1.0 mV`
- `2.0 mV`
- `5.0 mV`

## Sham Control (CONTROL B)
To ensure the simulation engine operates deterministically and isolates the effect of the target indices, the system runs a **Sham Control**.
- **Input:** `modulation_factor = 2.0 mV`
- **Target Indices:** `[]` (Empty set)

Results from CONTROL B must identical to CONTROL A up to numerical noise limits, confirming that modulation acts strictly upon targeted nodes.
