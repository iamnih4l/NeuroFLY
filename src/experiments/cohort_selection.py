import os
import sqlite3
import json
import time
from pathlib import Path
from src.data.connector import NeuPrintConnector

class CohortSelector:
    def __init__(self):
        self.db_path = Path('data/results.db')
        self.connector = NeuPrintConnector()
        
    def select_cohort(self, limit=5):
        print(f"Selecting Top {limit} dopaminergic circuits for Research Cohort...")
        
        # 1. Fetch from local DB
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            SELECT body_id, neuron_type, is_dan, is_pam, is_ppl1 
            FROM dopaminergic_neurons 
            WHERE is_dan=1 OR is_pam=1 OR is_ppl1=1
        ''')
        candidates = c.fetchall()
        conn.close()
        
        if not candidates:
            print("No authoritative dopaminergic neurons found in local cache.")
            return []
            
        # We will select a subset to query to avoid massive NeuPrint payloads
        # Let's take the first 100 PAM/PPL1/DANs to rank
        sample_ids = [row[0] for row in candidates[:100]]
        
        # 2. Query NeuPrint for connectivity metrics
        body_id_list = "[" + ",".join(sample_ids) + "]"
        
        q = f"""
            MATCH (n:Neuron)-[e:ConnectsTo]->(m:Neuron)
            WHERE n.bodyId IN {body_id_list}
            RETURN n.bodyId AS body_id, count(e) AS out_degree, sum(e.weight) AS total_weight
            ORDER BY total_weight DESC
            LIMIT {limit}
        """
        
        df = self.connector.client.fetch_custom(q)
        
        cohort = []
        for _, row in df.iterrows():
            bid = str(row['body_id'])
            
            # Find metadata
            meta = next((c for c in candidates if c[0] == bid), None)
            
            circuit_info = {
                "body_id": bid,
                "neuron_type": meta[1] if meta else "UNKNOWN",
                "out_degree": int(row['out_degree']),
                "total_weight": int(row['total_weight']),
                "selection_criteria": "Ranked by total outgoing synaptic weight"
            }
            cohort.append(circuit_info)
            
        print(f"Cohort selection complete. Selected {len(cohort)} circuits.")
        
        # Cache cohort
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS research_cohort (
                body_id TEXT PRIMARY KEY,
                metadata TEXT
            )
        ''')
        c.execute("DELETE FROM research_cohort")
        for c_info in cohort:
            c.execute("INSERT INTO research_cohort (body_id, metadata) VALUES (?, ?)", 
                      (c_info['body_id'], json.dumps(c_info)))
        conn.commit()
        conn.close()
        
        return cohort

if __name__ == '__main__':
    selector = CohortSelector()
    cohort = selector.select_cohort(limit=5)
    for c in cohort:
        print(c)
