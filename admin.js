/**
 * ResQ — Admin Panel UI Logic
 * Tab navigation, Leaflet map + incident pins, Open-Meteo weather, modal, toast.
 * Form submissions stubbed pending SQLite backend.
 */

// =========================================================================
// Tab Navigation
// =========================================================================
const NAV_ITEMS = document.querySelectorAll('.nav-item[data-panel]');
const PANELS    = document.querySelectorAll('.content-panel');

const TOPBAR_META = {
  dashboard: { title: 'Dashboard',              subtitle: 'Catarman, Northern Samar' },
  contacts:  { title: 'Emergency Contacts',     subtitle: 'Manage hotlines for index.html and home.html' },
  advisory:  { title: 'Advisory Broadcast',     subtitle: 'Push public emergency warnings and disaster updates' }
};

const topbarTitle    = document.getElementById('topbarTitle');
const topbarSubtitle = document.getElementById('topbarSubtitle');

function activatePanel(panelId) {
  NAV_ITEMS.forEach(item => item.classList.toggle('active', item.dataset.panel === panelId));
  PANELS.forEach(panel => panel.classList.toggle('active', panel.id === `panel-${panelId}`));

  const meta = TOPBAR_META[panelId];
  if (meta) {
    topbarTitle.textContent    = meta.title;
    topbarSubtitle.textContent = meta.subtitle;
  }

  if (panelId === 'dashboard' && window._leafletMap) {
    setTimeout(() => window._leafletMap.invalidateSize(), 80);
  }
}

NAV_ITEMS.forEach(item => {
  item.addEventListener('click', () => activatePanel(item.dataset.panel));
});

// =========================================================================
// Incident Log (in-memory, skeleton for backend)
// =========================================================================
const incidents = [];

function updateIncidentCount() {
  const el = document.getElementById('incidentCount');
  if (el) el.textContent = incidents.length;
}

function addIncidentToList(incident) {
  const empty = document.getElementById('incidentEmpty');
  if (empty) empty.style.display = 'none';

  const list = document.getElementById('incidentList');
  if (!list) return;

  const now  = new Date();
  const time = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });

  const row = document.createElement('div');
  row.className = 'status-row';
  row.dataset.incidentId = incident.id;
  row.style.cssText = 'align-items:flex-start;gap:.65rem;padding:.5rem 0;border-bottom:1px solid var(--border-subtle);';
  row.innerHTML = `
    <div class="status-dot" style="background:var(--accent-red);margin-top:.35rem;flex-shrink:0;" aria-hidden="true"></div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:.8125rem;font-weight:700;color:var(--text-primary);line-height:1.3;">${incident.label}</p>
      <p style="font-size:.7rem;color:var(--text-muted);margin-top:.15rem;">${time} &nbsp;·&nbsp; ${incident.coords}</p>
    </div>
    <button class="btn-danger" onclick="removeIncident(${incident.id})" title="Dismiss" style="padding:.3rem .5rem;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  list.appendChild(row);
  updateIncidentCount();
}

window.removeIncident = function(id) {
  const idx = incidents.findIndex(i => i.id === id);
  if (idx !== -1) {
    // Remove map marker
    if (incidents[idx].marker && window._leafletMap) {
      window._leafletMap.removeLayer(incidents[idx].marker);
    }
    incidents.splice(idx, 1);
  }

  // Remove DOM row
  const row = document.querySelector(`[data-incident-id="${id}"]`);
  if (row) row.remove();

  // Show empty state if no incidents left
  if (incidents.length === 0) {
    const empty = document.getElementById('incidentEmpty');
    if (empty) empty.style.display = '';
  }

  updateIncidentCount();
};

// =========================================================================
// Leaflet Map — Catarman, Northern Samar
// =========================================================================
const CATARMAN_COORDS = [12.4974, 124.6349];
let   incidentIdSeq   = 1;

function initMap() {
  const map = L.map('liveMap', {
    center: CATARMAN_COORDS,
    zoom: 14,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // MDRRMO Command pin
  const cmdIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;
      background:#dc2626;
      border:3px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(15,23,42,.3);
    "></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38]
  });

  window._mdrrmoMarker = L.marker(CATARMAN_COORDS, { icon: cmdIcon })
    .addTo(map)
    .bindPopup(
      `<strong style="font-family:'Plus Jakarta Sans',sans-serif;font-size:.875rem;">MDRRMO Catarman</strong><br>
       <span style="font-size:.75rem;color:#475569;">Municipal Disaster Risk Reduction &amp; Management Office</span><br>
       <span id="mapWeatherInline" style="font-size:.75rem;color:#dc2626;font-weight:600;">Fetching weather…</span>`,
      { maxWidth: 240 }
    );

  // ── Click-to-pin incident markers ────────────────────────────────────────
  const incidentIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;
      background:#d97706;
      border:2.5px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(15,23,42,.3);
    "></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -28]
  });

  map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    const id    = incidentIdSeq++;
    const coord = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const label = `Incident #${id}`;

    const marker = L.marker([lat, lng], { icon: incidentIcon })
      .addTo(map)
      .bindPopup(`
        <strong style="font-family:'Plus Jakarta Sans',sans-serif;font-size:.875rem;color:#d97706;">${label}</strong><br>
        <span style="font-size:.75rem;color:#475569;">${coord}</span><br>
        <button onclick="removeIncident(${id})"
          style="margin-top:.4rem;font-size:.7rem;color:#dc2626;background:none;border:none;cursor:pointer;padding:0;font-weight:700;">
          Dismiss
        </button>
      `, { maxWidth: 200 });

    marker.openPopup();

    const incident = { id, label, coords: coord, marker };
    incidents.push(incident);
    addIncidentToList(incident);
  });

  window._leafletMap = map;
}

