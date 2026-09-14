import os
import sqlite3
import json
import time
from pathlib import Path
from src.data.connector import NeuPrintConnector

class DopamineExtractor:
    """
    Identifies dopaminergic neurons directly from the male-cns dataset
    using authoritative annotations (predictedNt, consensusNt, type).
    Stores results in the local SQLite database for fast API serving.
    """
    def __init__(self):
        self.connector = NeuPrintConnector()
        self.db_path = Path('data/results.db')
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS dopaminergic_neurons (
                body_id TEXT PRIMARY KEY,
                neuron_type TEXT,
                predicted_nt TEXT,
                consensus_nt TEXT,
                roi TEXT,
                classification_source TEXT,
                provenance TEXT,
                confidence REAL,
                is_dan BOOLEAN,
                is_pam BOOLEAN,
                is_ppl1 BOOLEAN
            )
        ''')
        conn.commit()
        conn.close()

    def extract_dopamine_neurons(self, limit=5000):
        print("Extracting authoritative dopaminergic neurons from NeuPrint...")
        q = f"""
            MATCH (n:Neuron)
            WHERE n.predictedNt = 'dopamine' 
               OR n.consensusNt = 'dopamine'
               OR n.type CONTAINS 'DAN'
               OR n.type CONTAINS 'PAM'
               OR n.type CONTAINS 'PPL1'
            RETURN 
                n.bodyId AS body_id,
                n.type AS type,
                n.predictedNt AS predicted_nt,
                n.predictedNtConfidence AS confidence,
                n.consensusNt AS consensus_nt,
                n.rois AS rois
            LIMIT {limit}
        """
        
        df = self.connector.client.fetch_custom(q)
        print(f"Discovered {len(df)} dopaminergic neurons.")
        
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Clear existing
        c.execute("DELETE FROM dopaminergic_neurons")
        
        provenance = {
            "source": "Janelia FlyEM NeuPrint",
            "dataset": self.connector.dataset,
            "biological_status": "OBSERVED/PROVIDED",
            "extraction_timestamp": time.time()
        }
        
        prov_json = json.dumps(provenance)
        
        count = 0
        for _, row in df.iterrows():
            body_id = str(row['body_id'])
            n_type = str(row['type'] or 'UNKNOWN')
            p_nt = str(row['predicted_nt'] or 'UNKNOWN')
            c_nt = str(row['consensus_nt'] or 'UNKNOWN')
            conf = row['confidence'] if 'confidence' in row and row['confidence'] is not None else -1.0
            
            # Determine primary source of classification
            classification = []
            if p_nt == 'dopamine': classification.append('predictedNt')
            if c_nt == 'dopamine': classification.append('consensusNt')
            
            is_dan = 'DAN' in n_type
            is_pam = 'PAM' in n_type
            is_ppl1 = 'PPL1' in n_type
            
            if is_dan or is_pam or is_ppl1:
                classification.append('type')
            
            source_str = ', '.join(classification)
            
            rois = row['rois']
            roi_str = ','.join(rois) if isinstance(rois, list) else 'UNKNOWN'
            
            c.execute('''
                INSERT INTO dopaminergic_neurons 
                (body_id, neuron_type, predicted_nt, consensus_nt, roi, classification_source, provenance, confidence, is_dan, is_pam, is_ppl1)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (body_id, n_type, p_nt, c_nt, roi_str, source_str, prov_json, conf, is_dan, is_pam, is_ppl1))
            
            count += 1
            
        conn.commit()
        conn.close()
        print(f"Saved {count} dopaminergic neurons to results.db cache.")
        return count

if __name__ == '__main__':
    extractor = DopamineExtractor()
    extractor.extract_dopamine_neurons()
