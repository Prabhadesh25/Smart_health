/* =====================================================
   script.js — all the logic
   1) AI calculations  2) Render functions  3) Charts
   4) Navigation  5) Theme  6) Language  7) Loader
   ===================================================== */

/* ---------- 1) AI / RULE-BASED CALCULATIONS ---------- */

// Work out stock status + days left until stock-out
function getStockInfo(item) {
  const dailyUse = item.forecast / 7;              // average units used per day
  const daysLeft = Math.floor(item.stock / dailyUse);
  let status = "ok", label = "Good";
  if (item.stock <= item.reorder * 0.5) { status = "crit"; label = "Critical"; }
  else if (item.stock <= item.reorder) { status = "warn"; label = "Low"; }
  return { daysLeft, status, label };
}

// Overall district stats for the dashboard cards
function getStats() {
  const critical = STOCK.filter(s => getStockInfo(s).status === "crit").length;
  const totalBeds = CENTRES.reduce((a, c) => a + c.beds.total, 0);
  const freeBeds = CENTRES.reduce((a, c) => a + (c.beds.total - c.beds.occupied), 0);
  const presentToday = DOCTORS.filter(d => d.present).length;
  const todayFootfall = CENTRES.reduce((a, c) => a + c.footfall, 0);
  return {
    critical,
    bedPct: Math.round((freeBeds / totalBeds) * 100),
    doctorPct: Math.round((presentToday / DOCTORS.length) * 100),
    todayFootfall,
  };
}

// Which centres should be FLAGGED to the administrator
function getFlaggedCentres() {
  const flagged = [];
  CENTRES.forEach(c => {
    const bedPct = (c.beds.occupied / c.beds.total) * 100;
    const doctorsHere = DOCTORS.filter(d => d.centre === c.name);
    const attend = doctorsHere.length
      ? doctorsHere.filter(d => d.present).length / doctorsHere.length : 1;
    if (bedPct > 90) flagged.push({ name: c.name, type: c.type, issue: "Beds nearly full (" + Math.round(bedPct) + "%)", severity: "High" });
    if (attend < 1) flagged.push({ name: c.name, type: c.type, issue: "Doctor absence today", severity: "Medium" });
    if (c.tests.length <= 1) flagged.push({ name: c.name, type: c.type, issue: "Only " + c.tests.length + " diagnostic test available", severity: "Medium" });
  });
  return flagged;
}

/* ---------- 2) RENDER FUNCTIONS (build the page with data) ---------- */

function renderStatCards() {
  const s = getStats();
  document.getElementById("statCards").innerHTML = `
    <div class="stat"><i class="fas fa-hospital"></i>
      <div><div class="value">${CENTRES.length}</div><div class="label">Total Centres</div></div></div>
    <div class="stat"><i class="fas fa-pills"></i>
      <div><div class="value">${s.critical}</div><div class="label">Critical Stock-outs</div>
      <small class="down">Needs action</small></div></div>
    <div class="stat"><i class="fas fa-bed"></i>
      <div><div class="value">${s.bedPct}%</div><div class="label">Beds Free</div>
      <small class="up">Live</small></div></div>
    <div class="stat"><i class="fas fa-user-md"></i>
      <div><div class="value">${s.doctorPct}%</div><div class="label">Doctors Present</div>
      <small class="${s.doctorPct > 80 ? "up" : "down"}">Today</small></div></div>
    <div class="stat"><i class="fas fa-users"></i>
      <div><div class="value">${s.todayFootfall}</div><div class="label">Today's Footfall</div>
      <small class="up">Live count</small></div></div>`;
}

function renderStockTable() {
  document.getElementById("stockBody").innerHTML = STOCK.map(item => {
    const info = getStockInfo(item);
    return `<tr>
      <td>${item.medicine}</td><td>${item.centre}</td>
      <td>${item.stock}</td><td>${item.reorder}</td>
      <td>${item.forecast}</td>
      <td>${info.daysLeft} days</td>
      <td><span class="pill ${info.status}">${info.label}</span></td>
    </tr>`;
  }).join("");
}

function renderPatients() {
  document.getElementById("patientCards").innerHTML = CENTRES.map(c => `
    <div class="stat"><i class="fas fa-user-injured"></i>
      <div><div class="value">${c.footfall}</div><div class="label">${c.name}</div></div></div>`).join("");
}

function renderBeds() {
  document.getElementById("bedCards").innerHTML = CENTRES.map(c => {
    const free = c.beds.total - c.beds.occupied;
    const pct = Math.round((free / c.beds.total) * 100);
    return `<div class="card">
      <h3><i class="fas fa-bed"></i> ${c.name}</h3>
      <p>${free} of ${c.beds.total} beds free (${pct}%)</p>
      <div class="bar"><span style="width:${pct}%"></span></div>
    </div>`;
  }).join("");
}

