document.addEventListener("DOMContentLoaded", async () => {
    console.log("Table script running!");

    try {
        // Récupérer les données depuis le backend
        const response = await fetch("http://127.0.0.1:5000/progression");
        const data = await response.json();
        console.log("Data for table:", data);

        // data ressemble à :
        // {
        //   "Math": {"Algebra": 80, "Analysis": 60, ...},
        //   "Programming": {"Python": 90, "C++": 70, ...},
        //   ...
        // }

        // Sélectionner le <tbody> du tableau
        const tableBody = document.querySelector("#modulesTable tbody");
        if (!tableBody) {
            throw new Error("Table body not found!");
        }

        // Parcourir chaque module et ses matières
        for (const moduleName in data) {
            const matieres = data[moduleName];
            for (const matiereName in matieres) {
                // Créer une ligne
                const tr = document.createElement("tr");

                // Colonne Module
                const tdModule = document.createElement("td");
                tdModule.textContent = moduleName;
                tr.appendChild(tdModule);

                // Colonne Matière
                const tdMatiere = document.createElement("td");
                tdMatiere.textContent = matiereName;
                tr.appendChild(tdMatiere);

                // Colonne Statut (Done, En cours, Pas fait)
                // Pour l'instant, on va juste afficher le "statut" actuel
                // ou on va afficher la "progression" si tu préfères ?
                // Disons qu'on fait un <select> pour choisir le statut
                const tdStatut = document.createElement("td");
                const selectStatut = document.createElement("select");
                ["Done", "En cours", "Pas fait"].forEach(status => {
                    const option = document.createElement("option");
                    option.value = status;
                    option.textContent = status;
                    selectStatut.appendChild(option);
                });
                tdStatut.appendChild(selectStatut);
                tr.appendChild(tdStatut);

                // Colonne Action (bouton pour sauvegarder)
                const tdAction = document.createElement("td");
                const btnSave = document.createElement("button");
                btnSave.textContent = "Sauvegarder";
                btnSave.addEventListener("click", () => {
                    // Ici on pourra faire un POST /progression pour mettre à jour
                    // le statut de cette matière
                    console.log("Sauvegarde:", moduleName, matiereName, selectStatut.value);
                    updateStatus(moduleName, matiereName, selectStatut.value);
                });
                tdAction.appendChild(btnSave);
                tr.appendChild(tdAction);

                tableBody.appendChild(tr);
            }
        }

    } catch (error) {
        console.error("Error building table:", error);
    }
});

/**
 * Met à jour le statut d'une matière via un POST au backend
 */
async function updateStatus(moduleName, matiereName, newStatus) {
    try {
        // On envoie un POST au backend (à toi de définir la logique dans app.py)
        const response = await fetch("http://127.0.0.1:5000/progression", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                module: moduleName,
                subject: matiereName,
                // "value": newStatus  ou un autre champ si tu préfères
                value: newStatus 
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Update result:", result);

        alert(`Statut de ${moduleName} / ${matiereName} mis à jour en "${newStatus}"`);
    } catch (err) {
        console.error("Error updating status:", err);
        alert("Erreur lors de la mise à jour du statut");
    }
}
