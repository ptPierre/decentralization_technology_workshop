import json
import os
from datetime import datetime

class ConsensusManager:
    def __init__(self, db_path='database/balances.json'):
        self.db_path = db_path
        self._initialize_db()
        
    def _initialize_db(self):
        if not os.path.exists('database'):
            os.makedirs('database')
            
        if not os.path.exists(self.db_path):
            with open(self.db_path, 'w') as f:
                json.dump({}, f)
                
    def register_model(self, model_id, initial_deposit):
        with open(self.db_path, 'r+') as f:
            data = json.load(f)
            if model_id in data:
                raise ValueError(f"Model {model_id} already registered")
                
            data[model_id] = {
                "balance": initial_deposit,
                "weight": 1.0,
                "registered_at": datetime.now().isoformat()
            }
            
            f.seek(0)
            json.dump(data, f, indent=4)
            f.truncate()
            
    def slash_model(self, model_id, penalty):
        with open(self.db_path, 'r+') as f:
            data = json.load(f)
            if model_id not in data:
                raise ValueError(f"Model {model_id} not found")
                
            data[model_id]["balance"] -= penalty
            data[model_id]["weight"] *= 0.8  # Reduce weight after slashing
            
            f.seek(0)
            json.dump(data, f, indent=4)
            f.truncate()
            
    def get_model_weight(self, model_id):
        with open(self.db_path, 'r') as f:
            data = json.load(f)
            return data.get(model_id, {}).get("weight", 0.0)
            
    def weighted_average_prediction(self, predictions):
        """
        Calculate weighted average of predictions
        predictions: dict of {model_id: prediction}
        """
        total_weight = 0
        weighted_sum = 0
        
        for model_id, pred in predictions.items():
            weight = self.get_model_weight(model_id)
            weighted_sum += pred * weight
            total_weight += weight
            
        return weighted_sum / total_weight if total_weight > 0 else None 