let radarChart = null;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Radar script running!");
  await refreshRadar();

  // Création d'un module
  document.getElementById("createModuleBtn").addEventListener("click", async () => {
    const moduleName = document.getElementById("newModuleName").value.trim();
    if (!moduleName) return;
    // Créer un module (placeholder, statut "vide")
    await fetch("http://127.0.0.1:5000/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: moduleName,
        subject: "placeholder",
        status: "vide"
      })
    });
    document.getElementById("newModuleName").value = "";
    await refreshRadar();
  });

  // Gérer le clic droit (contextmenu) sur le canvas
  const canvas = document.getElementById("radarChart");
  canvas.addEventListener("contextmenu", (evt) => {
    evt.preventDefault(); // on empêche le menu contextuel par défaut
    handleRightClick(evt);
  });
});

/** 
 * CLIC GAUCHE = par défaut Chart.js -> onClick 
 * => on va configurer plus bas dans 'options.onClick'
 */

/** Gère le clic droit */
function handleRightClick(evt) {
  hideModuleContextMenu(); // fermer tout menu existant

  // Obtenir le(s) point(s) sous la souris
  const elements = radarChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
  if (elements.length === 0) {
    return; // pas de module sous le clic
  }
  if (elements.length === 1) {
    // Un seul point => rename/delete direct
    const index = elements[0].index;
    const moduleClicked = radarChart.data.labels[index];
    if (moduleClicked === "(empty)") return;
    showContextMenu(evt, moduleClicked);
  } else {
    // Plusieurs points => liste de modules
    let modulesClicked = elements.map(el => radarChart.data.labels[el.index]);
    modulesClicked = Array.from(new Set(modulesClicked)).filter(m => m !== "(empty)");
    if (modulesClicked.length === 1) {
      showContextMenu(evt, modulesClicked[0]);
    } else {
      // Proposer un menu pour choisir le module => rename/delete
      showMultipleModuleContext(evt, modulesClicked);
    }
  }
}

/** Affiche le menu contextuel (clic droit) pour un module unique */
function showContextMenu(evt, moduleName) {
  const menu = document.getElementById("moduleContextMenu");
  menu.innerHTML = "";

  // Titre
  const title = document.createElement("div");
  title.textContent = `Module: ${moduleName}`;
  title.style.fontWeight = "bold";
  title.style.borderBottom = "1px solid #ccc";
  title.style.marginBottom = "5px";
  menu.appendChild(title);

  // Renommer
  const renameItem = document.createElement("div");
  renameItem.textContent = "Rename Module";
  renameItem.style.cursor = "pointer";
  renameItem.style.padding = "5px";
  renameItem.addEventListener("click", async () => {
    const newName = prompt(`Enter new name for "${moduleName}"`);
    if (newName) {
      await renameModule(moduleName, newName);
    }
    hideModuleContextMenu();
  });
  menu.appendChild(renameItem);

  // Supprimer
  const deleteItem = document.createElement("div");
  deleteItem.textContent = "Delete Module";
  deleteItem.style.cursor = "pointer";
  deleteItem.style.padding = "5px";
  deleteItem.addEventListener("click", async () => {
    if (confirm(`Are you sure you want to delete "${moduleName}"?`)) {
      await deleteModule(moduleName);
    }
    hideModuleContextMenu();
  });
  menu.appendChild(deleteItem);

  // Positionner le menu
  menu.style.display = "block";
  menu.style.visibility = "hidden";

  const rect = radarChart.canvas.getBoundingClientRect();
  const xPos = rect.left + window.scrollX + evt.offsetX;
  const yPos = rect.top + window.scrollY + evt.offsetY;

  menu.style.left = xPos + "px";
  menu.style.top = yPos + "px";
  menu.style.visibility = "visible";
}

/** Affiche un menu pour choisir parmi plusieurs modules => rename/delete */
function showMultipleModuleContext(evt, modulesClicked) {
  const menu = document.getElementById("moduleContextMenu");
  menu.innerHTML = "";

  const title = document.createElement("div");
  title.textContent = "Multiple modules:";
  title.style.fontWeight = "bold";
  title.style.borderBottom = "1px solid #ccc";
  title.style.marginBottom = "5px";
  menu.appendChild(title);

  modulesClicked.forEach(mod => {
    const item = document.createElement("div");
    item.textContent = mod;
    item.style.cursor = "pointer";
    item.style.padding = "5px";
    item.addEventListener("click", () => {
      hideModuleContextMenu();
      // On ouvre un menu contextuel rename/delete pour ce module
      showContextMenu(evt, mod);
    });
    menu.appendChild(item);
  });

  // Positionner le menu
  menu.style.display = "block";
  menu.style.visibility = "hidden";

  const rect = radarChart.canvas.getBoundingClientRect();
  const xPos = rect.left + window.scrollX + evt.offsetX;
  const yPos = rect.top + window.scrollY + evt.offsetY;

  menu.style.left = xPos + "px";
  menu.style.top = yPos + "px";
  menu.style.visibility = "visible";
}

