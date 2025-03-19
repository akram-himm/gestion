let radarCharts = [];        // { chart, canvas, radarName }
let selectedRadarIndex = -1; // indice du radar sélectionné

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Multi-radar script loaded!");

  // On charge tous les radars existants depuis le backend
  await loadAllRadars();

  // Bouton pour créer un nouveau radar
  const addRadarBtn = document.getElementById("addRadarBtn");
  addRadarBtn.addEventListener("click", async () => {
    const radarName = prompt("Nom du nouveau radar ?");
    if (!radarName) return;
    await createRadarInBackend(radarName);
    await loadAllRadars();
  });

  // Bouton pour supprimer le radar sélectionné
  const removeRadarBtn = document.getElementById("removeRadarBtn");
  removeRadarBtn.addEventListener("click", async () => {
    if (selectedRadarIndex < 0) return;
    const radarName = radarCharts[selectedRadarIndex].radarName;
    if (!confirm(`Supprimer le radar "${radarName}" ?`)) return;
    await deleteRadarInBackend(radarName);
    await loadAllRadars();
  });

  // Bouton pour ajouter un module au radar sélectionné
  const addModuleBtn = document.getElementById("addModuleBtn");
  addModuleBtn.addEventListener("click", async () => {
    if (selectedRadarIndex < 0) return;
    const radarName = radarCharts[selectedRadarIndex].radarName;
    const moduleName = prompt(`Nouveau module pour radar "${radarName}" ?`);
    if (!moduleName) return;

    // On crée un "placeholder" dans ce module (sinon il n'apparaîtra pas)
    await updateProgress(radarName, moduleName, "placeholder", "vide");
    await loadAllRadars();
  });
});

/**
 * Récupère tous les radars + historique, puis affiche un canvas radar par radar.
 */
async function loadAllRadars() {
  // On vide l'ancien contenu
  document.getElementById("radarContainer").innerHTML = "";
  radarCharts = [];
  selectedRadarIndex = -1;
  document.getElementById("removeRadarBtn").disabled = true;
  document.getElementById("addModuleBtn").style.display = "none";

  try {
    const resp = await fetch("http://127.0.0.1:5000/api/modules");
    const data = await resp.json();
    const current = data.current;       // { radars: {...}, last_reset: ... }
    const historical = data.historical; // { RadarName: { ModuleName: { date: points } } }

    // Parcours de tous les radars
    const radarsObj = current.radars || {};
    const radarNames = Object.keys(radarsObj);

    for (const rName of radarNames) {
      const modulesObj = radarsObj[rName].modules || {};

      // On calcule, pour chaque module, la somme des points
      let moduleNames = Object.keys(modulesObj);
      let totalPoints = [];
      for (const mName of moduleNames) {
        // On somme l'historique
        let sumPoints = 0;
        if (historical[rName] && historical[rName][mName]) {
          const dailyPoints = Object.values(historical[rName][mName]);
          sumPoints = dailyPoints.reduce((acc, val) => acc + val, 0);
        }
        totalPoints.push(sumPoints);
      }

      // Minimum 6 axes
      if (moduleNames.length < 6) {
        const needed = 6 - moduleNames.length;
        for (let i = 0; i < needed; i++) {
          moduleNames.push("(empty)");
          totalPoints.push(null);
        }
      }

      // Création d'un canvas
      const container = document.getElementById("radarContainer");
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 600;
      canvas.classList.add("radarCanvas");
      container.appendChild(canvas);

      // Instanciation Chart.js
      const ctx = canvas.getContext("2d");
      const newChart = new Chart(ctx, {
        type: "radar",
        data: {
          labels: moduleNames,
          datasets: [{
            label: "Total Points",
            data: totalPoints,
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(54, 162, 235, 1)",
            pointRadius: 5,
            fill: true,
            spanGaps: true
          }]
        },
        options: {
          responsive: false,
          scales: {
            r: {
              beginAtZero: true,
              suggestedMin: 0,
              suggestedMax: 10,
              ticks: { stepSize: 2 }
            }
          },
          onClick: (evt, elements) => {
            // Sélection de ce radar
            const idx = radarCharts.findIndex(rc => rc.canvas === canvas);
            selectRadar(idx);

            // Si clic sur un point
            if (elements.length === 0) return;
            if (elements.length === 1) {
              const i = elements[0].index;
              const moduleClicked = newChart.data.labels[i];
              if (moduleClicked === "(empty)") return;
              // Ouvre la page index.html pour ce radar
              window.location.href = `index.html?radar=${encodeURIComponent(rName)}&module=${encodeURIComponent(moduleClicked)}`;
            } else {
              // Plusieurs modules
              let modulesClicked = elements.map(el => newChart.data.labels[el.index]);
              modulesClicked = Array.from(new Set(modulesClicked)).filter(m => m !== "(empty)");
              if (modulesClicked.length === 1) {
                window.location.href = `index.html?radar=${encodeURIComponent(rName)}&module=${encodeURIComponent(modulesClicked[0])}`;
              } else {
                showModuleChoiceMenu(evt, elements, modulesClicked, newChart, rName);
              }
            }
          }
        }
      });

      // Clic droit => menu contextuel
      canvas.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        const idx = radarCharts.findIndex(rc => rc.canvas === canvas);
        selectRadar(idx);

        handleRightClick(evt, newChart, rName);
      });

      // On stocke
      radarCharts.push({ chart: newChart, canvas, radarName: rName });
    }

  } catch (err) {
    console.error("Error loading radars:", err);
  }
}

