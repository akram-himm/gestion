let barChart = null;

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const moduleName = params.get("module");

  if (!moduleName) {
    alert("No module specified!");
    window.location.href = "radar.html";
    return;
  }

  document.getElementById("moduleTitle").textContent = `Module: ${moduleName}`;

  await loadModuleDetails(moduleName);

  document.getElementById("newMatiereName").addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      const subjectName = e.target.value.trim();
      if (!subjectName) return;
      await updateStatus(moduleName, subjectName, "vide");
      e.target.value = "";
    }
  });
});

async function loadModuleDetails(moduleName) {
  try {
    const resp = await fetch("http://127.0.0.1:5000/api/modules");
    const data = await resp.json();
    const allModules = data.current.modules || {};

    if (!allModules[moduleName]) {
      alert(`Module "${moduleName}" not found!`);
      window.location.href = "radar.html";
      return;
    }

    const subjects = allModules[moduleName].subjects || [];
    drawBarChart(subjects);
    buildTable(moduleName, subjects);

  } catch (err) {
    console.error("Error loading module details:", err);
  }
}

function drawBarChart(subjects) {
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
        label: "Points",
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

function buildTable(moduleName, subjects) {
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
      await updateStatus(moduleName, subj.name, select.value);
    });
    tdStatut.appendChild(select);
    tr.appendChild(tdStatut);

    // Delete
    const tdAction = document.createElement("td");
    const btnDelete = document.createElement("button");
    btnDelete.textContent = "Supprimer";
    btnDelete.addEventListener("click", async () => {
      await deleteSubject(moduleName, subj.name);
    });
    tdAction.appendChild(btnDelete);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });
}

async function updateStatus(moduleName, subjectName, status) {
  try {
    await fetch("http://127.0.0.1:5000/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: moduleName, subject: subjectName, status })
    });
    await loadModuleDetails(moduleName);
  } catch (err) {
    console.error("Error in updateStatus:", err);
  }
}

async function deleteSubject(moduleName, subjectName) {
  try {
    await fetch("http://127.0.0.1:5000/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: moduleName, subject: subjectName })
    });
    await loadModuleDetails(moduleName);
  } catch (err) {
    console.error("Error in deleteSubject:", err);
  }
}

function statusToPoints(st) {
  if (st === "Done") return 2;
  if (st === "En cours") return 1;
  return 0; // "Pas fait" or "vide"
}
