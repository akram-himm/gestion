# backend/app.py
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from data_manager import DataManager
import datetime

app = Flask(__name__, static_folder='../frontend', static_url_path='')
# In backend/app.py
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]
    }
})

dm = DataManager("progress_data.json", "historical_data.json")

@app.route("/")
def index():
    return send_from_directory(app.static_folder, 'index.html')

# backend/app.py
@app.route("/api/modules", methods=["GET"])
def get_modules():
    dm.daily_reset()
    return jsonify({
        "current": dm.get_current_data(),
        "historical": dm.get_historical_data()
    })

@app.route("/api/module/<module_name>", methods=["GET"])
def get_module(module_name):
    return jsonify(dm.get_module_data(module_name))

@app.route("/api/progress", methods=["POST"])
def update_progress():
    data = request.json
    dm.update_status(data["module"], data["subject"], data["status"])
    return jsonify({"status": "success"})

@app.route("/api/delete", methods=["POST"])
def delete_subject():
    data = request.json
    module = data.get("module")
    subject = data.get("subject")
    if not module or not subject:
        return jsonify({"error": "Missing fields"}), 400

    # Tente de supprimer la matière via DataManager
    success = dm.delete_subject(module, subject)
    if not success:
        return jsonify({"error": f"Subject '{subject}' not found in module '{module}'"}), 404

    return jsonify({"status": "deleted"}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)