document.addEventListener('DOMContentLoaded', initMap);

// =========================================================================
// Open-Meteo Weather — Catarman (lat 12.4974, lng 124.6349)
// Free, no API key. Attribution: "Weather data by Open-Meteo.com"
// =========================================================================
const WMO_CONDITIONS = {
  0:  'Clear Sky',
  1:  'Mainly Clear',      2:  'Partly Cloudy',        3:  'Overcast',
  45: 'Foggy',             48: 'Icy Fog',
  51: 'Light Drizzle',     53: 'Drizzle',               55: 'Heavy Drizzle',
  56: 'Light Freezing Drizzle', 57: 'Freezing Drizzle',
  61: 'Light Rain',        63: 'Moderate Rain',          65: 'Heavy Rain',
  66: 'Light Freezing Rain', 67: 'Freezing Rain',
  71: 'Light Snow',        73: 'Moderate Snow',          75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Light Rainshowers', 81: 'Rainshowers',            82: 'Violent Rainshowers',
  85: 'Light Snow Showers',86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm w/ Hail', 99: 'Thunderstorm w/ Heavy Hail'
};

const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=12.4974&longitude=124.6349' +
  '&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code' +
  '&wind_speed_unit=kmh' +
  '&timezone=Asia%2FManila';

async function fetchWeather() {
  try {
    const res  = await fetch(OPEN_METEO_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const c         = data.current;
    const tempC     = Math.round(c.temperature_2m);
    const humidity  = Math.round(c.relative_humidity_2m);
    const wind      = Math.round(c.wind_speed_10m);
    const precip    = c.precipitation.toFixed(1);
    const condition = WMO_CONDITIONS[c.weather_code] ?? 'Unknown';

    // ── Dashboard: current time stat ──────────────────────────────────────
    const now     = new Date();
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
    const statTimeValue  = document.getElementById('statTimeValue');
    const statTimeChange = document.getElementById('statTimeChange');
    if (statTimeValue)  statTimeValue.textContent  = timeStr;
    if (statTimeChange) statTimeChange.textContent = 'Just now';

    // ── Map badge ─────────────────────────────────────────────────────────
    const mapOpBadge = document.getElementById('mapOpBadge');
    if (mapOpBadge) mapOpBadge.textContent = `${tempC}°C — ${condition}`;

    // ── Update MDRRMO marker popup with live weather ──────────────────────
    if (window._mdrrmoMarker) {
      window._mdrrmoMarker.setPopupContent(
        `<strong style="font-family:'Plus Jakarta Sans',sans-serif;font-size:.875rem;">MDRRMO Catarman</strong><br>
         <span style="font-size:.75rem;color:#475569;">Municipal Disaster Risk Reduction &amp; Management Office</span><br>
         <span style="font-size:.75rem;color:#dc2626;font-weight:600;">${tempC}°C · ${condition} · Wind ${wind} km/h</span>`
      );
    }

  } catch (err) {
    console.warn('[ResQ] Open-Meteo fetch failed:', err.message);
    const mapOpBadge = document.getElementById('mapOpBadge');
    if (mapOpBadge) mapOpBadge.textContent = 'Weather unavailable';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchWeather();
  setInterval(fetchWeather, 10 * 60 * 1000);
});

// =========================================================================
// Modal — Add / Edit Unit
// =========================================================================
const unitModal      = document.getElementById('unitModal');
const openAddUnitBtn = document.getElementById('openAddUnitBtn');
const closeUnitModal = document.getElementById('closeUnitModal');
const cancelUnitModal= document.getElementById('cancelUnitModal');
const unitModalTitle = document.getElementById('unitModalTitle');

function openModal(title = 'Add Emergency Response Unit') {
  unitModalTitle.textContent = title;
  unitModal.classList.add('open');
  unitModal.removeAttribute('aria-hidden');
  document.getElementById('unitModalName').focus();
}

function closeModal() {
  unitModal.classList.remove('open');
  unitModal.setAttribute('aria-hidden', 'true');
}

openAddUnitBtn?.addEventListener('click',  () => openModal());
closeUnitModal?.addEventListener('click',  closeModal);
cancelUnitModal?.addEventListener('click', closeModal);
unitModal?.addEventListener('click', (e) => { if (e.target === unitModal) closeModal(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && unitModal?.classList.contains('open')) closeModal(); });

document.getElementById('unitModalForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  showToast('Backend not yet connected — unit not saved.');
  closeModal();
});

