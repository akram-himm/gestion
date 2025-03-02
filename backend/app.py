from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from data_manager import DataManager
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5000"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize DataManager
data_dir = os.path.join(os.path.dirname(__file__), 'data')
dm = DataManager(
    os.path.join(data_dir, 'progress_data.json'),
    os.path.join(data_dir, 'historical_data.json')
)

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route("/api/modules", methods=["GET"])
def get_modules():
    dm.daily_reset()
    return jsonify({
        "current": dm.get_current_data(),
        "historical": dm.get_historical_data()
    })

@app.route("/api/module/<module_name>", methods=["GET"])
def get_module(module_name):
    module_data = dm.get_module_data(module_name)
    return jsonify(module_data) if module_data else ('', 404)

@app.route("/api/progress", methods=["POST"])
def update_progress():
    data = request.get_json()
    if not data or not all(k in data for k in ['module', 'subject', 'status']):
        return jsonify({"error": "Missing required fields"}), 400
    
    if dm.update_status(data["module"], data["subject"], data["status"]):
        return jsonify({"status": "success"})
    return jsonify({"error": "Update failed"}), 400

@app.route("/api/delete", methods=["POST"])
def delete_subject():
    data = request.get_json()
    if not data or not all(k in data for k in ['module', 'subject']):
        return jsonify({"error": "Missing required fields"}), 400
    
    if dm.delete_subject(data["module"], data["subject"]):
        return jsonify({"status": "deleted"})
    return jsonify({"error": "Subject not found"}), 404

if __name__ == "__main__":
    app.run(debug=True, port=5000)