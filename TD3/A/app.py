from flask import Flask, request, jsonify
from utils.consensus import ConsensusManager
import config

app = Flask(__name__)
consensus_manager = ConsensusManager()

@app.route('/register', methods=['POST'])
def register_model():
    data = request.get_json()
    model_id = data.get('model_id')
    
    try:
        consensus_manager.register_model(model_id, config.INITIAL_DEPOSIT)
        return jsonify({
            "status": "success",
            "message": f"Model {model_id} registered successfully",
            "initial_deposit": config.INITIAL_DEPOSIT
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    model_predictions = data.get('predictions', {})
    
    if not model_predictions:
        return jsonify({"status": "error", "message": "No predictions provided"}), 400
        
    try:
        consensus_prediction = consensus_manager.weighted_average_prediction(model_predictions)
        
        # Implement slashing for models that deviate significantly from consensus
        for model_id, pred in model_predictions.items():
            if abs(pred - consensus_prediction) > config.SLASHING_THRESHOLD:
                consensus_manager.slash_model(model_id, config.SLASHING_PENALTY)
        
        return jsonify({
            "status": "success",
            "consensus_prediction": consensus_prediction
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000) 