let radarChart = null;
let selectedModule = null;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Radar script running!");
  await refreshRadar();

  // Créer un module
  document.getElementById("createModuleBtn").addEventListener("click", async () => {
    const moduleName = document.getElementById("newModuleName").value.trim();
    if (!moduleName) return;
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

  // rename / delete / detail
  document.getElementById("renameBtn").addEventListener("click", () => {
    document.getElementById("renameSection").style.display = "block";
    document.getElementById("renameInput").value = "";
  });
  document.getElementById("cancelRenameBtn").addEventListener("click", () => {
    document.getElementById("renameSection").style.display = "none";
  });
  document.getElementById("confirmRenameBtn").addEventListener("click", async () => {
    const newName = document.getElementById("renameInput").value.trim();
    if (!newName || !selectedModule) return;
    await renameModule(selectedModule, newName);
    document.getElementById("renameSection").style.display = "none";
    await refreshRadar();
  });
  document.getElementById("deleteBtn").addEventListener("click", async () => {
    if (!selectedModule) return;
    if (!confirm(`Are you sure you want to delete "${selectedModule}"?`)) {
      return;
    }
    await deleteModule(selectedModule);
    selectedModule = null;
    await refreshRadar();
  });
  document.getElementById("detailBtn").addEventListener("click", () => {
    if (!selectedModule) return;
    window.location.href = `index.html?module=${encodeURIComponent(selectedModule)}`;
  });

  // Fix: si on revient via "Back", on rafraîchit
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      refreshRadar();
    }
  });
});

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

    // Gradient optionnel
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0, "rgba(54, 162, 235, 0.4)");
    gradient.addColorStop(1, "rgba(54, 162, 235, 0.0)");

    radarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: moduleNames,
        datasets: [{
          label: "Total Points",
          data: totalPoints,
          backgroundColor: gradient,
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
        onClick: (evt, elements, chart) => {
          hideModuleChoiceMenu(); // cacher le menu si ouvert

          if (elements.length > 0) {
            if (elements.length === 1) {
              // Un seul point
              const index = elements[0].index;
              const moduleClicked = moduleNames[index];
              if (moduleClicked === "(empty)") return;
              console.log("Clicked on module:", moduleClicked);
              selectedModule = moduleClicked;
              document.getElementById("selectedModuleName").textContent = moduleClicked;
              document.getElementById("moduleBar").style.display = "block";
              document.getElementById("renameSection").style.display = "none";
            } else {
              // Plusieurs points
              let modulesClicked = elements.map(el => moduleNames[el.index]);
              modulesClicked = Array.from(new Set(modulesClicked)).filter(m => m !== "(empty)");

              if (modulesClicked.length === 1) {
                // Finalement un seul module
                selectedModule = modulesClicked[0];
                document.getElementById("selectedModuleName").textContent = selectedModule;
                document.getElementById("moduleBar").style.display = "block";
                document.getElementById("renameSection").style.display = "none";
              } else {
                // Afficher la liste "à côté du point"
                showModuleChoiceMenu(evt, elements, chart, modulesClicked);
              }
            }
          }
        }
      }
    });

    document.getElementById("moduleBar").style.display = "none";
  } catch (err) {
    console.error("Error in refreshRadar:", err);
  }
}

/** Affiche la liste cliquable à l'emplacement du point (en tenant compte du scroll) */
function showModuleChoiceMenu(evt, elements, chart, modulesClicked) {
  const menuDiv = document.getElementById("moduleChoiceMenu");
  menuDiv.innerHTML = "";

  // Calcul de la moyenne x,y (canvas coords)
  let sumX = 0, sumY = 0;
  for (const el of elements) {
    const meta = chart.getDatasetMeta(el.datasetIndex);
    const props = meta.data[el.index].getProps(["x", "y"], true);
    sumX += props.x;
    sumY += props.y;
  }
  const avgX = sumX / elements.length;
  const avgY = sumY / elements.length;

  // Convertir coords canvas -> coords page
  const rect = chart.canvas.getBoundingClientRect();
  let xPos = rect.left + window.scrollX + avgX;
  let yPos = rect.top + window.scrollY + avgY;

  // Afficher le menu pour mesurer sa taille
  menuDiv.style.display = "block";
  menuDiv.style.visibility = "hidden";

  // Titre
  const title = document.createElement("div");
  title.textContent = "Select a module:";
  title.style.fontWeight = "bold";
  title.style.borderBottom = "1px solid #ccc";
  title.style.marginBottom = "5px";
  menuDiv.appendChild(title);

  // Liste de modules
  modulesClicked.forEach(mod => {
    const item = document.createElement("div");
    item.textContent = mod;
    item.style.cursor = "pointer";
    item.style.borderBottom = "1px solid #eee";
    item.style.padding = "5px";
    item.addEventListener("click", () => {
      selectedModule = mod;
      document.getElementById("selectedModuleName").textContent = mod;
      document.getElementById("moduleBar").style.display = "block";
      hideModuleChoiceMenu();
    });
    menuDiv.appendChild(item);
  });

  // Mesurer le menu
  const w = menuDiv.offsetWidth;
  const h = menuDiv.offsetHeight;

  // On veut le placer "à gauche" du point => xPos -= w + marge
  const margeX = 10;
  const margeY = 10;
  xPos -= (w + margeX);
  yPos -= (h / 2) + margeY;

  menuDiv.style.left = xPos + "px";
  menuDiv.style.top = yPos + "px";
  menuDiv.style.visibility = "visible";
}

/** Cache le menu contextuel */
function hideModuleChoiceMenu() {
  const menuDiv = document.getElementById("moduleChoiceMenu");
  menuDiv.style.display = "none";
  menuDiv.style.visibility = "hidden";
}

/** Renommer un module */
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

/** Supprimer un module */
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
