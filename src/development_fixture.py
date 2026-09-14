import networkx as nx
import math
import random
from src.data.schema import ProvenanceMetadata

def generate_fixture_graph():
    """
    WARNING: THIS IS A DEVELOPMENT FIXTURE.
    DO NOT USE THIS FOR SCIENTIFIC EXPERIMENTS.
    It generates a synthetic graph mimicking the KC -> MBON <- DAN structure,
    including mock (x, y, z) coordinates so the 3D visualizer can be tested offline.
    """
    print("WARNING: GENERATING DEVELOPMENT FIXTURE GRAPH.")
    
    provenance = ProvenanceMetadata(
        source_organization="NeuroFly Development Fixture",
        dataset_name="Synthetic UI Test Graph",
        dataset_version="v0.0.0",
        retrieval_date="NONE",
        biological_status="DEVELOPMENT_FIXTURE",
        confidence="ZERO"
    )
    
    G = nx.DiGraph()
    G.graph['provenance'] = provenance
    
    # Generate 150 mock Kenyon Cells in a sphere
    for i in range(150):
        r = 10 * math.cbrt(random.random())
        theta = random.random() * 2 * math.pi
        phi = math.acos(2 * random.random() - 1)
        
        G.add_node(f"KC_{i}", cell_type="KC", region="Mushroom Body", 
                   x=r * math.sin(phi) * math.cos(theta),
                   y=r * math.sin(phi) * math.sin(theta) * 0.5,
                   z=r * math.cos(phi),
                   provenance=provenance.__dict__)

    # Generate 10 MBONs below the KCs
    for i in range(10):
        G.add_node(f"MBON_{i}", cell_type="MBON", region="Lobe",
                   x=(random.random() - 0.5) * 10,
                   y=-15 + random.random() * 5,
                   z=(random.random() - 0.5) * 10,
                   provenance=provenance.__dict__)

    # Generate 4 DANs (e.g., PAM/PPL1) near the MBONs
    for i in range(4):
        G.add_node(f"DAN_{i}", cell_type="DAN", region="PAM/PPL1",
                   x=(random.random() - 0.5) * 15,
                   y=-10 + random.random() * 5,
                   z=(random.random() - 0.5) * 15,
                   provenance=provenance.__dict__)

    # Connect KCs -> MBONs
    for i in range(150):
        for j in range(10):
            if random.random() < 0.1: # 10% connection probability
                G.add_edge(f"KC_{i}", f"MBON_{j}", weight=random.randint(1, 10), provenance=provenance.__dict__)

    # Connect DANs -> MBONs (Modulation)
    for i in range(4):
        for j in range(10):
            if random.random() < 0.3:
                G.add_edge(f"DAN_{i}", f"MBON_{j}", weight=random.randint(5, 20), provenance=provenance.__dict__)

    return G
