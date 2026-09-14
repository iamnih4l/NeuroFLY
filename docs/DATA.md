# NeuroFly Data Guide

This document describes the provenance, representation, and local usage of the scientific data in NeuroFly.

## 1. Primary Data Source & Scientific Provenance

The primary data source for NeuroFly must ALWAYS be the authoritative Google / HHMI Janelia male CNS connectome, hosted on `neuprint.janelia.org`.

- **Dataset Target:** `male-cns:v1.0`
- **Biological Status:** Real structural data (neurons, synapses, somas).
- **Simulation Status:** Dynamics (spikes, dopamine) are simulated using Brian2 (LIF) and are explicitly model-derived computational states overlaid on the verified biological structure.

### Strict Compliance Rules
1. **NO MOCK DATA:** Mock data is never substituted for missing biological data in research mode. If real data is unavailable, the system displays "CONNECTOME TEMPORARILY UNAVAILABLE".
2. **ENVIRONMENT EXCEPTIONS:** The system uses synthetic local fixtures marked as `DEVELOPMENT FIXTURE` only when `NEUROFLY_ENV=development`.

## 2. Local Full Data Mode

NeuroFly supports a targeted web API mode for specific circuits, but to stream massive structural geometry to the WebGL renderer without locking the browser, it supports **LOCAL / FULL DATA MODE**.

### Configuration
1. Obtain a Janelia NeuPrint token and set it in `.env`:
   ```
   NEUPRINT_APPLICATION_CREDENTIALS=your_token_here
   ```
2. Download and chunk the dataset locally:
   ```bash
   python -m neurofly.data.download_malecns --limit 5000 --roi "MB(R)"
   ```
   *This populates `data/local_cache/` with manifest and high-resolution geometry.*
3. When you launch NeuroFly, select **LOCAL / FULL DATA MODE**.

## 3. NeuroFly Binary Format (.nbf)

To bypass the JavaScript engine and V8's `JSON.parse()` limits, we stream biological data straight to the GPU using `.nbf`.

- **Zero-Copy Streaming:** Skeleton visualization requires `Float32Array` (vertices) and `Uint32Array` (indices). Wrapping these in `.nbf` allows for zero-copy deserialization directly into GPU buffers in microseconds.
- **Structure:**
  1. Magic Number `NBF1` + 4-byte JSON header length (Little-Endian).
  2. JSON Header (UTF-8) containing metadata, provenance, and byte offsets.
  3. Padding to 4-byte boundaries.
  4. Raw binary payload (`Float32Array` and `Uint32Array`).
- **LOD:** Lower Level of Detail (LOD) chunks must explicitly set `provenance.status = "DERIVED FROM REAL DATA"` in the JSON header.
