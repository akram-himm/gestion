let barChart = null;

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const radarName = params.get("radar");
  const moduleName = params.get("module"); // facultatif

  if (!radarName) {
    alert("No radar specified!");
    window.location.href = "radar.html";
    return;
  }

  document.getElementById("radarTitle").textContent = `Radar: ${radarName}`;

  // Charge et affiche les modules du radar
  await loadRadarDetails(radarName, moduleName);

  // Ajout d'une nouvelle matière
  document.getElementById("newMatiereName").addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      const subjectName = e.target.value.trim();
      if (!subjectName) return;

      // Si on n'a pas de moduleName, on en crée un par défaut ?
      let chosenModule = moduleName || "DefaultModule";
      // On crée un sujet "vide" pour qu'il apparaisse
      await updateStatus(radarName, chosenModule, subjectName, "vide");
      e.target.value = "";
      await loadRadarDetails(radarName, moduleName);
    }
  });
});

async function loadRadarDetails(radarName, moduleName) {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/modules");
    const data = await resp.json();
    const current = data.current;
    const allRadars = current.radars || {};

    if (!allRadars[radarName]) {
      alert(`Radar "${radarName}" not found!`);
      window.location.href = "radar.html";
      return;
    }

    let modulesObj = allRadars[radarName].modules || {};
    // Si un module est précisé, on n'affiche que ses matières,
    // sinon on combine tout dans un seul bar chart
    let subjects = [];
    let titleForChart = "";

    if (moduleName && modulesObj[moduleName]) {
      subjects = modulesObj[moduleName].subjects;
      titleForChart = moduleName;
    } else {
      // On agrège toutes les matières de tous les modules
      subjects = [];
      for (const mod of Object.keys(modulesObj)) {
        for (const subj of modulesObj[mod].subjects) {
          // On peut marquer "mod: subj" dans le nom, si on veut
          subjects.push({ name: `${mod}: ${subj.name}`, status: subj.status });
        }
      }
      titleForChart = "All Modules";
    }

    drawBarChart(subjects, titleForChart);
    buildTable(radarName, moduleName, subjects);

  } catch (err) {
    console.error("Error loading radar details:", err);
  }
}

function drawBarChart(subjects, chartLabel) {
  const labels = subjects.map(s => s.name);
  const values = subjects.map(s => statusToPoints(s.status));

  if (barChart) {
    barChart.destroy();
  }

  const ctx = document.getElementById("progressChart").getContext("2d");
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: chartLabel,
        data: values
      }]
    },
    options: {
      responsive: false,
      scales: {
        y: { beginAtZero: true, max: 2 }
      }
    }
  });
}

function buildTable(radarName, moduleName, subjects) {
  const tbody = document.querySelector("#modulesTable tbody");
  tbody.innerHTML = "";

  subjects.forEach(subj => {
    const tr = document.createElement("tr");

    // Matière
    const tdMatiere = document.createElement("td");
    tdMatiere.textContent = subj.name;
    tr.appendChild(tdMatiere);

    // Statut
    const tdStatut = document.createElement("td");
    const select = document.createElement("select");
    ["Done", "En cours", "Pas fait", "vide"].forEach(st => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      if (st === subj.status) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", async () => {
      // Si on a un moduleName, la matière a un nom direct
      // Sinon, on doit extraire le module depuis "Mod: Matiere"
      if (!moduleName) {
        // On doit séparer "Physics: Mechanics"
        const splitted = subj.name.split(":");
        if (splitted.length >= 2) {
          const realMod = splitted[0].trim();
          const realSubj = splitted.slice(1).join(":").trim();
          await updateStatus(radarName, realMod, realSubj, select.value);
        }
      } else {
        await updateStatus(radarName, moduleName, subj.name, select.value);
      }
      await loadRadarDetails(radarName, moduleName);
    });
    tdStatut.appendChild(select);
    tr.appendChild(tdStatut);

    // Delete
    const tdAction = document.createElement("td");
    const btnDelete = document.createElement("button");
    btnDelete.textContent = "Supprimer";
    btnDelete.addEventListener("click", async () => {
      if (!moduleName) {
        // On doit séparer "Mod: Matiere"
        const splitted = subj.name.split(":");
        if (splitted.length >= 2) {
          const realMod = splitted[0].trim();
          const realSubj = splitted.slice(1).join(":").trim();
          await deleteSubject(radarName, realMod, realSubj);
        }
      } else {
        await deleteSubject(radarName, moduleName, subj.name);
      }
      await loadRadarDetails(radarName, moduleName);
    });
    tdAction.appendChild(btnDelete);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });
}

async function updateStatus(radar, module, subject, status) {
  try {
    await fetch("http://127.0.0.1:5000/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radar, module, subject, status })
    });
  } catch (err) {
    console.error("Error in updateStatus:", err);
  }
}

async function deleteSubject(radar, module, subject) {
  try {
    await fetch("http://127.0.0.1:5000/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radar, module, subject })
    });
  } catch (err) {
    console.error("Error in deleteSubject:", err);
  }
}

function statusToPoints(st) {
  if (st === "Done") return 2;
  if (st === "En cours") return 1;
  return 0; // "Pas fait" ou "vide"
}
