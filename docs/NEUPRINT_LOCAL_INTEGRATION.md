# NeuPrint Local Integration Feasibility Study

## Current Remote Dependency
NeuroFly currently depends on the remote Janelia NeuPrint service (`neuprint.janelia.org`) via the `neuprint-python` client. This dependency is centralized in `src/data/connector.py` and `scripts/build_full_cns_nbf.py`.
The application uses this service for:
1. `Client(server, dataset, token)`: Authentication and connection setup.
2. `fetch_custom(cypher)`: Executing Cypher queries to extract neuron metadata, soma locations, ROIs, and synaptic connectivity (edges).
3. `fetch_skeleton(body_id)`: Retrieving morphology data (skeleton nodes and radii) for specific neurons.

## Failure Reason
The current remote service at `neuprint.janelia.org` (and the dataset domain `male-cns.janelia.org`) is timing out (`urllib3.exceptions.ConnectTimeoutError`). This indicates a network outage at Janelia or a strict network firewall blocking outbound requests to those domains. 

## Local neuPrintHTTP Feasibility
**LOCAL_NEUPRINTHTTP_STATUS = NOT_FEASIBLE**

While the open-source `neuPrintHTTP` repository (https://github.com/connectome-neuprint/neuPrintHTTP) can be built and run locally (it requires Go 1.16+), it functions strictly as a REST API/HTTP layer over a Neo4j (Bolt) database and an optional DVID server. It does not include data itself.

To run `neuPrintHTTP` locally for the MaleCNS dataset, we would need the raw MaleCNS v1.0 Neo4j database dump to populate our local Neo4j instance. However, because Janelia's servers are currently unreachable, we cannot download the database dump. Furthermore, a connectome the size of MaleCNS (30,000+ neurons, millions of synapses) is typically hundreds of gigabytes and not trivially hosted locally without significant infrastructure.

## Backend Compatibility
- **NEO4J_COMPATIBILITY**: The MaleCNS backend uses a standard Neo4j graph structure that `neuPrintHTTP` is designed for. If the database dump were accessible, it would be theoretically compatible using the `neuPrint-bolt` engine config.
- **SKELETON_BACKEND_STATUS**: Janelia typically stores skeletons in DVID, not Neo4j. We would likely need to run a local DVID server as well to serve the skeletons through `neuPrintHTTP`, which adds immense infrastructure complexity for a dataset this large.

## Exact Architecture Evaluated
We evaluated the architecture requested:
NeuroFly -> Local Adapter -> `http://localhost:11000` -> neuPrintHTTP -> Local Neo4j (MaleCNS dump).

## Smallest Possible Alternative Recommendation
Because standing up a local `neuPrintHTTP` + Neo4j + DVID cluster for the entire MaleCNS is currently impossible due to the data source outage (and highly impractical due to size), the recommended alternative is to **preserve the existing offline cache mode**.

NeuroFly's `src/analysis/circuit_extraction.py` already includes a resilient fallback:
```python
try:
    self.connector = NeuPrintConnector()
except RealDataUnavailableError as e:
    print(f"NeuPrintConnector init failed: {e}. Running in offline cache mode.", file=os.sys.stderr)
    self.connector = None
```
When NeuPrint is unreachable, it seamlessly falls back to the locally cached `roi_MBR.nbf` and `nodes.json` data, completely preserving the working frontend, visualization, Brian2 simulation, and live news feed without requiring any architectural changes or massive local databases. 

We should rely entirely on this built-in resilience until Janelia's remote API is restored.
