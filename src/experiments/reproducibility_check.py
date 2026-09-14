import sqlite3
import numpy as np
from pathlib import Path
from src.experiments.research_experiment_runner import ResearchExperimentRunner
import traceback

def run_reproducibility_check():
    print("--- Starting Scientific Reproducibility Check ---")
    try:
        # Run 1
        runner1 = ResearchExperimentRunner(replicates=2) # use 2 replicates to save time in check
        res1 = runner1.run()
        exp_id_1 = res1["experiment_id"]
        
        # Run 2
        runner2 = ResearchExperimentRunner(target_body_id=runner1.target_body_id, replicates=2)
        res2 = runner2.run()
        exp_id_2 = res2["experiment_id"]
        
        # Compare
        db_path = Path('data/results.db')
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        c.execute("SELECT condition, ablation_status, seed, delta_rate_hz FROM experiment_replicates WHERE experiment_id = ? ORDER BY condition, ablation_status, seed", (exp_id_1,))
        data1 = c.fetchall()
        
        c.execute("SELECT condition, ablation_status, seed, delta_rate_hz FROM experiment_replicates WHERE experiment_id = ? ORDER BY condition, ablation_status, seed", (exp_id_2,))
        data2 = c.fetchall()
        
        conn.close()
        
        if len(data1) != len(data2):
            print(f"FAIL: Row counts differ ({len(data1)} vs {len(data2)})")
            return False
            
        max_diff = 0.0
        mismatches = []
        for r1, r2 in zip(data1, data2):
            if r1[0] != r2[0] or r1[1] != r2[1] or r1[2] != r2[2]:
                print(f"Condition mismatch! {r1} vs {r2}")
                return False
                
            diff = abs(r1[3] - r2[3])
            if diff > max_diff:
                max_diff = diff
            
            if diff > 1e-6:
                mismatches.append((r1, r2, diff))
                
        print(f"\nReproducibility Check Complete.")
        print(f"Max Absolute Difference: {max_diff}")
        if len(mismatches) == 0:
            print("STATUS: PASS (Deterministic reproducibility confirmed)")
            return True
        else:
            print(f"STATUS: FAIL ({len(mismatches)} numerical mismatches found)")
            return False
            
    except Exception as e:
        print("ERROR running reproducibility check:")
        traceback.print_exc()
        return False

if __name__ == '__main__':
    run_reproducibility_check()
