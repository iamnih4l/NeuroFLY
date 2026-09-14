import pandas as pd
import numpy as np
import os
import random

def generate_mock_corpus(num_events=50, output_path='data/mock_news_corpus.csv'):
    """
    Generates a synthetic news corpus for the NeuroFly experiment.
    """
    print(f"Generating {num_events} mock news events...")
    
    categories = ['SCIENCE', 'POLITICS', 'FINANCE', 'ENVIRONMENT', 'TECHNOLOGY']
    
    data = []
    for i in range(num_events):
        category = random.choice(categories)
        
        # Valence [-1.0 to 1.0]. 
        # Politics leans slightly negative, Science leans slightly positive just for structure.
        if category == 'POLITICS':
            valence = np.random.normal(-0.3, 0.4)
        elif category == 'SCIENCE':
            valence = np.random.normal(0.3, 0.4)
        else:
            valence = np.random.normal(0, 0.5)
            
        valence = max(-1.0, min(1.0, valence))
        
        # Novelty [0.0 to 1.0]. Random for mock.
        novelty = random.uniform(0.1, 0.9)
        
        # Topic Vector (Sparse vector representing Kenyon Cell input)
        # We assume 50 possible features (matching the 50 KCs in the mock graph)
        # We activate exactly 5 KCs per event to represent sparse coding.
        active_features = random.sample(range(50), 5)
        topic_vector = ",".join(map(str, active_features))
        
        data.append({
            'event_id': f"EVENT_{i:04d}",
            'category': category,
            'valence_score': valence,
            'novelty_score': novelty,
            'topic_vector': topic_vector
        })
        
    df = pd.DataFrame(data)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Corpus saved to {output_path}")

if __name__ == "__main__":
    generate_mock_corpus()
