from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from data_manager import DataManager

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]
    }
})

# Initialize your DataManager with the JSON files
dm = DataManager("progress_data.json", "historical_data.json")

# ----------------- Serve HTML files explicitly ----------------- #
@app.route("/")
def serve_default():
    # By default, show the radar page
    return send_from_directory(app.static_folder, "radar.html")

@app.route("/radar.html")
def serve_radar():
    # Serve the radar page
    return send_from_directory(app.static_folder, "radar.html")

@app.route("/index.html")
def serve_index():
    # Serve the detail page (bar chart + table)
    return send_from_directory(app.static_folder, "index.html")

# Catch-all route to serve any other static file (scripts, images, etc.)
@app.route("/<path:path>")
def serve_static_file(path):
    return send_from_directory(app.static_folder, path)

# ----------------- API Routes ----------------- #
@app.route("/api/modules", methods=["GET"])
def get_modules():
    # Optional daily reset if that's your logic
    dm.daily_reset()
    return jsonify({
        "current": dm.get_current_data(),
        "historical": dm.get_historical_data()
    })

@app.route("/api/progress", methods=["POST"])
def update_progress():
    data = request.json
    module = data.get("module")
    subject = data.get("subject")
    status = data.get("status")
    if not module or not subject or status is None:
        return jsonify({"error": "Missing fields"}), 400

    dm.update_status(module, subject, status)
    return jsonify({"status": "success"})

@app.route("/api/delete", methods=["POST"])
def delete_subject():
    data = request.json
    module = data.get("module")
    subject = data.get("subject")
    if not module or not subject:
        return jsonify({"error": "Missing fields"}), 400

    success = dm.delete_subject(module, subject)
    if not success:
        return jsonify({"error": f"Subject '{subject}' not found in module '{module}'"}), 404

    return jsonify({"status": "deleted"}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
