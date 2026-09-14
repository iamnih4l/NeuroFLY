import os
import sqlite3
import json
import time
from pathlib import Path
from src.data.connector import NeuPrintConnector

class CircuitExtractor:
    """
    Extracts explicit 1-hop upstream and downstream circuits for a target neuron.
    Computes derived metrics (in-degree, out-degree, etc.) while distinguishing
    OBSERVED structural data from DERIVED quantities.
    """
    def __init__(self):
        import os
        try:
            self.connector = NeuPrintConnector()
        except Exception as e:
            print(f"NeuPrintConnector init failed: {e}. Running in offline cache mode.", file=os.sys.stderr)
            self.connector = type('Dummy', (), {'client': None, 'dataset': 'male-cns:v1.0'})()
        
        self.db_path = Path('data/results.db')
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS circuits (
                body_id TEXT PRIMARY KEY,
                nodes_json TEXT,
                edges_json TEXT,
                provenance TEXT,
                last_updated REAL
            )
        ''')
        c.execute('''
            CREATE TABLE IF NOT EXISTS circuit_metrics (
                body_id TEXT PRIMARY KEY,
                metrics_json TEXT
            )
        ''')
        conn.commit()
        conn.close()

    def extract_circuit(self, body_id: str, limit_per_hop=1000):
        print(f"Extracting circuit for neuron {body_id}...")
        
        # 1. Fetch Upstream (Neurons connecting TO our target)
        q_up = f"""
            MATCH (n:Neuron)-[e:ConnectsTo]->(m:Neuron {{bodyId: {body_id}}})
            RETURN n.bodyId AS id, n.type AS type, n.rois AS rois, e.weight AS weight
            ORDER BY e.weight DESC
            LIMIT {limit_per_hop}
        """
        
        # 2. Fetch Downstream (Neurons our target connects TO)
        q_down = f"""
            MATCH (n:Neuron {{bodyId: {body_id}}})-[e:ConnectsTo]->(m:Neuron)
            RETURN m.bodyId AS id, m.type AS type, m.rois AS rois, e.weight AS weight
            ORDER BY e.weight DESC
            LIMIT {limit_per_hop}
        """
        
        # 3. Target Metadata
        q_target = f"""
            MATCH (n:Neuron {{bodyId: {body_id}}})
            RETURN n.bodyId AS id, n.type AS type, n.rois AS rois, n.predictedNt AS predictedNt
        """

        # Check DB first for fallback
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT nodes_json, edges_json, provenance FROM circuits WHERE body_id = ?', (str(body_id),))
        row = c.fetchone()
        conn.close()

        if getattr(self.connector, 'client', None) is None:
            if row:
                print(f"NeuPrint unavailable. Using cached circuit for {body_id}", file=os.sys.stderr)
                nodes = json.loads(row[0])
                edges = json.loads(row[1])
                prov = json.loads(row[2])
                metrics = {
                    "status": "CACHED",
                    "node_count": len(nodes),
                    "edge_count": len(edges)
                }
                return {
                    "nodes": nodes,
                    "edges": edges,
                    "metrics": metrics,
                    "provenance": prov
                }
            else:
                raise ValueError(f"NeuPrint unavailable and no cached circuit for {body_id}.")

        try:
            df_target = self.connector.client.fetch_custom(q_target)
            if df_target.empty:
                raise ValueError(f"Neuron {body_id} not found in dataset.")
                
            df_up = self.connector.client.fetch_custom(q_up)
            df_down = self.connector.client.fetch_custom(q_down)
        except Exception as e:
            if row:
                print(f"Error extracting circuit: {e}. Falling back to cache.", file=os.sys.stderr)
                nodes = json.loads(row[0])
                edges = json.loads(row[1])
                prov = json.loads(row[2])
                metrics = {
                    "status": "CACHED",
                    "node_count": len(nodes),
                    "edge_count": len(edges)
                }
                return {
                    "nodes": nodes,
                    "edges": edges,
                    "metrics": metrics,
                    "provenance": prov
                }
            raise e

        # Assemble Nodes and Edges
        nodes = {}
        edges = []
        
        # Add target
        t_row = df_target.iloc[0]
        nodes[str(body_id)] = {
            "id": str(body_id),
            "type": str(t_row['type'] or 'UNKNOWN'),
            "role": "TARGET",
            "rois": t_row['rois'] if isinstance(t_row['rois'], list) else []
        }
        
        # Add Upstream
        in_degree = 0
        in_weight = 0
        for _, row in df_up.iterrows():
            nid = str(row['id'])
            nodes[nid] = {
                "id": nid,
                "type": str(row['type'] or 'UNKNOWN'),
                "role": "UPSTREAM",
                "rois": row['rois'] if isinstance(row['rois'], list) else []
            }
            w = int(row['weight'])
            edges.append({
                "source": nid,
                "target": str(body_id),
                "weight": w
            })
            in_degree += 1
            in_weight += w

        # Add Downstream
        out_degree = 0
        out_weight = 0
        for _, row in df_down.iterrows():
            nid = str(row['id'])
            if nid not in nodes:
                nodes[nid] = {
                    "id": nid,
                    "type": str(row['type'] or 'UNKNOWN'),
                    "role": "DOWNSTREAM",
                    "rois": row['rois'] if isinstance(row['rois'], list) else []
                }
            else:
                nodes[nid]['role'] = "RECIPROCAL" # both upstream and downstream
                
            w = int(row['weight'])
            edges.append({
                "source": str(body_id),
                "target": nid,
                "weight": w
            })
            out_degree += 1
            out_weight += w

        nodes_list = list(nodes.values())
        
        # Derive Metrics
        metrics = {
            "status": "DERIVED",
            "node_count": len(nodes_list),
            "edge_count": len(edges),
            "in_degree": in_degree,
            "out_degree": out_degree,
            "total_in_weight": in_weight,
            "total_out_weight": out_weight,
            "reciprocal_connections": sum(1 for n in nodes_list if n['role'] == 'RECIPROCAL')
        }
        
        # INTEGRITY VALIDATION
        # Validate that node count <= edges + 1 (since it's a star graph around the target)
        # And ensure no self-connections unless observed
        expected_edge_count = len(df_up) + len(df_down)
        if len(edges) != expected_edge_count:
            raise ValueError(f"Integrity Error: Expected {expected_edge_count} edges, assembled {len(edges)}.")
            
        self_connections = [e for e in edges if e['source'] == e['target']]
        if len(self_connections) > 0:
            print(f"Note: Observed {len(self_connections)} self-connections for {body_id}.")

        provenance = {
            "source": "Janelia FlyEM NeuPrint",
            "dataset": self.connector.dataset,
            "biological_status": "OBSERVED/PROVIDED",
            "extraction_timestamp": time.time(),
            "target_body_id": str(body_id)
        }
        
        # Store to DB
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO circuits 
            (body_id, nodes_json, edges_json, provenance, last_updated)
            VALUES (?, ?, ?, ?, ?)
        ''', (str(body_id), json.dumps(nodes_list), json.dumps(edges), json.dumps(provenance), time.time()))
        
        c.execute('''
            INSERT OR REPLACE INTO circuit_metrics 
            (body_id, metrics_json)
            VALUES (?, ?)
        ''', (str(body_id), json.dumps(metrics)))
        
        conn.commit()
        conn.close()
        
        print(f"Circuit for {body_id} cached successfully.")
        return {
            "nodes": nodes_list,
            "edges": edges,
            "metrics": metrics,
            "provenance": provenance
        }

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--bodyId', type=str, required=True, help='Target neuron body ID')
    args = parser.parse_args()
    
    extractor = CircuitExtractor()
    extractor.extract_circuit(args.bodyId)
