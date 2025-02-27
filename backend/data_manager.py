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
            self.current_data = {
                "modules": {
                    "Math": {
                        "subjects": [
                            {"name": "Algebra", "status": "Pas fait"},
                            {"name": "Analysis", "status": "Pas fait"}
                        ]
                    },
                    "Programming": {
                        "subjects": [
                            {"name": "Python", "status": "Pas fait"},
                            {"name": "C++", "status": "Pas fait"}
                        ]
                    },
                    "Law": {
                        "subjects": [
                            {"name": "Civil Law", "status": "Pas fait"},
                            {"name": "Criminal Law", "status": "Pas fait"}
                        ]
                    }
                },
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
        today = datetime.date.today()
        last_reset_str = self.current_data.get("last_reset", str(today))
        last_reset_date = datetime.date.fromisoformat(last_reset_str)

        if today > last_reset_date:
            for module_info in self.current_data["modules"].values():
                for subject in module_info["subjects"]:
                    subject["status"] = "Pas fait"
            self.current_data["last_reset"] = str(today)
            self._save_current()

    def get_current_data(self):
        return self.current_data

    def get_historical_data(self):
        return self.historical_data

    def get_data_for_module(self, module_name):
        module = self.current_data["modules"].get(module_name, {"subjects": []})
        histo = self.historical_data.get(module_name, {})
        return {
            "current": module,
            "historical": histo
        }

    def update_status(self, module_name, subject_name, status):
        if module_name not in self.current_data["modules"]:
            self.current_data["modules"][module_name] = {"subjects": []}
        subjects = self.current_data["modules"][module_name]["subjects"]

        subject = next((s for s in subjects if s["name"] == subject_name), None)
        if not subject:
            subjects.append({"name": subject_name, "status": status})
        else:
            subject["status"] = status

        today_str = str(datetime.date.today())
        if module_name not in self.historical_data:
            self.historical_data[module_name] = {}
        total_points = sum(
            2 if s["status"] == "Done" else 1 if s["status"] == "En cours" else 0
            for s in subjects
        )
        self.historical_data[module_name][today_str] = total_points

        self._save_current()
        self._save_historical()
    
    def delete_subject(self, module_name, subject_name):
    # Vérifie que le module existe
        if module_name not in self.current_data["modules"]:
            return False

        subjects = self.current_data["modules"][module_name].get("subjects", [])
        # Filtre pour supprimer la matière dont le nom correspond
        new_subjects = [s for s in subjects if s["name"] != subject_name]

        # Si aucune modification n'est faite, la matière n'existait pas
        if len(new_subjects) == len(subjects):
            return False

        # Met à jour la liste des matières pour le module
        self.current_data["modules"][module_name]["subjects"] = new_subjects
        self._save_current()
        return True


# Pour tester localement, vous pouvez ajouter ce bloc, mais ce n'est pas nécessaire dans l'import normal.
if __name__ == "__main__":
    dm = DataManager("progress_data.json", "historical_data.json")
    print(dm.get_current_data())