/**
 * Sélectionne un radar, met sa bordure en rouge, active les boutons X / +Module.
 */
function selectRadar(index) {
  // Désélectionner l'ancien
  if (selectedRadarIndex >= 0 && radarCharts[selectedRadarIndex]) {
    radarCharts[selectedRadarIndex].canvas.classList.remove("selectedRadar");
  }
  selectedRadarIndex = index;

  const removeBtn = document.getElementById("removeRadarBtn");
  const addModuleBtn = document.getElementById("addModuleBtn");

  if (selectedRadarIndex >= 0 && radarCharts[selectedRadarIndex]) {
    radarCharts[selectedRadarIndex].canvas.classList.add("selectedRadar");
    removeBtn.disabled = false;
    addModuleBtn.style.display = "block";
  } else {
    removeBtn.disabled = true;
    addModuleBtn.style.display = "none";
  }
}

/* ==================== */
/*   MENU CONTEXTUEL    */
/* ==================== */

function handleRightClick(evt, chart, radarName) {
  hideModuleContextMenu();
  const elements = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
  if (elements.length === 0) return;

  if (elements.length === 1) {
    const index = elements[0].index;
    const moduleClicked = chart.data.labels[index];
    if (moduleClicked === "(empty)") return;
    showContextMenu(evt, radarName, moduleClicked, chart);
  } else {
    let modulesClicked = elements.map(el => chart.data.labels[el.index]);
    modulesClicked = Array.from(new Set(modulesClicked)).filter(m => m !== "(empty)");
    if (modulesClicked.length === 1) {
      showContextMenu(evt, radarName, modulesClicked[0], chart);
    } else {
      showMultipleModuleContext(evt, radarName, modulesClicked, chart);
    }
  }
}

function showContextMenu(evt, radarName, moduleName, chart) {
  const menu = document.getElementById("moduleContextMenu");
  menu.innerHTML = "";
  menu.addEventListener("click", e => e.stopPropagation());

  // Titre
  const title = document.createElement("div");
  title.textContent = `Radar: ${radarName} | Module: ${moduleName}`;
  title.style.fontWeight = "bold";
  title.style.borderBottom = "1px solid #ccc";
  title.style.marginBottom = "5px";
  menu.appendChild(title);

  // Renommer
  const renameItem = document.createElement("div");
  renameItem.textContent = "Rename Module";
  renameItem.style.cursor = "pointer";
  renameItem.style.padding = "5px";
  renameItem.addEventListener("click", () => {
    const newName = prompt(`Nouveau nom pour le module "${moduleName}" ?`);
    if (!newName) return;
    renameModule(radarName, moduleName, newName).then(() => {
      hideModuleContextMenu();
      loadAllRadars();
    });
  });
  menu.appendChild(renameItem);

  // Supprimer
  const deleteItem = document.createElement("div");
  deleteItem.textContent = "Delete Module";
  deleteItem.style.cursor = "pointer";
  deleteItem.style.padding = "5px";
  deleteItem.addEventListener("click", () => {
    if (!confirm(`Supprimer le module "${moduleName}" du radar "${radarName}" ?`)) return;
    deleteModule(radarName, moduleName).then(() => {
      hideModuleContextMenu();
      loadAllRadars();
    });
  });
  menu.appendChild(deleteItem);

  // Position
  menu.style.display = "block";
  menu.style.visibility = "hidden";
  const rect = chart.canvas.getBoundingClientRect();
  menu.style.left = (rect.left + window.scrollX + evt.offsetX) + "px";
  menu.style.top = (rect.top + window.scrollY + evt.offsetY) + "px";
  menu.style.visibility = "visible";
}

function showMultipleModuleContext(evt, radarName, modulesClicked, chart) {
  const menu = document.getElementById("moduleContextMenu");
  menu.innerHTML = "";
  menu.addEventListener("click", e => e.stopPropagation());

  const title = document.createElement("div");
  title.textContent = `Radar: ${radarName} | Multiple modules:`;
  title.style.fontWeight = "bold";
  title.style.borderBottom = "1px solid #ccc";
  title.style.marginBottom = "5px";
  menu.appendChild(title);

  modulesClicked.forEach(m => {
    const item = document.createElement("div");
    item.textContent = m;
    item.style.cursor = "pointer";
    item.style.padding = "5px";
    item.addEventListener("click", () => {
      hideModuleContextMenu();
      showContextMenu(evt, radarName, m, chart);
    });
    menu.appendChild(item);
  });

  menu.style.display = "block";
  menu.style.visibility = "hidden";
  const rect = chart.canvas.getBoundingClientRect();
  menu.style.left = (rect.left + window.scrollX + evt.offsetX) + "px";
  menu.style.top = (rect.top + window.scrollY + evt.offsetY) + "px";
  menu.style.visibility = "visible";
}

