let radarChart; // Variable globale pour conserver l'instance du radar

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Radar script running!");
    await loadRadarData();

});

async function loadRadarData() {
    try {
        const response = await fetch("http://127.0.0.1:5000/api/modules");
        const data = await response.json();
        console.log("Data for radar:", data);

        // Vérifier que data.historical existe et n'est pas vide
        if (!data.historical || Object.keys(data.historical).length === 0) {
            console.error("No historical data available.");
            return;
        }

        const labels = Object.keys(data.historical);  // ex: ["Math", "Programming", "Law"]
        const totals = labels.map(module => {
            const dailyPoints = Object.values(data.historical[module]); // ex: [2, 4, 1, ...]
            return dailyPoints.reduce((acc, v) => acc + v, 0);
        });

        const radarCanvas = document.getElementById("radarChart");

        // Si une instance du radar existe déjà, la détruire pour éviter de superposer
        if (radarChart) {
            radarChart.destroy();
        }

        radarChart = new Chart(radarCanvas, {
            type: "radar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Total Points",
                    data: totals,
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    pointBackgroundColor: "rgba(75, 192, 192, 1)",
                    pointRadius: 8,          // pour faciliter le clic
                    pointHoverRadius: 12
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: { stepSize: 2 }
                    }
                },
                onClick: (event, elements, chart) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const moduleClicked = labels[index];
                        console.log("Clicked on module:", moduleClicked);
                        // Rediriger vers la page de détails du module
                        window.location.href = `index.html?module=${moduleClicked}`;
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error in radar script:", err);
    }
}
