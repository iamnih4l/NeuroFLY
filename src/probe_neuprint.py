import sys
import time
from src.config import Config
from src.data.connector import (
    NeuPrintConnector,
    AuthenticationError,
    DatasetNotFoundError,
    DatasetValidationError,
    UpstreamTimeoutError,
    UpstreamUnavailableError,
    RateLimitError,
    NetworkError,
    RealDataUnavailableError
)

def run_probe():
    print("NEUROFLY LIVE DATA PROBE")
    print("--------------------------------")
    print(f"Endpoint:\n{Config.NEUPRINT_SERVER}\n")
    print(f"Target dataset:\n{Config.NEUPRINT_DATASET}\n")
    
    start_time = time.time()
    try:
        # 1. Connect (Authentication check built-in)
        connector = NeuPrintConnector(max_retries=2, base_backoff_sec=1)
        print("Authentication:\nPASS\n")
        
        # 2. Dataset discovery & identity
        try:
            q_meta = "MATCH (n:Meta) RETURN n.dataset AS dataset, n.tag AS tag LIMIT 1"
            meta_res = connector.client.fetch_custom(q_meta)
            if meta_res.empty:
                raise DatasetNotFoundError(f"Dataset {Config.NEUPRINT_DATASET} missing or empty.")
            server_dataset = meta_res.iloc[0]['dataset']
            server_tag = meta_res.iloc[0]['tag']
            server_full_id = f"{server_dataset}:{server_tag}"
            
            print("Dataset discovery:\nPASS\n")
            
            if server_full_id != Config.NEUPRINT_DATASET:
                print(f"REQUESTED DATASET:\n{Config.NEUPRINT_DATASET}")
                print(f"SERVER DATASET:\n{server_full_id}")
                print("IDENTITY:\nFAIL\n")
                print("Result:\nDATASET_IDENTITY_UNKNOWN")
                return
            else:
                print("Dataset identity:\nPASS\n")
                
        except Exception as e:
            if "not found" in str(e).lower() or isinstance(e, DatasetNotFoundError):
                print("Dataset discovery:\nFAIL\n")
                print("Result:\nDATASET_NOT_FOUND")
                return
            raise
        
        # 3. Minimal query
        q_min = "MATCH (n:Neuron) RETURN count(n) AS c LIMIT 1"
        min_res = connector.client.fetch_custom(q_min)
        if min_res.empty or min_res.iloc[0]['c'] == 0:
            print("Minimal query:\nFAIL\n")
            print("Result:\nDATASET_SCHEMA_INVALID")
            return
            
        print("Minimal query:\nPASS\n")
        
        latency_ms = int((time.time() - start_time) * 1000)
        print(f"Response latency:\n{latency_ms} ms\n")
        print("Result:\nREAL_DATA_READY")
        
    except AuthenticationError:
        print("Authentication:\nFAIL\n")
        print("Result:\nAUTHENTICATION_FAILED")
    except UpstreamTimeoutError:
        print("Authentication:\nUNKNOWN / NOT COMPLETED\n")
        print("Dataset:\nNOT VERIFIED\n")
        print("Server:\nUPSTREAM TIMEOUT\n")
        print("HTTP:\n504\n")
        print("Result:\nUPSTREAM_TIMEOUT\n")
        print("Scientific execution:\nBLOCKED\n")
        print("Mock fallback:\nDISABLED")
    except UpstreamUnavailableError:
        print("Authentication:\nUNKNOWN / NOT COMPLETED\n")
        print("Dataset:\nNOT VERIFIED\n")
        print("Server:\nUPSTREAM UNAVAILABLE\n")
        print("HTTP:\n502/503\n")
        print("Result:\nUPSTREAM_UNAVAILABLE\n")
        print("Scientific execution:\nBLOCKED\n")
        print("Mock fallback:\nDISABLED")
    except DatasetNotFoundError:
        print("Dataset:\nNOT VERIFIED\n")
        print("Result:\nDATASET_NOT_FOUND")
    except NetworkError:
        print("Result:\nNETWORK_ERROR")
    except RealDataUnavailableError as e:
        print(f"Result:\nREAL_DATA_UNAVAILABLE ({e})")
    except Exception as e:
        print(f"Result:\nUNKNOWN_ERROR ({type(e).__name__})")

if __name__ == "__main__":
    run_probe()
