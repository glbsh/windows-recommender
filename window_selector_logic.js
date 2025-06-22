// ENHANCED LOGIC MODULE
// Now supports: region-based climate detection, export features, filter UI

const windowDatabase = [
  {
    brand: "Milgard",
    series: "C650 Ultra",
    model: "C650 Horizontal Slider",
    frame: "fiberglass",
    style: ["sliding", "picture", "hung", "casement", "awning"],
    climates: ["cold", "rainy", "mixed"],
    features: ["energy", "sound", "warranty"],
    uFactor: 0.28,
    stc: 36,
    warranty: "Lifetime"
  },
  {
    brand: "Marvin",
    series: "Elevate",
    model: "Elevate Double-Hung",
    frame: "fiberglass",
    style: ["hung", "picture", "casement", "sliding"],
    climates: ["cold", "rainy", "mixed"],
    features: ["energy", "triple", "sound", "warranty"],
    uFactor: 0.29,
    stc: 34,
    warranty: "20-year"
  },
  {
    brand: "Renewal by Andersen",
    series: "A-Series",
    model: "A-Series Awning",
    frame: "composite",
    style: ["awning", "casement", "sliding", "picture"],
    climates: ["cold", "rainy", "mixed"],
    features: ["energy", "triple", "sound", "warranty"],
    uFactor: 0.26,
    stc: 36,
    warranty: "20-year"
  },
  {
    brand: "Pella",
    series: "Impervia",
    model: "Impervia Casement",
    frame: "fiberglass",
    style: ["casement"],
    climates: ["hot", "mixed", "rainy"],
    features: ["energy", "warranty"],
    uFactor: 0.30,
    stc: 33,
    warranty: "20-year"
  },
  {
    brand: "DaBella",
    series: "Glasswing",
    model: "Glasswing Premium Vinyl Slider",
    frame: "vinyl",
    style: ["sliding", "picture", "hung"],
    climates: ["rainy", "cold", "mixed"],
    features: ["energy", "warranty", "sound"],
    uFactor: 0.30,
    stc: 33,
    warranty: "Lifetime"
  },
  ...Array.from({ length: 795 }).map((_, i) => ({
    brand: ["Milgard", "Marvin", "Andersen", "Pella", "Simonton", "JELD-WEN", "DaBella", "Weather Shield"][i % 8],
    series: `Series-${i + 6}`,
    model: `Model-${i + 6}`,
    frame: ["vinyl", "fiberglass", "composite", "wood"][i % 4],
    style: ["sliding", "picture", "hung", "casement", "awning"].filter((_, j) => j % (i % 5 + 1) === 0),
    climates: ["cold", "hot", "rainy", "mixed"].filter((_, j) => j % (i % 3 + 1) === 0),
    features: ["energy", "triple", "warranty", "sound", "aesthetic", "security"].filter((_, j) => j % (i % 4 + 1) === 0),
    uFactor: +(0.25 + (i % 10) * 0.005).toFixed(2),
    stc: 30 + (i % 10),
    warranty: i % 2 === 0 ? "Lifetime" : "20-year"
  }))
];

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

  // Filter input
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

  // Export buttons
  const exportCSV = document.createElement('button');
  exportCSV.textContent = 'Export CSV';
  exportCSV.onclick = () => exportTableToCSV(models, 'recommendations.csv');

  const exportPDF = document.createElement('button');
  exportPDF.textContent = 'Export PDF';
  exportPDF.onclick = () => window.print();

  container.appendChild(exportCSV);
  container.appendChild(exportPDF);

  // Local installer search
  const zipForm = document.createElement('form');
  zipForm.innerHTML = `<input type='text' placeholder='ZIP code' style='margin-left:1rem;' /> <button>Find Local Installer</button>`;
  zipForm.onsubmit = e => {
    e.preventDefault();
    const zip = zipForm.querySelector('input').value;
    window.open(`https://www.google.com/maps/search/window+installer+near+${zip}`, '_blank');
  };
  container.appendChild(zipForm);

  // Comparison table
  const table = document.createElement('table');
  table.innerHTML = `
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
      ${models.map(m => `
        <tr>
          <td>${m.brand}</td>
          <td>${m.series}</td>
          <td>${m.model}</td>
          <td>${m.frame}</td>
          <td>${m.style.join(", ")}</td>
          <td>${m.uFactor}</td>
          <td>${m.stc}</td>
          <td>${m.warranty}</td>
        </tr>`).join('')}
    </tbody>
  `;
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
