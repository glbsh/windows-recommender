// script.js
// Fully updated to handle multi-select, zip auto-detection, composite frames, and complete interactive logic

let models = [];
let sortDirections = {};
const favorites = new Set();

function displayResults(matches) {
  const app = document.getElementById("app");
  app.innerHTML = `<h2>🎯 Top Matches</h2>`;

  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export to PDF";
  exportBtn.onclick = exportToPDF;
  app.appendChild(exportBtn);

  if (matches.length === 0) {
    app.innerHTML += `<p>No matching models found. Try changing your filters.</p>`;
    return;
  }

  const table = document.createElement("table");
  table.id = "resultsTable";
  table.innerHTML = `
    <thead>
    <tr>
      <th onclick="sortTable(0)">Model <span id="sort-0"></span></th>
      <th onclick="sortTable(1)">Brand <span id="sort-1"></span></th>
      <th onclick="sortTable(2)">Frame <span id="sort-2"></span></th>
      <th onclick="sortTable(3)">Style <span id="sort-3"></span></th>
      <th onclick="sortTable(4)">Budget <span id="sort-4"></span></th>
      <th onclick="sortTable(5)">Climate <span id="sort-5"></span></th>
      <th onclick="sortTable(6)">⭐ Rating <span id="sort-6"></span></th>
      <th>🌿 Energy Star</th>
      <th onclick="sortTable(8)">U-Factor <span id="sort-8"></span></th>
      <th onclick="sortTable(9)">SHGC <span id="sort-9"></span></th>
      <th>📅 Model Timeline</th>
      <th>🨠 Score</th>
      <th>📊 Competitor</th>
      <th>❤️</th>
    </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  matches.forEach((m, index) => {
    const tr = document.createElement("tr");
    const ratingColor = m.rating >= 4.5 ? "green" : m.rating >= 4.0 ? "orange" : "red";
    const aiScore = calculateAIScore(m);
    const competitor = m.competitorModel ? `vs ${m.competitorModel}` : "-";
    tr.innerHTML = `
      <td>${highlightMatch(m.model)}</td>
      <td>${highlightMatch(m.brand)}</td>
      <td>${highlightMatch(m.frame)}</td>
      <td>${highlightMatch(m.style)}</td>
      <td>${highlightMatch(m.budget)}</td>
      <td>${highlightMatch(m.climate)}</td>
      <td style='color:${ratingColor}'>${"★".repeat(Math.round(m.rating))} (${m.rating})</td>
      <td>${m.energyStar ? "✅" : ""}</td>
      <td>${m.certifiedUFactor || "-"}</td>
      <td>${m.certifiedSHGC || "-"}</td>
      <td>${m.releaseYear ? `Since ${m.releaseYear}` : "-"}</td>
      <td>${aiScore}%</td>
      <td>${competitor}</td>
      <td><button onclick="toggleFavorite(${index})">${favorites.has(index) ? "💖" : "🤍"}</button></td>
    `;
    tbody.appendChild(tr);
  });
  app.appendChild(table);
}

function toggleFavorite(index) {
  if (favorites.has(index)) favorites.delete(index);
  else favorites.add(index);
  handleUserSelection();
}

function exportToPDF() {
  const element = document.getElementById("resultsTable");
  const opt = {
    margin: 1,
    filename: 'window-recommendations.pdf',
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
  };
  html2pdf().set(opt).from(element).save();
}

function calculateAIScore(model) {
  let score = 0;
  if (model.energyStar) score += 25;
  if (model.rating >= 4.5) score += 25;
  if (parseFloat(model.certifiedUFactor) < 0.3) score += 25;
  if (parseFloat(model.certifiedSHGC) < 0.4) score += 25;
  return score;
}

function highlightMatch(value) {
  if (!value) return "";
  return `<span class="highlight">${value}</span>`;
}

function sortTable(n) {
  const table = document.getElementById("resultsTable");
  const tbody = table.tBodies[0];
  const rows = Array.from(tbody.rows);
  const dir = sortDirections[n] === "asc" ? "desc" : "asc";
  sortDirections[n] = dir;
  rows.sort((a, b) => {
    const x = a.cells[n].textContent.trim();
    const y = b.cells[n].textContent.trim();
    return dir === "asc" ? x.localeCompare(y) : y.localeCompare(x);
  });
  rows.forEach(row => tbody.appendChild(row));
  Object.keys(sortDirections).forEach(i => {
    const el = document.getElementById(`sort-${i}`);
    if (el) el.textContent = i == n ? (dir === "asc" ? "▲" : "▼") : "";
  });
}

async function loadCSVData() {
  try {
    const response = await fetch("windows.csv");
    const csv = await response.text();
    const rows = csv.split("\n").slice(1);
    const headers = csv.split("\n")[0].split(",");
    return rows.map(row => {
      const values = row.split(",");
      const model = {};
      headers.forEach((h, i) => {
        model[h.trim()] = values[i]?.trim();
      });
      model.rating = parseFloat(model.rating) || 0;
      model.energyStar = model.energyStar === "TRUE";
      model.certifiedUFactor = parseFloat(model.certifiedUFactor) || null;
      model.certifiedSHGC = parseFloat(model.certifiedSHGC) || null;
      return model;
    });
  } catch (error) {
    console.warn("Primary CSV fetch failed, falling back to embedded data.");
    return window.localFallbackData || [];
  }
}

function applyFilters(models, criteria = {}) {
  return models.filter(m => {
    return (!criteria.energyStar || m.energyStar === true) &&
           (!criteria.frame.length || criteria.frame.includes(m.frame)) &&
           (!criteria.style.length || criteria.style.includes(m.style)) &&
           (!criteria.budget || m.budget === criteria.budget) &&
           (!criteria.climate || m.climate === criteria.climate);
  });
}

function handleUserSelection() {
  const criteria = {
    energyStar: document.getElementById("q1-energyStar-yes")?.checked,
    frame: Array.from(document.querySelectorAll("input[name='q2-frame']:checked")).map(e => e.value),
    style: Array.from(document.querySelectorAll("input[name='q3-style']:checked")).map(e => e.value),
    budget: document.querySelector("input[name='q4-budget']:checked")?.value,
    climate: document.querySelector("input[name='q5-climate']:checked")?.value
  };

  const progress = document.getElementById("progress");
  if (progress) progress.style.display = "block";

  setTimeout(() => {
    if (!criteria.frame.length || !criteria.style.length || !criteria.budget || !criteria.climate) {
      alert("Please answer all questions before proceeding.");
      if (progress) progress.style.display = "none";
      return;
    }
    const matches = applyFilters(models, criteria);
    displayResults(matches);
    if (progress) progress.style.display = "none";
  }, 300);
}

window.onload = async () => {
  const app = document.getElementById("app");
  try {
    models = await loadCSVData();
    const nextButton = document.getElementById("submit-btn");
    nextButton.onclick = handleUserSelection;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async pos => {
        const zipField = document.getElementById("zip-code");
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const data = await res.json();
          const zip = data.address.postcode;
          if (zipField && zip) zipField.value = zip;
        } catch {
          if (zipField) zipField.placeholder = `Lat ${lat.toFixed(2)}`;
        }
      });
    }
  } catch (e) {
    app.innerHTML = `<p>Error loading window data. Please try again later.</p>`;
  }
};
