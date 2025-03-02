import json
import os
from datetime import datetime

class DataManager:
    def __init__(self, progress_path, historical_path):
        self.progress_path = progress_path
        self.historical_path = historical_path
        self.progress_data = self._load_data(progress_path)
        self.historical_data = self._load_data(historical_path)

    def _load_data(self, path):
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_data(self, data, path):
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)

    def daily_reset(self):
        today = datetime.now().strftime("%Y-%m-%d")
        if not self.historical_data or self.historical_data[-1]['date'] != today:
            self.historical_data.append({
                "date": today,
                "snapshot": [m.copy() for m in self.progress_data]
            })
            self._save_data(self.historical_data, self.historical_path)

    def get_current_data(self):
        return self.progress_data

    def get_historical_data(self):
        return self.historical_data

    def get_module_data(self, module_name):
        return next(
            (m for m in self.progress_data if m['module'] == module_name),
            None
        )

    def update_status(self, module_name, subject, status):
        for module in self.progress_data:
            if module['module'] == module_name:
                if subject in module['subjects']:
                    module['subjects'][subject]['status'] = status
                    module['subjects'][subject]['points'] = self._calculate_points(status)
                    self._save_data(self.progress_data, self.progress_path)
                    return True
        return False

    def _calculate_points(self, status):
        points_map = {'not-started': 0, 'in-progress': 2, 'done': 5}
        return points_map.get(status, 0)

    def delete_subject(self, module_name, subject):
        for module in self.progress_data:
            if module['module'] == module_name:
                if subject in module['subjects']:
                    del module['subjects'][subject]
                    self._save_data(self.progress_data, self.progress_path)
                    return True
        return False