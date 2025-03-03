// script_radar.js

let radarChart = null;
let selectedModule = null; // keep track of which module user clicked

document.addEventListener("DOMContentLoaded", async () => {
  await refreshRadar();

  document.getElementById("createModuleBtn").addEventListener("click", async () => {
    const moduleName = document.getElementById("newModuleName").value.trim();
    if (!moduleName) return;

    // Create a placeholder subject so the module is recognized
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

  // Set up rename bar actions
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
  });

  // Delete button
  document.getElementById("deleteBtn").addEventListener("click", async () => {
    if (!selectedModule) return;
    if (!confirm(`Are you sure you want to delete "${selectedModule}"?`)) {
      return;
    }
    await deleteModule(selectedModule);
  });

  // Go to detail
  document.getElementById("detailBtn").addEventListener("click", () => {
    if (!selectedModule) return;
    window.location.href = `index.html?module=${encodeURIComponent(selectedModule)}`;
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

    // If fewer than 6 modules, pad with (empty) corners
    if (moduleNames.length < 6) {
      const needed = 6 - moduleNames.length;
      for (let i = 0; i < needed; i++) {
        moduleNames.push("(empty)");
        totalPoints.push(null); // null => no dot drawn
      }
    }

    if (radarChart) {
      radarChart.destroy();
    }

    const ctx = document.getElementById("radarChart").getContext("2d");
    // Create a gradient fill
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
          fill: true
        }]
      },
      options: {
        responsive: false,
        scales: {
          r: {
            beginAtZero: true,
            suggestedMin: 0,
            suggestedMax: 10
          }
        },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const moduleClicked = moduleNames[index];
            if (moduleClicked === "(empty)") return;

            // Show the top bar, store the selected module
            selectedModule = moduleClicked;
            document.getElementById("selectedModuleName").textContent = moduleClicked;
            document.getElementById("moduleBar").style.display = "block";
            // Hide rename input if open
            document.getElementById("renameSection").style.display = "none";
          }
        }
      }
    });

    // Hide the bar if we refresh
    document.getElementById("moduleBar").style.display = "none";

  } catch (err) {
    console.error("Error in refreshRadar:", err);
  }
}

// Call the rename endpoint
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
    // After renaming, refresh the radar
    await refreshRadar();
  } catch (err) {
    console.error("Error renaming module:", err);
  }
}

// Call the delete_module endpoint
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
    // After deleting, refresh
    await refreshRadar();
  } catch (err) {
    console.error("Error deleting module:", err);
  }
}
