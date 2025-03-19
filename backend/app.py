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

dm = DataManager("progress_data.json", "historical_data.json")

@app.route("/")
def serve_default():
    return send_from_directory(app.static_folder, "radar.html")

@app.route("/radar.html")
def serve_radar():
    return send_from_directory(app.static_folder, "radar.html")

@app.route("/index.html")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static_file(path):
    return send_from_directory(app.static_folder, path)

# ----------------- API ROUTES ----------------- #

@app.route("/api/modules", methods=["GET"])
def get_all_data():
    """
    Comme dans l'ancienne version, on utilise /api/modules pour tout récupérer.
    On y stocke l'ensemble des radars, modules, et historique.
    """
    dm.daily_reset()
    return jsonify({
        "current": dm.get_current_data(),      # { "radars": {...}, "last_reset": ... }
        "historical": dm.get_historical_data() # { RadarName: { ModuleName: { date: points } } }
    })

@app.route("/api/progress", methods=["POST"])
def update_progress():
    """
    Mise à jour d'un sujet dans un module pour un radar donné.
    JSON attendu : { "radar":..., "module":..., "subject":..., "status":... }
    """
    data = request.json
    radar = data.get("radar")
    module = data.get("module")
    subject = data.get("subject")
    status = data.get("status")
    if not (radar and module and subject and status is not None):
        return jsonify({"error": "Missing fields"}), 400

    dm.update_status(radar, module, subject, status)
    return jsonify({"status": "success"})

@app.route("/api/delete", methods=["POST"])
def delete_subject():
    """
    Supprime un sujet d'un module dans un radar.
    JSON attendu : { "radar":..., "module":..., "subject":... }
    """
    data = request.json
    radar = data.get("radar")
    module = data.get("module")
    subject = data.get("subject")
    if not (radar and module and subject):
        return jsonify({"error": "Missing fields"}), 400

    success = dm.delete_subject(radar, module, subject)
    if not success:
        return jsonify({"error": f"Subject '{subject}' not found in module '{module}' (radar '{radar}')"}), 404

    return jsonify({"status": "deleted"}), 200

@app.route("/api/delete_module", methods=["POST"])
def delete_module():
    """
    Supprime un module complet dans un radar.
    JSON attendu : { "radar":..., "module":... }
    """
    data = request.json
    radar = data.get("radar")
    module = data.get("module")
    if not (radar and module):
        return jsonify({"error": "Missing fields"}), 400

    success = dm.delete_module(radar, module)
    if not success:
        return jsonify({"error": f"Module '{module}' not found in radar '{radar}'"}), 404

    return jsonify({"status": "deleted"}), 200

@app.route("/api/rename_module", methods=["POST"])
def rename_module():
    """
    Renomme un module dans un radar.
    JSON attendu : { "radar":..., "oldName":..., "newName":... }
    """
    data = request.json
    radar = data.get("radar")
    oldName = data.get("oldName")
    newName = data.get("newName")
    if not (radar and oldName and newName):
        return jsonify({"error": "Missing fields"}), 400

    success = dm.rename_module(radar, oldName, newName)
    if not success:
        return jsonify({"error": f"Cannot rename '{oldName}' in radar '{radar}'"}), 400

    return jsonify({"status": "renamed"}), 200

@app.route("/api/delete_radar", methods=["POST"])
def delete_radar():
    """
    Supprime un radar complet.
    JSON attendu : { "radar": ... }
    """
    data = request.json
    radar = data.get("radar")
    if not radar:
        return jsonify({"error": "Missing radar name"}), 400

    success = dm.delete_radar(radar)
    if not success:
        return jsonify({"error": f"Radar '{radar}' not found"}), 404

    return jsonify({"status": "deleted"}), 200

@app.route("/api/rename_radar", methods=["POST"])
def rename_radar():
    """
    Renomme un radar.
    JSON attendu : { "oldName":..., "newName":... }
    """
    data = request.json
    oldName = data.get("oldName")
    newName = data.get("newName")
    if not (oldName and newName):
        return jsonify({"error": "Missing fields"}), 400

    success = dm.rename_radar(oldName, newName)
    if not success:
        return jsonify({"error": f"Cannot rename radar '{oldName}' to '{newName}'"}), 400

    return jsonify({"status": "renamed"}), 200

@app.route("/api/new_radar", methods=["POST"])
def new_radar():
    """
    Crée un nouveau radar (vide).
    JSON attendu : { "radar": ... }
    """
    data = request.json
    radar = data.get("radar")
    if not radar:
        return jsonify({"error": "Missing radar name"}), 400

    success = dm.create_radar(radar)
    if not success:
        return jsonify({"error": f"Radar '{radar}' already exists"}), 400

    return jsonify({"status": "created"}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