// =========================================================================
// Advisory form — live preview sync
// =========================================================================
const advTitle      = document.getElementById('advTitle');
const advBody       = document.getElementById('advBody');
const advDate       = document.getElementById('advDate');
const advSeverity   = document.getElementById('advSeverity');
const advisoryBadge = document.getElementById('advisoryBadge');
const previewTitle  = document.getElementById('previewTitle');
const previewBody   = document.getElementById('previewBody');
const previewDate   = document.getElementById('previewDate');

const SEV_LABELS = { warning: 'Advisory', emergency: 'Emergency Alert', info: 'Public Notice' };

function syncAdvisoryPreview() {
  if (previewTitle) previewTitle.textContent = advTitle?.value.trim() || 'Advisory headline will appear here';
  if (previewBody)  previewBody.textContent  = advBody?.value.trim()  || 'Message body will render here as you type.';
  if (previewDate)  previewDate.textContent  = advDate?.value.trim()  || 'Date / Timestamp';
  if (advisoryBadge && advSeverity) {
    const sev = advSeverity.value;
    advisoryBadge.className   = `sev-pill ${sev}`;
    advisoryBadge.textContent = SEV_LABELS[sev] || sev;
  }
}

[advTitle, advBody, advDate].forEach(el => el?.addEventListener('input', syncAdvisoryPreview));
advSeverity?.addEventListener('change', syncAdvisoryPreview);

document.getElementById('advisoryForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  showToast('Backend not yet connected — advisory not broadcasted.');
});

document.getElementById('mdrrmoForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  showToast('Backend not yet connected — hotline not saved.');
});

// =========================================================================
// Toast
// =========================================================================
const toastEl  = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
let toastTimer = null;

function showToast(message = 'Done!') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMsg.textContent = message;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}
