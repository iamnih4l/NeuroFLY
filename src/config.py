import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # NeuPrint Settings
    NEUPRINT_SERVER = os.getenv("NEUPRINT_SERVER", "neuprint.janelia.org")
    NEUPRINT_DATASET = os.getenv("NEUPRINT_DATASET", "male-cns:v1.0")
    NEUPRINT_TOKEN = os.getenv("NEUPRINT_TOKEN") or os.getenv("NEUPRINT_APPLICATION_CREDENTIALS")
    
    # Simulation Parameters
    SIM_DURATION_MS = 100
    
    # LIF Neuron Parameters (Approximated)
    TAU_M = 20  # Membrane time constant (ms)
    V_REST = -70  # Resting potential (mV)
    V_RESET = -70  # Reset potential (mV)
    V_THRESH = -50  # Spike threshold (mV)
    
    # Noise/Background parameters
    BACKGROUND_RATE = 10  # Hz
