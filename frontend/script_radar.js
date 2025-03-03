// script_radar.js

let radarChart = null;

document.addEventListener("DOMContentLoaded", async () => {
  // Initially load the radar data
  await refreshRadar();

  // "Create Module" button
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
});

async function refreshRadar() {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/modules");
    const data = await resp.json();
    const historical = data.historical || {};

    // Build arrays of module names & total points
    let moduleNames = Object.keys(historical);
    let totalPoints = moduleNames.map(mod => {
      const dailyPoints = Object.values(historical[mod]);
      return dailyPoints.reduce((acc, val) => acc + val, 0);
    });

    // If fewer than 6 modules, pad to get a hexagon shape
    if (moduleNames.length < 6) {
      const needed = 6 - moduleNames.length;
      for (let i = 0; i < needed; i++) {
        moduleNames.push("(empty)");
        totalPoints.push(0);
      }
    }

    // Destroy old radar if it exists
    if (radarChart) {
      radarChart.destroy();
    }

    const ctx = document.getElementById("radarChart").getContext("2d");
    radarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: moduleNames,
        datasets: [{
          label: "Total Points",
          data: totalPoints
        }]
      },
      options: {
        responsive: false, // since we set width/height in HTML
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
            // If it's "(empty)", do nothing
            if (moduleClicked === "(empty)") return;

            // Go to index.html with module=someModule
            window.location.href = `index.html?module=${encodeURIComponent(moduleClicked)}`;
          }
        }
      }
    });

  } catch (err) {
    console.error("Error in refreshRadar:", err);
  }
}
