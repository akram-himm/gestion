document.addEventListener("DOMContentLoaded", async () => {
    console.log("Page loaded: Bar chart + Table");

    // Lire le paramètre "module" dans l'URL
    const params = new URLSearchParams(window.location.search);
    const moduleFilter = params.get("module");

    try {
        const data = await fetchData();
        // Filtrer si moduleFilter
        let filteredData;
        if (moduleFilter && data.modules[moduleFilter]) {
            filteredData = { [moduleFilter]: data.modules[moduleFilter] };
        } else if (moduleFilter) {
            alert(`Le module "${moduleFilter}" n'existe pas.`);
            return;
        } else {
            filteredData = data.modules;
        }

        buildBarChart(filteredData);
        buildTable(filteredData);
        setupAddMatiereRow(filteredData, moduleFilter);

    } catch (error) {
        console.error("Error in DOMContentLoaded:", error);
    }
});

async function fetchData() {
    const resp = await fetch("http://127.0.0.1:5000/api/modules");
    const { current } = await resp.json();
    return current;  // ex: { "modules": { "Math": {"subjects": [...]}, ...}, "last_reset": ... }
}

function buildBarChart(modulesObj) {
    const categories = [];
    const values = [];

    for (const moduleName in modulesObj) {
        const subjects = modulesObj[moduleName].subjects || [];
        for (const subj of subjects) {
            categories.push(`${moduleName} - ${subj.name}`);
            values.push(mapStatusToNumber(subj.status));
        }
    }

    const canvas = document.getElementById("progressChart");
    new Chart(canvas, {
        type: "bar",
        data: {
            labels: categories,
            datasets: [{
                label: "Points",
                data: values,
                backgroundColor: "rgba(54, 162, 235, 0.2)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 2 }
            }
        }
    });
}

function buildTable(modulesObj) {
    const tableBody = document.querySelector("#modulesTable tbody");
    tableBody.innerHTML = "";

    for (const moduleName in modulesObj) {
        const subjects = modulesObj[moduleName].subjects || [];
        for (const subj of subjects) {
            const tr = document.createElement("tr");

            // Colonne Module
            const tdModule = document.createElement("td");
            tdModule.textContent = moduleName;
            tr.appendChild(tdModule);

            // Colonne Matière
            const tdMatiere = document.createElement("td");
            tdMatiere.textContent = subj.name;
            tr.appendChild(tdMatiere);

            // Colonne Statut
            const tdStatut = document.createElement("td");
            const select = document.createElement("select");
            ["Done", "En cours", "Pas fait", "vide"].forEach(st => {
                const opt = document.createElement("option");
                opt.value = st;
                opt.textContent = st;
                if (st === subj.status) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            });
            select.addEventListener("change", async () => {
                await updateStatus(moduleName, subj.name, select.value);
                await refreshAll();
            });
            tdStatut.appendChild(select);
            tr.appendChild(tdStatut);

            // === NOUVEAU : Colonne Action, avec un bouton Supprimer ===
            const tdAction = document.createElement("td");
            const btnDelete = document.createElement("button");
            btnDelete.textContent = "Supprimer";
            // Quand on clique, on appelle deleteSubject(...)
            btnDelete.addEventListener("click", async () => {
                await deleteSubject(moduleName, subj.name);
                await refreshAll();
            });
            tdAction.appendChild(btnDelete);
            tr.appendChild(tdAction);
            // === fin de la nouvelle colonne Action

            tableBody.appendChild(tr);
        }
    }
}


function setupAddMatiereRow(modulesObj, moduleFilter) {
    // Ici, nous ne gérons plus de select pour le statut,
    // car la matière sera ajoutée avec le statut "vide" par défaut.
    const newMatiereName = document.getElementById("newMatiereName");

    // On écoute l'événement "keypress" sur l'input pour détecter la touche "Enter"
    newMatiereName.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
            const subject = newMatiereName.value.trim();
            if (!subject) return; // Rien à ajouter si le champ est vide

            // On utilise moduleFilter (passé dans l'URL) pour fixer le module
            // Si moduleFilter n'est pas défini, on peut définir un module par défaut
            const mod = moduleFilter || "DefaultModule";

            console.log(`Adding subject "${subject}" to module "${mod}" with default status "vide"`);
            await updateStatus(mod, subject, "vide");

            // On vide le champ après l'ajout
            newMatiereName.value = "";

            // On rafraîchit l'affichage du bar chart et du tableau
            await refreshAll();
        }
    });
}

async function updateStatus(moduleName, subjectName, status) {
    await fetch("http://127.0.0.1:5000/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            module: moduleName,
            subject: subjectName,
            status
        })
    });
}
async function deleteSubject(moduleName, subjectName) {
    console.log(`Deleting subject "${subjectName}" from module "${moduleName}"...`);
    try {
        // On fait une requête DELETE (ou POST) au backend
        const response = await fetch("http://127.0.0.1:5000/api/delete", {
            method: "POST", // ou "DELETE", selon ton choix
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                module: moduleName,
                subject: subjectName
            })
        });
        if (!response.ok) {
            throw new Error(`Error deleting subject: ${response.status}`);
        }
        const result = await response.json();
        console.log("Delete result:", result);
    } catch (err) {
        console.error("Error in deleteSubject:", err);
    }
}


async function refreshAll() {
    const data = await fetchData();
    // On récupère le moduleFilter s’il existe
    const params = new URLSearchParams(window.location.search);
    const moduleFilter = params.get("module");

    let filteredData;
    if (moduleFilter && data.modules[moduleFilter]) {
        filteredData = { [moduleFilter]: data.modules[moduleFilter] };
    } else {
        filteredData = data.modules;
    }

    clearChart();
    buildBarChart(filteredData);
    buildTable(filteredData);
    setupAddMatiereRow(filteredData, moduleFilter);
}

function clearChart() {
    const oldCanvas = document.getElementById("progressChart");
    if (oldCanvas) oldCanvas.remove();
    const newCanvas = document.createElement("canvas");
    newCanvas.id = "progressChart";
    const h1 = document.querySelector("h1");
    h1.insertAdjacentElement("afterend", newCanvas);
}

function mapStatusToNumber(st) {
    if (st === "Done") return 2;
    if (st === "En cours") return 1;
    return 0; // "Pas fait"
}
