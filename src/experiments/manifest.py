import uuid
from datetime import datetime
from dataclasses import dataclass, field, asdict
import json
from typing import Dict, Any

@dataclass
class ExperimentManifest:
    experiment_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    dataset: str = "male-cns"
    dataset_version: str = "v1.0"
    source: str = "Google / HHMI Janelia"
    environment: str = "production"
    random_seed: int = 42
    model_version: str = "LIF_STDP_v1"
    simulation_parameters: Dict[str, Any] = field(default_factory=lambda: {
        "tau_m": "10*ms",
        "v_rest": "-70*mV",
        "v_threshold": "-50*mV",
        "v_reset": "-65*mV",
        "stdp_A_plus": 0.01,
        "stdp_A_minus": -0.0105,
        "tau_plus": "20*ms",
        "tau_minus": "20*ms"
    })
    stimulus_id: str = "mock_news_corpus"
    
    def to_json(self):
        return json.dumps(asdict(self))
