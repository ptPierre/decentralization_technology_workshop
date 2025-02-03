from abc import ABC, abstractmethod

class BaseModel(ABC):
    def __init__(self, model_id):
        self.model_id = model_id
        
    @abstractmethod
    def predict(self, features):
        """Make predictions on input features"""
        pass
    
    @abstractmethod
    def train(self, X, y):
        """Train the model on given data"""
        pass 