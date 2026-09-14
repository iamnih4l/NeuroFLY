import sqlite3
import json
import time
from pathlib import Path
from typing import Dict, Any, List

class NeuroStateManager:
    """
    Manages the persistent long-term computational state of the simulated fly brain.
    """
    def __init__(self, db_path: str = 'data/results.db', instance_id: int = 1):
        self.db_path = Path(db_path)
        self.instance_id = instance_id
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self.current_state = self._load_latest_state()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS neuro_state_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL,
                news_item_json TEXT,
                sensory_features_json TEXT,
                state_before_json TEXT,
                state_after_json TEXT,
                simulation_result_json TEXT
            )
        ''')
        c.execute('''
            CREATE TABLE IF NOT EXISTS current_neuro_state (
                id INTEGER PRIMARY KEY,
                adaptation REAL,
                habituation REAL,
                cumulative_exposure REAL,
                last_dopamine_level REAL
            )
        ''')
        conn.commit()
        conn.close()

    def _load_latest_state(self) -> Dict[str, float]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT adaptation, habituation, cumulative_exposure, last_dopamine_level FROM current_neuro_state WHERE id = ?', (self.instance_id,))
        row = c.fetchone()
        conn.close()
        
        if row:
            return {
                'adaptation': row[0],
                'habituation': row[1],
                'cumulative_exposure': row[2],
                'last_dopamine_level': row[3]
            }
        else:
            return {
                'adaptation': 0.0,
                'habituation': 0.0,
                'cumulative_exposure': 0.0,
                'last_dopamine_level': 0.0
            }

    def _save_current_state(self, state: Dict[str, float]):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            INSERT INTO current_neuro_state (id, adaptation, habituation, cumulative_exposure, last_dopamine_level)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                adaptation=excluded.adaptation,
                habituation=excluded.habituation,
                cumulative_exposure=excluded.cumulative_exposure,
                last_dopamine_level=excluded.last_dopamine_level
        ''', (self.instance_id, state['adaptation'], state['habituation'], state['cumulative_exposure'], state['last_dopamine_level']))
        conn.commit()
        conn.close()

    def get_history_hashes(self) -> set:
        """Returns hashes of recent news items to detect novelty/repetition."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT news_item_json FROM neuro_state_history ORDER BY timestamp DESC LIMIT 50')
        rows = c.fetchall()
        conn.close()
        
        hashes = set()
        import hashlib
        for r in rows:
            try:
                item = json.loads(r[0])
                text = f"{item.get('title','')} {item.get('description','')}".lower()
                hashes.add(hashlib.md5(text.encode()).hexdigest())
            except:
                pass
        return hashes

    def get_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT timestamp, news_item_json, sensory_features_json, state_before_json, state_after_json, simulation_result_json FROM neuro_state_history ORDER BY timestamp ASC LIMIT ?', (limit,))
        rows = c.fetchall()
        conn.close()
        
        res = []
        for r in rows:
            res.append({
                'timestamp': r[0],
                'news_item': json.loads(r[1]),
                'sensory_features': json.loads(r[2]),
                'state_before': json.loads(r[3]),
                'state_after': json.loads(r[4]),
                'simulation_result': json.loads(r[5])
            })
        return res

    def process_exposure(self, news_item: Dict[str, Any], sensory_features: Dict[str, float], simulation_result: Dict[str, Any]) -> Dict[str, float]:
        """
        Update long-term state based on sensory input and modeled network activity.
        """
        state_before = self.current_state.copy()
        
        # 1. Habituation increases with repetition and low novelty
        novelty = sensory_features.get('novelty', 1.0)
        self.current_state['habituation'] = min(1.0, self.current_state['habituation'] * 0.9 + (1.0 - novelty) * 0.2)
        
        # 2. Adaptation decays over time and spikes with high salience/action/visual complexity
        semantic_salience = sensory_features.get('semantic_salience', 0.0)
        semantic_action = sensory_features.get('semantic_action', 0.0)
        visual_complexity = sensory_features.get('visual_complexity', 0.0)
        
        # Combine semantic and visual features for adaptation spike
        combined_salience = (semantic_salience * 0.4) + (semantic_action * 0.3) + (visual_complexity * 0.3)
        self.current_state['adaptation'] = min(1.0, self.current_state['adaptation'] * 0.95 + (combined_salience * 0.3))
        
        # 3. Cumulative exposure time (rough estimate +10s per item)
        self.current_state['cumulative_exposure'] += 10.0
        
        # 4. Modulatory proxy (e.g. dopamine proxy from modeled active neurons)
        active_neurons = simulation_result.get('active_neurons', 0)
        total_spikes = simulation_result.get('total_spikes', 0)
        
        # Modulatory output modeled as a non-linear function of novelty, salience, and spikes
        mod_output = (novelty * 0.5 + (combined_salience * 0.5)) * (min(1.0, active_neurons / 10.0))
        self.current_state['last_dopamine_level'] = round(mod_output, 3)
        
        state_after = self.current_state.copy()
        
        # Save to DB
        self._save_current_state(self.current_state)
        
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        class NumpyEncoder(json.JSONEncoder):
            def default(self, obj):
                import numpy as np
                if isinstance(obj, np.integer):
                    return int(obj)
                if isinstance(obj, np.floating):
                    return float(obj)
                if isinstance(obj, np.ndarray):
                    return obj.tolist()
                return super(NumpyEncoder, self).default(obj)
                
        c.execute('''
            INSERT INTO neuro_state_history (timestamp, news_item_json, sensory_features_json, state_before_json, state_after_json, simulation_result_json)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            time.time(),
            json.dumps(news_item, cls=NumpyEncoder),
            json.dumps(sensory_features, cls=NumpyEncoder),
            json.dumps(state_before, cls=NumpyEncoder),
            json.dumps(state_after, cls=NumpyEncoder),
            json.dumps(simulation_result, cls=NumpyEncoder)
        ))
        conn.commit()
        conn.close()
        
        return state_after
