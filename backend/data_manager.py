import json
import datetime
import os

class DataManager:
    def __init__(self, current_file="progress_data.json", historical_file="historical_data.json"):
        self.current_file = current_file
        self.historical_file = historical_file
        self._load_data()

    def _load_data(self):
        if not os.path.exists(self.current_file):
            # Structure initiale vide : pas de radars
            self.current_data = {
                "radars": {},
                "last_reset": str(datetime.date.today())
            }
            self._save_current()
        else:
            with open(self.current_file, "r") as f:
                self.current_data = json.load(f)

        if not os.path.exists(self.historical_file):
            self.historical_data = {}
            self._save_historical()
        else:
            with open(self.historical_file, "r") as f:
                self.historical_data = json.load(f)

    def _save_current(self):
        with open(self.current_file, "w") as f:
            json.dump(self.current_data, f, indent=2)

    def _save_historical(self):
        with open(self.historical_file, "w") as f:
            json.dump(self.historical_data, f, indent=2)

    def daily_reset(self):
        """Remet tous les sujets de tous les radars à 'Pas fait' si on est passé à un nouveau jour."""
        today = datetime.date.today()
        last_reset_str = self.current_data.get("last_reset", str(today))
        last_reset_date = datetime.date.fromisoformat(last_reset_str)
        if today > last_reset_date:
            # Pour chaque radar
            for radar_name, radar_data in self.current_data["radars"].items():
                # Pour chaque module
                for module_name, module_info in radar_data["modules"].items():
                    for subject in module_info["subjects"]:
                        subject["status"] = "Pas fait"
            self.current_data["last_reset"] = str(today)
            self._save_current()

    def get_current_data(self):
        return self.current_data

    def get_historical_data(self):
        return self.historical_data

    # ------------------ RADARS ------------------

    def create_radar(self, radar_name):
        """Crée un nouveau radar (vide)."""
        if radar_name in self.current_data["radars"]:
            return False
        self.current_data["radars"][radar_name] = {
            "modules": {}
        }
        self._save_current()
        return True

    def delete_radar(self, radar_name):
        """Supprime un radar dans current et historical."""
        if radar_name not in self.current_data["radars"]:
            return False
        del self.current_data["radars"][radar_name]
        self._save_current()

        if radar_name in self.historical_data:
            del self.historical_data[radar_name]
            self._save_historical()
        return True

    def rename_radar(self, old_name, new_name):
        """Renomme un radar (et déplace son historique)."""
        if old_name not in self.current_data["radars"]:
            return False
        if new_name in self.current_data["radars"]:
            return False  # On peut décider de fusionner ou interdire
        self.current_data["radars"][new_name] = self.current_data["radars"].pop(old_name)
        self._save_current()

        if old_name in self.historical_data:
            self.historical_data[new_name] = self.historical_data.pop(old_name)
            self._save_historical()
        return True

    # ------------------ MODULES / SUBJECTS ------------------

    def update_status(self, radar_name, module_name, subject_name, status):
        """Crée/Met à jour un sujet dans un module d'un radar. Met à jour l'historique."""
        # Vérifie que le radar existe
        if radar_name not in self.current_data["radars"]:
            # Le créer s'il n'existe pas
            self.current_data["radars"][radar_name] = {"modules": {}}

        # Vérifie que le module existe
        if module_name not in self.current_data["radars"][radar_name]["modules"]:
            self.current_data["radars"][radar_name]["modules"][module_name] = {"subjects": []}

        subjects = self.current_data["radars"][radar_name]["modules"][module_name]["subjects"]
        subject = next((s for s in subjects if s["name"] == subject_name), None)
        if not subject:
            subjects.append({"name": subject_name, "status": status})
        else:
            subject["status"] = status

        # Calcul des points
        total_points = sum(
            2 if s["status"] == "Done" else 1 if s["status"] == "En cours" else 0
            for s in subjects
        )

        # Mise à jour de l'historique
        today_str = str(datetime.date.today())
        if radar_name not in self.historical_data:
            self.historical_data[radar_name] = {}
        if module_name not in self.historical_data[radar_name]:
            self.historical_data[radar_name][module_name] = {}
        self.historical_data[radar_name][module_name][today_str] = total_points

        self._save_current()
        self._save_historical()

    def delete_subject(self, radar_name, module_name, subject_name):
        """Supprime un sujet dans un module d'un radar."""
        if radar_name not in self.current_data["radars"]:
            return False
        if module_name not in self.current_data["radars"][radar_name]["modules"]:
            return False

        subjects = self.current_data["radars"][radar_name]["modules"][module_name]["subjects"]
        new_subjects = [s for s in subjects if s["name"] != subject_name]
        if len(new_subjects) == len(subjects):
            return False
        self.current_data["radars"][radar_name]["modules"][module_name]["subjects"] = new_subjects
        self._save_current()
        return True

    def delete_module(self, radar_name, module_name):
        """Supprime un module complet d'un radar."""
        if radar_name not in self.current_data["radars"]:
            return False
        if module_name not in self.current_data["radars"][radar_name]["modules"]:
            return False

        del self.current_data["radars"][radar_name]["modules"][module_name]
        self._save_current()

        # Supprime aussi l'historique
        if radar_name in self.historical_data:
            if module_name in self.historical_data[radar_name]:
                del self.historical_data[radar_name][module_name]
                self._save_historical()
        return True

    def rename_module(self, radar_name, old_name, new_name):
        """Renomme un module au sein d'un radar."""
        if radar_name not in self.current_data["radars"]:
            return False
        if old_name not in self.current_data["radars"][radar_name]["modules"]:
            return False
        if new_name in self.current_data["radars"][radar_name]["modules"]:
            return False  # on peut fusionner ou interdire

        self.current_data["radars"][radar_name]["modules"][new_name] = \
            self.current_data["radars"][radar_name]["modules"].pop(old_name)
        self._save_current()

        if radar_name in self.historical_data:
            if old_name in self.historical_data[radar_name]:
                self.historical_data[radar_name][new_name] = \
                    self.historical_data[radar_name].pop(old_name)
                self._save_historical()
        return True


if __name__ == "__main__":
    dm = DataManager()
    print(dm.get_current_data())
