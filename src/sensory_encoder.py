class SensoryEncoder:
    """
    Translates controlled experimental conditions into explicit 
    computational stimulus parameters for the Brian2 network.
    
    Assumption: The input mapping (e.g., condition 'A' -> specific KC indices)
    is an explicit computational assumption (see docs/MODEL_ASSUMPTIONS.md).
    """
    def __init__(self, kc_count: int):
        self.kc_count = kc_count

    def encode_condition(self, condition: str, target_kc_ratio: float = 0.1) -> dict:
        """
        Encodes a controlled experimental condition.
        
        Args:
            condition: 'baseline', 'reward_pairing', 'punishment_pairing', or 'test'
            target_kc_ratio: Proportion of KCs to activate (default 10% sparse coding)
            
        Returns:
            dict: {
                'active_kc_indices': [list of ints],
                'pam_stimulus': float (reward current),
                'ppl1_stimulus': float (punishment current),
                'condition': str
            }
        """
        # Determine number of KCs to activate
        num_active = max(1, int(self.kc_count * target_kc_ratio))
        
        # For a reproducible experiment, we deterministically select KCs based on the condition
        # Condition A ('reward_pairing' / 'test_A') uses the first block of KCs
        # Condition B ('punishment_pairing' / 'test_B') uses the second block of KCs
        
        active_kcs = []
        pam_stim = 0.0
        ppl1_stim = 0.0
        
        if condition in ['reward_pairing', 'test_A']:
            active_kcs = list(range(0, num_active))
            if condition == 'reward_pairing':
                pam_stim = 10.0 # 10 mV current injection to PAM (Assumed value for STDP modulation)
                
        elif condition in ['punishment_pairing', 'test_B']:
            active_kcs = list(range(num_active, num_active * 2))
            if condition == 'punishment_pairing':
                ppl1_stim = 10.0 # 10 mV current injection to PPL1
                
        elif condition == 'baseline':
            active_kcs = []
            
        return {
            'active_kc_indices': active_kcs,
            'pam_stimulus': pam_stim,
            'ppl1_stimulus': ppl1_stim,
            'condition': condition
        }
