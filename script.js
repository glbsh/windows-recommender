
// ENHANCED LOGIC MODULE WITH VERIFIED DATASET

import verifiedData from './verified_window_models.csv';

const windowDatabase = verifiedData.map(row => ({
  brand: row.Brand,
  series: row.Series,
  model: row.Model,
  frame: row.Frame.toLowerCase(),
  style: row.Styles.split(',').map(s => s.trim().toLowerCase()),
  climates: ["cold", "hot", "rainy", "mixed"],
  features: ["energy"].concat(row.STC >= 33 ? ["sound"] : []).concat(row.Warranty.toLowerCase().includes("life") ? ["warranty"] : []),
  uFactor: parseFloat(row["U-Factor"]),
  stc: parseInt(row.STC),
  warranty: row.Warranty
}));

function getUserClimateByRegion(region) {
  const regionMap = {
    "Pacific Northwest": "rainy",
    "Southwest": "hot",
    "Northeast": "cold",
    "Midwest": "cold",
    "Mid-Atlantic": "mixed",
    "Southeast": "hot",
    "California": "mixed",
    "Rockies": "cold",
    "Great Plains": "mixed"
  };
  return regionMap[region] || "mixed";
}

function getRecommendations(answers) {
  const climate = answers.autoClimate || answers.climate;
  return windowDatabase
    .filter(w => w.climates.includes(climate))
    .filter(w => w.style.includes(answers.style) || answers.style === 'any')
    .filter(w => answers.material === 'recommend' || w.frame === answers.material)
    .filter(w => answers.budget === 'any' || w.tier === answers.budget)
    .filter(w => answers.features.every(f => w.features.includes(f)))
    .sort((a, b) => b.stc - a.stc)
    .slice(0, 5);
}

function renderComparisonTable(models) {
  const container = document.createElement('div');

  const filter = document.createElement('input');
  filter.placeholder = "Search brand or frame...";
  filter.style.marginBottom = "1rem";
  filter.oninput = () => {
    const rows = container.querySelectorAll("tbody tr");
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(filter.value.toLowerCase()) ? "" : "none";
    });
  };
  container.appendChild(filter);

  const exportCSV = document.createElement('button');
  exportCSV.textContent = 'Export CSV';
  exportCSV.onclick = () => exportTableToCSV(models, 'recommendations.csv');

  const exportPDF = document.createElement('button');
  exportPDF.textContent = 'Export PDF';
  exportPDF.onclick = () => window.print();

  container.appendChild(exportCSV);
  container.appendChild(exportPDF);

  const zipForm = document.createElement('form');
  zipForm.innerHTML = `<input type='text' placeholder='ZIP code' style='margin-left:1rem;' /> <button>Find Local Installer</button>`;
  zipForm.onsubmit = e => {
    e.preventDefault();
    const zip = zipForm.querySelector('input').value;
    window.open(\`https://www.google.com/maps/search/window+installer+near+\${zip}\`, '_blank');
  };
  container.appendChild(zipForm);

  const table = document.createElement('table');
  table.innerHTML = \`
    <thead>
      <tr>
        <th>Brand</th>
        <th>Series</th>
        <th>Model</th>
        <th>Frame</th>
        <th>Styles</th>
        <th>U-Factor</th>
        <th>STC</th>
        <th>Warranty</th>
      </tr>
    </thead>
    <tbody>
      \${models.map(m => \`
        <tr>
          <td>\${m.brand}</td>
          <td>\${m.series}</td>
          <td>\${m.model}</td>
          <td>\${m.frame}</td>
          <td>\${m.style.join(", ")}</td>
          <td>\${m.uFactor}</td>
          <td>\${m.stc}</td>
          <td>\${m.warranty}</td>
        </tr>\`).join('')}
    </tbody>
  \`;
  container.appendChild(table);
  return container;
}

function exportTableToCSV(models, filename) {
  const rows = [
    ["Brand", "Series", "Model", "Frame", "Styles", "U-Factor", "STC", "Warranty"],
    ...models.map(m => [m.brand, m.series, m.model, m.frame, m.style.join(";"), m.uFactor, m.stc, m.warranty])
  ];
  const csvContent = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