function renderDoctors() {
  document.getElementById("doctorBody").innerHTML = DOCTORS.map(d => `
    <tr>
      <td>${d.name}</td><td>${d.centre}</td><td>${d.speciality}</td>
      <td><span class="pill ${d.present ? "ok" : "crit"}">${d.present ? "Present" : "Absent"}</span></td>
      <td>${d.week}/7 days</td>
    </tr>`).join("");
}

function renderTests() {
  document.getElementById("testCards").innerHTML = CENTRES.map(c => `
    <div class="card">
      <h3><i class="fas fa-vials"></i> ${c.name}</h3>
      <p>${c.tests.length} test(s) available</p>
      <p class="desc">${c.tests.join(" • ")}</p>
    </div>`).join("");
}

function renderAlerts() {
  document.getElementById("alertList").innerHTML = ALERTS.map(a => `
    <div class="list-item alert-${a.level}">
      <i class="fas ${a.type === "stock" ? "fa-pills" : a.type === "bed" ? "fa-bed" : a.type === "doctor" ? "fa-user-md" : "fa-vials"}"></i>
      <div><div class="title">${a.title}</div><div class="desc">${a.desc}</div></div>
      <span class="time">${a.time}</span>
    </div>`).join("");

  // Show only top 2 alerts + AI list on the dashboard
  document.getElementById("navBadge").textContent = ALERTS.length;
}

function renderAIRecommendations() {
  document.getElementById("aiList").innerHTML = AI_RECOMMENDATIONS.map(r => `
    <div class="list-item ai">
      <i class="fas ${r.icon}"></i>
      <div><div class="title">${r.title}</div><div class="desc">${r.reason}</div></div>
    </div>`).join("");
}

function renderFlagged() {
  document.getElementById("flaggedBody").innerHTML = getFlaggedCentres().map(f => `
    <tr>
      <td>${f.name}</td><td>${f.type}</td><td>${f.issue}</td>
      <td><span class="pill ${f.severity === "High" ? "crit" : "warn"}">${f.severity}</span></td>
      <td><button class="btn">Redistribute</button></td>
    </tr>`).join("");
}

/* ---------- 3) CHARTS (Chart.js) ---------- */

function drawCharts() {
  // Footfall line chart
  new Chart(document.getElementById("footfallChart"), {
    type: "line",
    data: {
      labels: FOOTFALL_7DAYS.map(d => d.day),
      datasets: [{
        label: "Patients",
        data: FOOTFALL_7DAYS.map(d => d.patients),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15,118,110,.15)",
        fill: true, tension: .4, pointRadius: 4,
      }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } },
  });

  // Stock status donut chart
  const ok = STOCK.filter(s => getStockInfo(s).status === "ok").length;
  const low = STOCK.filter(s => getStockInfo(s).status === "warn").length;
  const crit = STOCK.filter(s => getStockInfo(s).status === "crit").length;
  new Chart(document.getElementById("stockChart"), {
    type: "doughnut",
    data: {
      labels: ["Good", "Low", "Critical"],
      datasets: [{ data: [ok, low, crit], backgroundColor: ["#16a34a", "#d97706", "#dc2626"] }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });
}

/* ---------- 4) NAVIGATION (SPA-style page switching) ---------- */

function setupNavigation() {
  const links = document.querySelectorAll(".nav-link");
  const pages = document.querySelectorAll(".page");

  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const target = link.getAttribute("href").slice(1); // "#stock" -> "stock"

      links.forEach(l => l.classList.remove("active"));
      pages.forEach(p => p.classList.remove("active"));
      link.classList.add("active");
      document.getElementById(target).classList.add("active");

      // Close mobile menu after clicking
      document.getElementById("navMenu").classList.remove("open");
    });
  });

  // Mobile hamburger button
  document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("navMenu").classList.toggle("open");
  });

  // Refresh button — re-render everything (simulates live data)
  document.getElementById("refreshBtn").addEventListener("click", () => renderAll());
}

/* ---------- 5) DARK / LIGHT THEME ---------- */

function setupTheme() {
  const btn = document.getElementById("themeBtn");
  // Save user's choice in the browser (localStorage)
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    btn.innerHTML = '<i class="fas fa-sun"></i>';
  }
  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    btn.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem("theme", dark ? "dark" : "light");
  });
}

/* ---------- 6) LANGUAGE SWITCHER ---------- */

function setupLanguage() {
  document.getElementById("langSelect").addEventListener("change", e => {
    const words = TRANSLATIONS[e.target.value];
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (words[key]) el.textContent = words[key];
    });
  });
}

/* ---------- 7) LOADER + START ---------- */

// Render every section of the page
function renderAll() {
  renderStatCards();
  renderStockTable();
  renderPatients();
  renderBeds();
  renderDoctors();
  renderTests();
  renderAlerts();
  renderAIRecommendations();
  renderFlagged();
}

// Wait for the page to load, then start everything
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  drawCharts();
  setupNavigation();
  setupTheme();
  setupLanguage();

  // Hide the loading screen after a short animation
  setTimeout(() => document.getElementById("loader").classList.add("hide"), 900);
});