/** Cache le menu contextuel clic droit */
function hideModuleContextMenu() {
  const menu = document.getElementById("moduleContextMenu");
  menu.style.display = "none";
  menu.style.visibility = "hidden";
}

/** Actualise le radar */
async function refreshRadar() {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/modules");
    const data = await resp.json();
    const historical = data.historical || {};

    let moduleNames = Object.keys(historical);
    let totalPoints = moduleNames.map(mod => {
      const dailyPoints = Object.values(historical[mod]);
      return dailyPoints.reduce((acc, val) => acc + val, 0);
    });

    // Au moins 6 axes
    if (moduleNames.length < 6) {
      const needed = 6 - moduleNames.length;
      for (let i = 0; i < needed; i++) {
        moduleNames.push("(empty)");
        totalPoints.push(null);
      }
    }

    const ctx = document.getElementById("radarChart").getContext("2d");
    if (radarChart) {
      radarChart.destroy();
    }

    radarChart = new Chart(ctx, {
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
        // Clic gauche => aller en détail
        onClick: (evt, elements) => {
          hideModuleChoiceMenu();
          if (elements.length === 0) return;
          if (elements.length === 1) {
            const index = elements[0].index;
            const moduleClicked = radarChart.data.labels[index];
            if (moduleClicked === "(empty)") return;
            // Redirection direct
            window.location.href = `index.html?module=${encodeURIComponent(moduleClicked)}`;
          } else {
            // Plusieurs points => choix du module => détail
            let modulesClicked = elements.map(el => radarChart.data.labels[el.index]);
            modulesClicked = Array.from(new Set(modulesClicked)).filter(m => m !== "(empty)");
            if (modulesClicked.length === 1) {
              window.location.href = `index.html?module=${encodeURIComponent(modulesClicked[0])}`;
            } else {
              showModuleChoiceMenu(evt, elements, modulesClicked);
            }
          }
        }
      }
    });

  } catch (err) {
    console.error("Error in refreshRadar:", err);
  }
}

/** Affiche un menu pour choisir un module si plusieurs points (clic gauche) => redirection détail */
function showModuleChoiceMenu(evt, elements, modulesClicked) {
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
      window.location.href = `index.html?module=${encodeURIComponent(mod)}`;
    });
    menuDiv.appendChild(item);
  });

  // Calculer la position (moyenne x,y)
  const rect = radarChart.canvas.getBoundingClientRect();
  let sumX = 0, sumY = 0;
  for (const el of elements) {
    const meta = radarChart.getDatasetMeta(el.datasetIndex);
    const props = meta.data[el.index].getProps(["x", "y"], true);
    sumX += props.x;
    sumY += props.y;
  }
  const avgX = sumX / elements.length;
  const avgY = sumY / elements.length;

  menuDiv.style.display = "block";
  menuDiv.style.visibility = "hidden";

  const w = menuDiv.offsetWidth;
  const h = menuDiv.offsetHeight;

  const offsetX = - (w + 10);
  const offsetY = - (h / 2) - 10;
  const xPos = rect.left + window.scrollX + avgX + offsetX;
  const yPos = rect.top + window.scrollY + avgY + offsetY;

  menuDiv.style.left = xPos + "px";
  menuDiv.style.top = yPos + "px";
  menuDiv.style.visibility = "visible";
}

/** Cache le menu "plusieurs modules" */
function hideModuleChoiceMenu() {
  const menuDiv = document.getElementById("moduleChoiceMenu");
  menuDiv.style.display = "none";
  menuDiv.style.visibility = "hidden";
}

/** rename module */
async function renameModule(oldName, newName) {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/rename_module", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldName, newName })
    });
    if (!resp.ok) {
      const error = await resp.json();
      alert("Rename error: " + (error.error || "Unknown error"));
      return;
    }
    await refreshRadar();
  } catch (err) {
    console.error("Error renaming module:", err);
  }
}

/** delete module */
async function deleteModule(moduleName) {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/delete_module", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: moduleName })
    });
    if (!resp.ok) {
      const error = await resp.json();
      alert("Delete error: " + (error.error || "Unknown error"));
      return;
    }
    await refreshRadar();
  } catch (err) {
    console.error("Error deleting module:", err);
  }
}