function hideModuleContextMenu() {
  const menu = document.getElementById("moduleContextMenu");
  menu.style.display = "none";
  menu.style.visibility = "hidden";
  menu.innerHTML = "";
}

/* Menu "clic gauche" si plusieurs modules se chevauchent */
function showModuleChoiceMenu(evt, elements, modulesClicked, chart, radarName) {
  const menuDiv = document.getElementById("moduleChoiceMenu");
  menuDiv.innerHTML = "";

  const title = document.createElement("div");
  title.textContent = "Multiple modules. Select one:";
  title.style.fontWeight = "bold";
  title.style.borderBottom = "1px solid #ccc";
  title.style.marginBottom = "5px";
  menuDiv.appendChild(title);

  modulesClicked.forEach(mod => {
    const item = document.createElement("div");
    item.textContent = mod;
    item.style.cursor = "pointer";
    item.style.padding = "5px";
    item.addEventListener("click", () => {
      window.location.href = `index.html?radar=${encodeURIComponent(radarName)}&module=${encodeURIComponent(mod)}`;
    });
    menuDiv.appendChild(item);
  });

  menuDiv.style.display = "block";
  menuDiv.style.visibility = "hidden";

  const rect = chart.canvas.getBoundingClientRect();
  let sumX = 0, sumY = 0;
  for (const el of elements) {
    const meta = chart.getDatasetMeta(el.datasetIndex);
    const props = meta.data[el.index].getProps(["x", "y"], true);
    sumX += props.x;
    sumY += props.y;
  }
  const avgX = sumX / elements.length;
  const avgY = sumY / elements.length;

  const w = menuDiv.offsetWidth;
  const h = menuDiv.offsetHeight;
  const offsetX = -(w + 10);
  const offsetY = -(h / 2) - 10;
  const xPos = rect.left + window.scrollX + avgX + offsetX;
  const yPos = rect.top + window.scrollY + avgY + offsetY;
  menuDiv.style.left = xPos + "px";
  menuDiv.style.top = yPos + "px";
  menuDiv.style.visibility = "visible";
}

function hideModuleChoiceMenu() {
  const menuDiv = document.getElementById("moduleChoiceMenu");
  menuDiv.style.display = "none";
  menuDiv.style.visibility = "hidden";
  menuDiv.innerHTML = "";
}

/* ======================= */
/*   APPELS API RADARS    */
/* ======================= */

async function createRadarInBackend(radarName) {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/new_radar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radar: radarName })
    });
    if (!resp.ok) {
      const error = await resp.json();
      alert("Error creating radar: " + (error.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Error creating radar:", err);
  }
}

async function deleteRadarInBackend(radarName) {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/delete_radar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radar: radarName })
    });
    if (!resp.ok) {
      const error = await resp.json();
      alert("Error deleting radar: " + (error.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Error deleting radar:", err);
  }
}

/* =========================== */
/*   APPELS API MODULE/SUBJ    */
/* =========================== */

async function updateProgress(radar, module, subject, status) {
  try {
    await fetch("http://127.0.0.1:5000/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radar, module, subject, status })
    });
  } catch (err) {
    console.error("Error in updateProgress:", err);
  }
}

async function deleteModule(radar, module) {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/delete_module", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radar, module })
    });
    if (!resp.ok) {
      const error = await resp.json();
      alert("Delete module error: " + (error.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Error deleting module:", err);
  }
}

async function renameModule(radar, oldName, newName) {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/rename_module", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radar, oldName, newName })
    });
    if (!resp.ok) {
      const error = await resp.json();
      alert("Rename module error: " + (error.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Error renaming module:", err);
  }
}

/* =============================== */
/*  FERMETURE AUTOMATIQUE MENUS   */
/* =============================== */

document.addEventListener("click", (evt) => {
  // Ferme le menu contextuel (rename/delete) si on clique en dehors
  const contextMenu = document.getElementById("moduleContextMenu");
  if (contextMenu.style.display === "block" && !contextMenu.contains(evt.target)) {
    hideModuleContextMenu();
  }

  // Ferme le menu de choix multiple (clic gauche) si on clique en dehors
  const choiceMenu = document.getElementById("moduleChoiceMenu");
  if (choiceMenu.style.display === "block" && !choiceMenu.contains(evt.target)) {
    hideModuleChoiceMenu();
  }
});
