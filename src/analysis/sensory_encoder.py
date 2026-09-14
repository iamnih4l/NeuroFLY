import re
import math
import hashlib
from typing import Dict, Any

class SemanticEncoder:
    """
    Extracts pseudo-deterministic semantic features from a NewsItem's text.
    Provides reproducible mapping from text content to biological proxies.
    """
    
    # Simple semantic heuristics for deterministic feature generation
    # without relying on heavy ML models.
    HIGH_SALIENCE_WORDS = {'crisis', 'breaking', 'alert', 'urgent', 'shock', 'discovery', 'crash', 'boom', 'war', 'attack', 'dead', 'new', 'first'}
    HIGH_ACTION_WORDS = {'run', 'speed', 'jump', 'crash', 'fall', 'rise', 'surge', 'plummet', 'escape', 'launch', 'strike'}
    
    @staticmethod
    def extract_features(news_item: Dict[str, Any], global_history_hashes: set = None) -> Dict[str, float]:
        """
        Takes a dictionary representation of NewsItem and computes normalized [0, 1] features.
        """
        title = news_item.get('title', '')
        desc = news_item.get('description', '') or ''
        text = f"{title} {desc}".lower()
        
        words = re.findall(r'\b\w+\b', text)
        word_count = len(words)
        
        # 1. Complexity (based on sentence length and unique words)
        unique_words = len(set(words))
        complexity = min(1.0, (unique_words / (word_count + 1)) * (word_count / 30.0))
        
        # 2. General Salience (based on strong keywords and exclamation marks)
        salience_hits = sum(1 for w in words if w in SemanticEncoder.HIGH_SALIENCE_WORDS)
        salience = min(1.0, (salience_hits * 0.3) + (0.2 if '!' in text else 0.0) + 0.1)
        
        # 3. Semantic Action Proxy (surrogate from verbs/action words, previously labeled 'motion')
        action_hits = sum(1 for w in words if w in SemanticEncoder.HIGH_ACTION_WORDS)
        semantic_action = min(1.0, (action_hits * 0.35) + 0.1)
        
        # Novelty (Based on recent exposure history if provided)
        novelty = 1.0
        if global_history_hashes is not None:
            # How similar is this hash to recent history? (Crude approximation)
            # In a real NLP app, this would be a vector embedding cosine distance.
            content_hash_str = hashlib.md5(text.encode()).hexdigest()
            if content_hash_str in global_history_hashes:
                novelty = 0.1 # Seen it before
            else:
                novelty = 0.9 # New
                
        return {
            'novelty': round(novelty, 3),
            'semantic_salience': round(salience, 3),
            'semantic_action': round(semantic_action, 3),
            'semantic_complexity': round(complexity, 3)
        }
