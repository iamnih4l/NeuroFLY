import networkx as nx
from src.data.connector import NeuPrintConnector
from src.data.schema import Circuit

class DataExtractor:
    def __init__(self):
        # The NeuPrintConnector handles authentication enforcement and cypher queries
        self.connector = NeuPrintConnector()

    def get_mushroom_body_subgraph(self, max_nodes: int = 5000) -> nx.DiGraph:
        """
        Fetches the verified Mushroom Body subgraph (KCs, MBONs, DANs)
        and converts it into a NetworkX directed graph for the simulator.
        """
        circuit: Circuit = self.connector.get_mushroom_body_circuit(max_nodes=max_nodes)
        
        G = nx.DiGraph()
        G.graph['provenance'] = circuit.provenance
        
        for n in circuit.neurons:
            G.add_node(
                n.neuron_id,
                cell_type=n.cell_type,
                region=n.region,
                x=n.x,
                y=n.y,
                z=n.z,
                provenance=n.provenance.__dict__,
                skeleton=n.skeleton
            )
            
        for c in circuit.connections:
            # Only add the edge if both nodes exist in the graph (safety check)
            if G.has_node(c.source_id) and G.has_node(c.target_id):
                G.add_edge(
                    c.source_id, 
                    c.target_id, 
                    weight=c.weight, 
                    provenance=c.provenance.__dict__,
                    synapse_locations=c.synapse_locations
                )
            
        print(f"Extracted verified NetworkX graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges.")
        return G
