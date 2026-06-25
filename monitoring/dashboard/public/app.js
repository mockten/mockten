// ── State ──────────────────────────────────────────────────────────────────
let allContainers = [];
let statsCache = {};
let autoRefreshTimer = null;
let currentLogWs = null;
let currentLogLines = [];
let autoScroll = true;
let frontendRunning = false;

// ── Chart State ────────────────────────────────────────────────────────────
let cpuChart = null;
let memChart = null;
const cpuHistory = [];
const memHistory = [];
const timeLabels = [];

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initCharts();
  await loadMetricsHistory();
  fetchContainers();
  fetchFrontendStatus();
  fetchTelemetry();
  autoRefreshTimer = setInterval(() => {
    const isDashboardActive = document.getElementById('view-dashboard').classList.contains('active');
    const isContainersActive = document.getElementById('view-containers').classList.contains('active');
    
    if (isDashboardActive || isContainersActive) {
      fetchContainers();
      fetchFrontendStatus();
    }
    
    if (isDashboardActive) {
      fetchTelemetry();
    }
  }, 5000);
});

// Restore last visited view on page load
window.addEventListener('load', () => {
  const last = localStorage.getItem('lastView');
  const validViews = ['dashboard','containers','logs','topology','db','api','keycloak','model','ci','tests','pipeline','vulnerability'];
  if (last && validViews.includes(last)) {
    const navEl = document.querySelector(`.nav-item[onclick*="'${last}'"]`);
    showView(last, navEl);
  }
});

// ── Navigation ─────────────────────────────────────────────────────────────
function showView(name, el) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const viewEl = document.getElementById('view-' + name);
  if (viewEl) viewEl.classList.add('active');
  if (el) el.classList.add('active');
  localStorage.setItem('lastView', name);

  const titleKeys = {
    dashboard: 'title.dashboard', containers: 'title.containers',
    logs: 'title.logs', topology: 'title.topology', db: 'title.db',
    api: 'title.api', keycloak: 'title.keycloak', model: 'title.model',
    ci: 'title.ci', tests: 'title.tests', vulnerability: 'title.vulnerability',
    pipeline: 'title.pipeline'
  };
  const titleEl = document.getElementById('view-title');
  titleEl.setAttribute('data-i18n', titleKeys[name] || '');
  const dict = I18N[_currentLang] || I18N.en;
  titleEl.textContent = dict[titleKeys[name]] || name;

  if (name === 'dashboard')     fetchTelemetry();
  if (name === 'containers')    fetchContainers();
  if (name === 'logs')          populateLogSelect();
  if (name === 'topology')      { if (cy) cy.resize(); fetchTopology(); }
  if (name === 'db')            initDbView();
  if (name === 'api')           initApiView();
  if (name === 'keycloak')      initKeycloakView();
  if (name === 'model')         initModelView();
  if (name === 'pipeline')      initPipelineView();
  if (name === 'ci') {
    if (ciJobs.size === 0 && !ciWs) restoreCICache();
    else { renderCIJobList(); if (ciSelectedJob) renderCISteps(); }
  }
  if (name === 'tests')         initTestsView();
  if (name === 'vulnerability') initVulnView();
}

// ── Fetch Containers ───────────────────────────────────────────────────────
async function fetchContainers() {
  try {
    const res = await fetch('/dashboard/api/containers');
    if (!res.ok) throw new Error(res.statusText);
    const rawContainers = await res.json();
    
    allContainers = rawContainers.sort((a, b) => {
      const isBotA = a.name === 'nginx' || a.name === 'mockten-dashboard';
      const isBotB = b.name === 'nginx' || b.name === 'mockten-dashboard';
      
      if (isBotA && !isBotB) return 1;
      if (!isBotA && isBotB) return -1;
      if (isBotA && isBotB) {
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    renderTable(allContainers);
    updateSummary(allContainers);
    fetchAllStats(allContainers.filter(c => c.state === 'running'));
  } catch (e) {
    console.error('Failed to fetch containers:', e);
  }
}

async function fetchAllStats(containers) {
  let totalCpuSum = 0;
  let totalMemUsageSum = 0;
  let totalMemLimitSum = 0;
  let numCpus = 1;

  await Promise.all(containers.map(async c => {
    try {
      const res = await fetch(`/dashboard/api/containers/${c.id}/stats`);
      if (!res.ok) return;
      const stats = await res.json();
      statsCache[c.id] = stats;
      updateRowStats(c.id, stats);

      totalCpuSum += parseFloat(stats.cpu) || 0;
      totalMemUsageSum += parseFloat(stats.memUsage) || 0;
      totalMemLimitSum += parseFloat(stats.memLimit) || 0;
      if (stats.numCpus) {
        numCpus = stats.numCpus;
      }
    } catch {}
  }));

  const aggCpu = numCpus > 0 ? (totalCpuSum / numCpus) : 0;
  const aggMemPercent = totalMemLimitSum > 0 ? ((totalMemUsageSum / totalMemLimitSum) * 100) : 0;
  const aggMemMB = totalMemUsageSum / 1024 / 1024;

  updateCharts(aggCpu, aggMemPercent, aggMemMB);
}

// ── Time-Series Metrics Charts ──────────────────────────────────────────────
function initCharts() {
  const ctxCpu = document.getElementById('cpu-chart').getContext('2d');
  const ctxMem = document.getElementById('mem-chart').getContext('2d');

  const gridColor = '#1e2340';
  const labelColor = '#8892b0';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#141720',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: '#2a2f4a',
        borderWidth: 1,
        titleFont: { family: 'Inter, sans-serif', size: 11 },
        bodyFont: { family: 'Inter, sans-serif', size: 11 }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: labelColor, font: { size: 9, family: 'monospace' } }
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: gridColor },
        ticks: {
          color: labelColor,
          font: { size: 9, family: 'monospace' },
          callback: value => value + '%'
        }
      }
    },
    elements: {
      line: { tension: 0.35 },
      point: { radius: 0, hoverRadius: 4 }
    }
  };

  cpuChart = new Chart(ctxCpu, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        data: cpuHistory,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        borderWidth: 1.5
      }]
    },
    options: chartOptions
  });

  memChart = new Chart(ctxMem, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        data: memHistory,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        borderWidth: 1.5
      }]
    },
    options: chartOptions
  });
}

function updateCharts(totalCpu, totalMemPercent, totalMemMB) {
  const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  timeLabels.push(now);
  cpuHistory.push(totalCpu);
  memHistory.push(totalMemPercent);

  if (timeLabels.length > 8640) {
    timeLabels.shift();
    cpuHistory.shift();
    memHistory.shift();
  }

  const cpuValEl = document.getElementById('cpu-total-value');
  const memValEl = document.getElementById('mem-total-value');
  if (cpuValEl) cpuValEl.textContent = `${totalCpu.toFixed(1)}%`;
  if (memValEl) memValEl.textContent = `${totalMemMB.toFixed(0)} MB (${totalMemPercent.toFixed(1)}%)`;

  if (cpuChart) cpuChart.update('none');
  if (memChart) memChart.update('none');
}

async function loadMetricsHistory() {
  try {
    const res = await fetch('/dashboard/api/metrics/history');
    if (!res.ok) return;
    const h = await res.json();
    if (!h.timestamps || h.timestamps.length === 0) return;

    // Populate CPU/Mem charts (show up to 8640 points, Chart.js will still render fine)
    timeLabels.push(...h.timestamps);
    cpuHistory.push(...h.cpu);
    memHistory.push(...h.mem);
    if (cpuChart) cpuChart.update('none');
    if (memChart) memChart.update('none');

    // Sync header values with the latest historical point
    const lastMem = h.mem[h.mem.length - 1] ?? 0;
    const lastMemMB = h.memMB[h.memMB.length - 1] ?? 0;
    const lastCpu = h.cpu[h.cpu.length - 1] ?? 0;
    const cpuValEl = document.getElementById('cpu-total-value');
    const memValEl = document.getElementById('mem-total-value');
    if (cpuValEl) cpuValEl.textContent = `${lastCpu.toFixed(1)}%`;
    if (memValEl) memValEl.textContent = `${Math.round(lastMemMB)} MB (${lastMem.toFixed(1)}%)`;

    // Populate telemetry chart history
    telemetryHistory.timestamps.push(...h.timestamps);
    telemetryHistory.mysql.push(...h.telemetry.mysql);
    telemetryHistory.redis.push(...h.telemetry.redis);
    telemetryHistory.kong.push(...h.telemetry.kong);
  } catch (e) {
    console.error('Failed to load metrics history:', e);
  }
}

function refresh() {
  fetchContainers();
  fetchFrontendStatus();
  const btn = document.querySelector('.btn-refresh svg');
  btn.style.animation = 'spin 0.5s linear';
  setTimeout(() => btn.style.animation = '', 600);
}

// ── Frontend Status ────────────────────────────────────────────────────────
async function fetchFrontendStatus() {
  try {
    const res = await fetch('/dashboard/api/frontend/status');
    const data = await res.json();
    frontendRunning = data.running;
    const el = document.getElementById('stat-frontend');
    const icon = document.getElementById('frontend-icon');
    const btn = document.getElementById('frontend-action-btn');

    if (data.running) {
      let syncText = '';
      if (data.lastSyncMinutesAgo !== null && data.lastSyncMinutesAgo !== undefined) {
        const mins = data.lastSyncMinutesAgo;
        const formatted = mins <= 0 ? 'just now' : mins > 10080 ? '–' : mins === 1 ? '1 min ago' : `${mins} min ago`;
        syncText = ` <span style="font-size: 13px; color: var(--text-secondary); font-weight: normal; margin-left: 8px;">(Last synced ${formatted})</span>`;
      }
      el.innerHTML = `Running${syncText}`;
      el.style.color = 'var(--green)';
      icon.style.background = 'var(--green-bg)';
      icon.style.color = 'var(--green)';
      // No control button when running (host process, can only stop via task destroy)
      btn.style.display = 'none';
    } else {
      el.textContent = 'Down';
      el.style.color = 'var(--red)';
      icon.style.background = 'var(--red-bg)';
      icon.style.color = 'var(--red)';
      btn.textContent = '▶ Start (task start-frontend)';
      btn.style.display = 'inline-flex';
    }
  } catch {
    const el = document.getElementById('stat-frontend');
    if (el) el.textContent = 'Unknown';
  }
}

function frontendAction() {
  showToast('Run "task start-frontend" from the project root to start the Vite dev server', 'info');
}

// ── Summary ────────────────────────────────────────────────────────────────
function updateSummary(containers) {
  const dockerRunning = containers.filter(c => c.state === 'running').length;
  const totalRunning = dockerRunning + (frontendRunning ? 1 : 0);
  const stopped = containers.filter(c => c.state !== 'running').length;
  document.getElementById('stat-running').textContent = totalRunning;
  document.getElementById('stat-stopped').textContent = stopped;
  document.getElementById('stat-total').textContent = containers.length;
  document.getElementById('running-count').textContent = `${totalRunning} running`;
}

// ── Table ──────────────────────────────────────────────────────────────────
function filterContainers() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const filtered = q ? allContainers.filter(c => c.name.toLowerCase().includes(q)) : allContainers;
  renderTable(filtered);
}

function renderTable(containers) {
  const tbody = document.getElementById('container-tbody');
  if (containers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No containers found</td></tr>';
    return;
  }
  tbody.innerHTML = containers.map(c => `
    <tr data-id="${c.id}">
      <td>${stateBadge(c.state)}</td>
      <td><div class="container-name" title="${c.name}">${c.name}</div></td>
      <td><div class="image-name" title="${c.image}">${c.image}</div></td>
      <td class="stat-cell" id="cpu-${c.id}">
        ${c.state === 'running' ? '<div class="stat-value">–</div><div class="stat-bar-bg"><div class="stat-bar cpu-bar" style="width:0%"></div></div>' : '<div class="stat-value" style="color:var(--text-muted)">–</div>'}
      </td>
      <td class="stat-cell" id="mem-${c.id}">
        ${c.state === 'running' ? '<div class="stat-value">–</div><div class="stat-bar-bg"><div class="stat-bar mem-bar" style="width:0%"></div></div>' : '<div class="stat-value" style="color:var(--text-muted)">–</div>'}
      </td>
      <td><span style="font-size:12px;color:var(--text-secondary)">${c.status}</span></td>
      <td>
        <div class="action-btns">
          ${c.state === 'running'
            ? `<button class="btn-act btn-act-warn"  onclick="containerAction('${c.id}','restart')" title="Restart">↺</button>
               <button class="btn-act btn-act-danger" onclick="containerAction('${c.id}','stop')"    title="Stop">■</button>
               <button class="btn-login" onclick="openTerminal('${c.id}','${c.name.replace(/'/g, "\\'")}')" title="Terminal Login">&gt;_ ${(I18N[_currentLang]||I18N.en)['col.login']||'Login'}</button>`
            : `<button class="btn-act btn-act-ok"    onclick="containerAction('${c.id}','start')"   title="Start">▶</button>`
          }
          <button class="btn-log" onclick="openLogs('${c.id}','${c.name.replace(/'/g, "\\'")}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            ${(I18N[_currentLang]||I18N.en)['col.logs']||'Logs'}
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  containers.forEach(c => {
    if (statsCache[c.id]) updateRowStats(c.id, statsCache[c.id]);
  });
}

function updateRowStats(id, stats) {
  const cpuEl = document.getElementById('cpu-' + id);
  const memEl = document.getElementById('mem-' + id);
  if (!cpuEl || !memEl) return;

  const cpuPct = Math.min(parseFloat(stats.cpu) || 0, 100);
  cpuEl.innerHTML = `
    <div class="stat-value">${cpuPct.toFixed(1)}%</div>
    <div class="stat-bar-bg"><div class="stat-bar cpu-bar" style="width:${cpuPct}%"></div></div>
  `;

  const memPct = Math.min(parseFloat(stats.memPercent) || 0, 100);
  const memMB = ((stats.memUsage || 0) / 1024 / 1024).toFixed(0);
  memEl.innerHTML = `
    <div class="stat-value">${memMB} MB (${memPct.toFixed(1)}%)</div>
    <div class="stat-bar-bg"><div class="stat-bar mem-bar" style="width:${memPct}%"></div></div>
  `;
}

function stateBadge(state) {
  const map = {
    running: ['running', 'Running'],
    exited:  ['exited',  'Exited'],
    created: ['created', 'Created'],
    paused:  ['paused',  'Paused'],
  };
  const [cls, label] = map[state] || ['exited', state];
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${label}</span>`;
}

// ── Container Actions ──────────────────────────────────────────────────────
async function containerAction(id, action) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (row) row.style.opacity = '0.5';

  try {
    const res = await fetch(`/dashboard/api/containers/${id}/${action}`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).error);
    showToast(`Container ${action}ed successfully`, 'success');
  } catch (e) {
    showToast(`Failed to ${action}: ${e.message}`, 'error');
  }

  // Refresh after a short delay to let Docker settle
  setTimeout(() => { fetchContainers(); }, 1500);
}

function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── System Restart ────────────────────────────────────────────────────────
function confirmSystemRestart() {
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

async function executeSystemRestart() {
  closeModal();
  const btn = document.querySelector('.btn-system-restart');
  btn.disabled = true;
  btn.textContent = 'Restarting...';

  showToast('System restart in progress...', 'info');
  try {
    const res = await fetch('/dashboard/api/system/restart', { method: 'POST' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const count = data.restarted?.length || 0;
    const failed = data.failed?.length || 0;
    showToast(`Restarted ${count} containers${failed ? `, ${failed} failed` : ''}`, failed ? 'error' : 'success');
    setTimeout(() => fetchContainers(), 2000);
  } catch (e) {
    showToast('System restart failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> System Restart';
  }
}

// ── Logs ───────────────────────────────────────────────────────────────────
function populateLogSelect() {
  const sel = document.getElementById('log-container-select');
  const current = sel.value;

  sel.innerHTML = '<option value="">Select a source...</option>';

  // Always add the Vite frontend option first
  const feOpt = document.createElement('option');
  feOpt.value = '__frontend__';
  feOpt.textContent = '⚡ Vite Frontend (npm run dev)';
  if (current === '__frontend__') feOpt.selected = true;
  sel.appendChild(feOpt);

  // Add a visual separator
  const sep = document.createElement('option');
  sep.disabled = true;
  sep.textContent = '── Docker Containers ──';
  sel.appendChild(sep);

  // Add all containers
  allContainers.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name + (c.state !== 'running' ? ' (stopped)' : '');
    if (c.id === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function openLogs(id, name) {
  showView('logs', document.querySelector('.nav-item:nth-child(2)'));
  setTimeout(() => {
    populateLogSelect();
    document.getElementById('log-container-select').value = id;
    startLogStream();
  }, 100);
}

function startLogStream() {
  const sel = document.getElementById('log-container-select');
  const tail = document.getElementById('log-tail-select').value;
  const id = sel.value;

  if (currentLogWs) { currentLogWs.close(); currentLogWs = null; }
  clearLogs();
  if (!id) return;

  const output = document.getElementById('log-output');
  output.innerHTML = '';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';

  // ── Vite frontend log ──
  if (id === '__frontend__') {
    const wsUrl = `${proto}://${location.host}/dashboard/ws/frontend-logs`;
    setLogStatus(true);
    currentLogWs = new WebSocket(wsUrl);
    currentLogWs.onmessage = (e) => {
      const div = document.createElement('div');
      div.className = 'log-line';
      div.textContent = e.data;
      
      currentLogLines.push({ element: div, text: e.data });
      const filterText = document.getElementById('log-filter-input').value.toLowerCase();
      if (filterText && !e.data.toLowerCase().includes(filterText)) {
        div.style.display = 'none';
      }
      
      output.appendChild(div);
      if (autoScroll) output.scrollTop = output.scrollHeight;
    };
    currentLogWs.onclose = () => setLogStatus(false);
    currentLogWs.onerror = () => setLogStatus(false);
    autoScroll = true;
    output.addEventListener('scroll', handleScroll);
    return;
  }

  // ── Docker container log ──
  const wsUrl = `${proto}://${location.host}/dashboard/ws/logs?id=${id}&tail=${tail}`;
  setLogStatus(true);
  currentLogWs = new WebSocket(wsUrl);

  currentLogWs.onopen = () => setLogStatus(true);

  currentLogWs.onmessage = (e) => {
    const lines = e.data.split('\n');
    const frag = document.createDocumentFragment();
    const filterText = document.getElementById('log-filter-input').value.toLowerCase();
    
    lines.forEach(line => {
      if (!line.trim()) return;
      const div = document.createElement('div');
      div.className = 'log-line';
      let cleanText = line;
      const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(.*)$/s);
      if (tsMatch) {
        const ts = document.createElement('span');
        ts.className = 'ts';
        ts.textContent = formatTs(tsMatch[1]);
        div.appendChild(ts);
        div.appendChild(document.createTextNode(tsMatch[2]));
        cleanText = tsMatch[2];
      } else {
        div.textContent = line;
      }
      
      currentLogLines.push({ element: div, text: cleanText });
      if (filterText && !cleanText.toLowerCase().includes(filterText)) {
        div.style.display = 'none';
      }
      
      frag.appendChild(div);
    });
    output.appendChild(frag);
    if (autoScroll) output.scrollTop = output.scrollHeight;
  };

  currentLogWs.onclose = () => setLogStatus(false);
  currentLogWs.onerror = () => setLogStatus(false);
  autoScroll = true;
  output.addEventListener('scroll', handleScroll);
}

function handleScroll() {
  const output = document.getElementById('log-output');
  autoScroll = output.scrollTop + output.clientHeight >= output.scrollHeight - 50;
}

function formatTs(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3,'0') + ' ';
}

function clearLogs() {
  if (currentLogWs) { currentLogWs.close(); currentLogWs = null; }
  currentLogLines = [];
  const output = document.getElementById('log-output');
  output.innerHTML = `
    <div class="log-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <p>Select a container to view its logs</p>
    </div>`;
  const filterInput = document.getElementById('log-filter-input');
  if (filterInput) filterInput.value = '';
  setLogStatus(false);
}

function setLogStatus(streaming) {
  const el = document.getElementById('log-status');
  el.innerHTML = streaming
    ? `<div class="dot-streaming"></div><span>Streaming</span>`
    : `<div class="dot-idle"></div><span>Idle</span>`;
}

// ── Topology ───────────────────────────────────────────────────────────────
let cy = null;
let topoSelectedNode = null;

// Map node id → Docker container name for log jumping
const TOPO_CONTAINER_NAME = {
  nginx:          'nginx',
  apigw:          'apigw',
  uam:            'uam-service.default.svc.cluster.local',
  mysql:          'mysql-service.default.svc.cluster.local',
  redis:          'redis-service.default.svc.cluster.local',
  minio:          'minio-service.default.svc.cluster.local',
  meilisearch:    'meilisearch-service.default.svc.cluster.local',
  searchitem:     'searchitem-service.default.svc.cluster.local',
  product:        'product-service.default.svc.cluster.local',
  cart:           'cart-service.default.svc.cluster.local',
  ranking:        'ranking-service.default.svc.cluster.local',
  sale:           'sale-service.default.svc.cluster.local',
  ecpay:          'ecpay-service.default.svc.cluster.local',
  shipment:       'shipment-service.default.svc.cluster.local',
  geocoding:      'geocoding-service.default.svc.cluster.local',
  recommendation: 'recommendation-service.default.svc.cluster.local',
  sync:           'mockten-sync',
  dashboard:      'mockten-dashboard',
};

const GROUP_COLOR = {
  gateway:  '#6366f1',   // indigo
  frontend: '#f59e0b',   // amber
  auth:     '#8b5cf6',   // purple
  data:     '#3b82f6',   // blue
  service:  '#06b6d4',   // cyan
  meta:     '#64748b',   // slate
  pipeline: '#f97316',   // orange
};

async function fetchTopology() {
  try {
    const res = await fetch('/dashboard/api/topology');
    const data = await res.json();
    // Overlay frontend status
    const feRes = await fetch('/dashboard/api/frontend/status');
    const feData = await feRes.json();
    const feNode = data.nodes.find(n => n.id === 'frontend');
    if (feNode) feNode.state = feData.running ? 'running' : 'exited';

    renderTopology(data);
  } catch (e) {
    console.error('Topology fetch failed', e);
  }
}

function nodeColor(node) {
  if (node.state === 'running') return '#10b981';  // green
  if (node.state === 'exited')  return '#ef4444';  // red
  return GROUP_COLOR[node.group] || '#64748b';
}

const nodePositions = {
  frontend: { x: 400, y: 50 },
  nginx: { x: 400, y: 150 },
  apigw: { x: 300, y: 250 },
  uam: { x: 500, y: 250 },
  
  searchitem: { x: 100, y: 380 },
  product: { x: 200, y: 380 },
  cart: { x: 300, y: 380 },
  ranking: { x: 400, y: 380 },
  sale: { x: 500, y: 380 },
  ecpay: { x: 600, y: 380 },
  shipment: { x: 700, y: 380 },
  geocoding: { x: 800, y: 380 },
  recommendation: { x: 250, y: 480 },
  sync: { x: 450, y: 480 },
  
  mysql: { x: 300, y: 600 },
  redis: { x: 420, y: 600 },
  minio: { x: 540, y: 600 },
  meilisearch: { x: 660, y: 600 },
  dashboard: { x: 100, y: 600 },

  'airflow-web': { x: 820, y: 480 },
  'airflow-sch': { x: 960, y: 480 },
  'airflow-pg':  { x: 890, y: 600 },
};

function renderTopology({ nodes, edges }) {
  const elements = [
    ...nodes.map(n => ({
      data: {
        id: n.id,
        label: n.label,
        group: n.group,
        state: n.state,
        color: nodeColor(n),
        borderColor: GROUP_COLOR[n.group] || '#64748b',
      },
      position: nodePositions[n.id] || { x: 0, y: 0 }
    })),
    ...edges.map((e, i) => ({
      data: {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        dashed: e.dashed || false,
      }
    }))
  ];

  if (cy) {
    // Update existing instance (preserve layout)
    cy.elements().remove();
    cy.add(elements);
    cy.resize();
    cy.layout({ name: 'preset', fit: true, padding: 40 }).run();
    return;
  }

  cy = cytoscape({
    container: document.getElementById('topo-cy'),
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'width': 58,
          'height': 58,
          'background-color': 'data(color)',
          'border-width': 2,
          'border-color': 'data(borderColor)',
          'label': 'data(label)',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': 6,
          'font-size': 11,
          'font-family': 'Inter, sans-serif',
          'color': '#e2e8f0',
          'text-outline-color': '#0d0f17',
          'text-outline-width': 2,
          'text-wrap': 'wrap',
          'text-max-width': 90,
          'transition-property': 'background-color, border-color, width, height',
          'transition-duration': '0.3s',
        }
      },
      {
        selector: 'node[state="running"]',
        style: {
          'background-color': '#10b981',
          'border-color': '#34d399',
          'border-width': 3,
        }
      },
      {
        selector: 'node[state="exited"]',
        style: {
          'background-color': '#ef4444',
          'border-color': '#f87171',
          'border-width': 2,
          'opacity': 0.75,
        }
      },
      {
        selector: 'node[group="gateway"]',
        style: { 'shape': 'round-rectangle', 'width': 72, 'height': 44 }
      },
      {
        selector: 'node[group="data"]',
        style: { 'shape': 'round-rectangle', 'width': 64, 'height': 42 }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': 4,
          'border-color': '#f59e0b',
          'width': 68,
          'height': 68,
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 1.5,
          'line-color': '#2a2f4a',
          'target-arrow-color': '#4a5568',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 0.7,
        }
      },
      {
        selector: 'edge[?dashed]',
        style: { 'line-style': 'dashed', 'opacity': 0.35 }
      },
      {
        selector: 'edge:selected, edge.highlighted',
        style: {
          'line-color': '#6366f1',
          'target-arrow-color': '#6366f1',
          'width': 2.5,
          'opacity': 1,
        }
      },
    ],
    layout: {
      name: 'preset',
      fit: true,
      padding: 40,
    },
    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,
    backgroundColor: '#080a10',
  });

  // Click on node → show info panel
  cy.on('tap', 'node', evt => {
    const node = evt.target;
    topoSelectedNode = node.data();

    // Highlight connected edges
    cy.elements().removeClass('highlighted');
    node.connectedEdges().addClass('highlighted');

    // Info panel
    const panel = document.getElementById('topo-info');
    document.getElementById('topo-info-name').textContent = topoSelectedNode.label.replace(/\n/g, ' ');
    const stateEl = document.getElementById('topo-info-state');
    stateEl.textContent = topoSelectedNode.state;
    stateEl.style.color = topoSelectedNode.state === 'running' ? 'var(--green)'
                        : topoSelectedNode.state === 'exited'  ? 'var(--red)' : 'var(--text-secondary)';
    document.getElementById('topo-info-group').textContent = topoSelectedNode.group;
    // Hide logs button for frontend node (handled differently)
    document.getElementById('topo-info-logs').style.display =
      topoSelectedNode.id === 'frontend' ? 'none' : 'inline-flex';
    panel.style.display = 'block';
  });

  // Click on background → deselect
  cy.on('tap', evt => {
    if (evt.target === cy) {
      cy.elements().removeClass('highlighted');
      document.getElementById('topo-info').style.display = 'none';
      topoSelectedNode = null;
    }
  });
}

function topoOpenLogs() {
  if (!topoSelectedNode) return;
  const containerName = TOPO_CONTAINER_NAME[topoSelectedNode.id];
  if (!containerName) return;
  // Find the container id from allContainers
  const container = allContainers.find(c => c.name === containerName);
  if (!container) { showToast('Container not found in running list', 'error'); return; }
  openLogs(container.id, container.name);
}

// ── DB Viewer ─────────────────────────────────────────────────────────────────
let dbInitialized = false;
let mysqlCurrentTable = null;
let mysqlOffset = 0;
let mysqlLimit = 50;
let mysqlTotal = 0;
let mysqlColumns = [];
let mysqlColumnMeta = {};
let mysqlPrimaryKeys = [];
let mysqlCurrentRows = [];
let mysqlSearchTimer = null;

async function initDbView() {
  if (!dbInitialized) {
    dbInitialized = true;
    await Promise.all([loadMysqlTables(), loadRedisKeys()]);
  }
}

// ─── MySQL ────────────────────────────────────────────────────────────────────
async function loadMysqlTables() {
  const ul = document.getElementById('mysql-tables-ul');
  try {
    const res = await fetch('/dashboard/api/db/mysql/tables');
    const tables = await res.json();
    if (tables.error) throw new Error(tables.error);
    ul.innerHTML = tables.map(t => `
      <div class="db-list-item" id="dbt-${t.name}" onclick="loadMysqlTable('${t.name}')">
        <span class="db-item-name">${t.name}</span>
        <span class="db-item-count">${t.approxRows ?? '?'}</span>
      </div>
    `).join('');
  } catch (e) {
    ul.innerHTML = `<div class="db-error">MySQL error: ${e.message}</div>`;
  }
}

async function loadMysqlTable(table, offset = 0) {
  mysqlCurrentTable = table;
  mysqlOffset = offset;
  const search = document.getElementById('mysql-search').value;

  // Highlight selected
  document.querySelectorAll('.db-list-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('dbt-' + table);
  if (el) el.classList.add('active');

  const wrap = document.getElementById('mysql-table-wrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Loading...</div>';

  const params = new URLSearchParams({ limit: mysqlLimit, offset, search });
  try {
    const res = await fetch(`/dashboard/api/db/mysql/table/${table}?${params}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    mysqlTotal = data.total;
    mysqlColumns = data.columns;
    mysqlColumnMeta = data.columnMeta || {};
    mysqlPrimaryKeys = data.primaryKeys || [];
    mysqlCurrentRows = data.rows;
    document.getElementById('mysql-data-header').style.display = 'flex';
    const mysqlAdd = document.getElementById('btn-mysql-add-row');
    if (mysqlAdd) mysqlAdd.style.display = 'inline-flex';
    document.getElementById('mysql-table-title').textContent = table;
    document.getElementById('mysql-row-count').textContent = `${data.total.toLocaleString()} rows`;
    document.getElementById('mysql-page-info').textContent =
      `${offset + 1}–${Math.min(offset + data.rows.length, data.total)} / ${data.total}`;
    document.getElementById('mysql-prev').disabled = offset === 0;
    document.getElementById('mysql-next').disabled = offset + data.rows.length >= data.total;

    if (data.rows.length === 0) {
      wrap.innerHTML = '<div class="log-placeholder"><p>No rows found</p></div>';
      return;
    }

    const cols = data.columns;
    wrap.innerHTML = `
      <table class="db-data-table">
        <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}<th>Actions</th></tr></thead>
        <tbody>${data.rows.map((row, idx) => `
          <tr>${cols.map(c => {
            const v = row[c];
            const str = v === null ? '<span class="db-null">NULL</span>'
                      : typeof v === 'object' ? `<span class="db-json" title="${JSON.stringify(v).replace(/"/g,'&quot;')}">{…}</span>`
                      : String(v).length > 60 ? `<span title="${String(v).replace(/"/g,'&quot;')}">${String(v).slice(0,60)}…</span>`
                      : String(v);
            return `<td>${str}</td>`;
          }).join('')}
          <td>
            <button class="btn-act btn-act-ok" style="padding:2px 8px;font-size:11px" onclick="editMysqlRow(${idx})">${(I18N[_currentLang]||I18N.en)['col.edit']||'Edit'}</button>
            <button class="btn-act btn-act-danger" style="padding:2px 8px;font-size:11px;margin-left:4px" onclick="deleteMysqlRow(${idx})">${(I18N[_currentLang]||I18N.en)['col.delete']||'Delete'}</button>
          </td>
          </tr>
        `).join('')}</tbody>
      </table>`;
  } catch (e) {
    wrap.innerHTML = `<div class="db-error">Error: ${e.message}</div>`;
  }
}

function mysqlSearch() {
  clearTimeout(mysqlSearchTimer);
  mysqlSearchTimer = setTimeout(() => {
    if (mysqlCurrentTable) loadMysqlTable(mysqlCurrentTable, 0);
  }, 400);
}
function mysqlPrev() { if (mysqlOffset > 0) loadMysqlTable(mysqlCurrentTable, Math.max(0, mysqlOffset - mysqlLimit)); }
function mysqlNext() { if (mysqlOffset + mysqlLimit < mysqlTotal) loadMysqlTable(mysqlCurrentTable, mysqlOffset + mysqlLimit); }

// ─── Redis ────────────────────────────────────────────────────────────────────
async function loadRedisKeys() {
  const pattern = document.getElementById('redis-pattern').value || '*';
  const ul = document.getElementById('redis-keys-ul');
  ul.innerHTML = '<div class="loading-row"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`/dashboard/api/db/redis/keys?pattern=${encodeURIComponent(pattern)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    document.getElementById('redis-total').textContent = `(${data.total} total)`;
    if (data.keys.length === 0) {
      ul.innerHTML = '<div class="db-error">No keys found</div>';
      return;
    }
    ul.innerHTML = data.keys.sort().map(k => `
      <div class="db-list-item" id="rdk-${btoa(k).replace(/=/g,'')}" onclick="loadRedisKey('${k.replace(/'/g,"\\'")}')">
        <span class="db-item-name" style="font-family:monospace;font-size:11px">${k}</span>
      </div>
    `).join('');
  } catch (e) {
    ul.innerHTML = `<div class="db-error">Redis error: ${e.message}</div>`;
  }
}

function redisSearch() { loadRedisKeys(); }

async function loadRedisKey(key) {
  // Highlight selected
  document.querySelectorAll('#redis-keys-ul .db-list-item').forEach(el => el.classList.remove('active'));
  const safeId = 'rdk-' + btoa(key).replace(/=/g,'');
  const el = document.getElementById(safeId);
  if (el) el.classList.add('active');

  const wrap = document.getElementById('redis-detail-wrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Loading...</div>';

  try {
    const res = await fetch(`/dashboard/api/db/redis/key?key=${encodeURIComponent(key)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById('redis-detail-header').style.display = 'flex';
    document.getElementById('redis-key-name').textContent = key;
    document.getElementById('redis-key-meta').textContent =
      `type: ${data.type}  TTL: ${data.ttl === -1 ? '∞' : data.ttl + 's'}`;

    let html = '';
    if (data.type === 'string') {
      let display = data.value;
      try { display = JSON.stringify(JSON.parse(data.value), null, 2); } catch {}
      html = `<pre class="redis-string">${display}</pre>`;
    } else if (data.type === 'hash') {
      const entries = Object.entries(data.value || {});
      html = `<table class="db-data-table"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>
        ${entries.map(([f,v]) => `<tr><td style="font-family:monospace">${f}</td><td>${v}</td></tr>`).join('')}
      </tbody></table>`;
    } else if (data.type === 'list' || data.type === 'set') {
      html = `<table class="db-data-table"><thead><tr><th>#</th><th>Value</th></tr></thead><tbody>
        ${(data.value || []).map((v,i) => `<tr><td>${i}</td><td>${v}</td></tr>`).join('')}
      </tbody></table>`;
    } else if (data.type === 'zset') {
      html = `<table class="db-data-table"><thead><tr><th>Score</th><th>Member</th></tr></thead><tbody>
        ${(data.value || []).map(({member, score}) => `<tr><td>${score}</td><td>${member}</td></tr>`).join('')}
      </tbody></table>`;
    } else {
      html = `<div class="db-error">Type "${data.type}" not supported</div>`;
    }
    wrap.innerHTML = html;
  } catch (e) {
    wrap.innerHTML = `<div class="db-error">Error: ${e.message}</div>`;
  }
}

// ─── Tab Switching ────────────────────────────────────────────────────────────
let currentDbTab = 'mysql';
function switchDbTab(tabName) {
  currentDbTab = tabName;
  document.querySelectorAll('.db-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.db-tab-content').forEach(pnl => pnl.classList.remove('active'));

  const activeBtn = document.getElementById('db-tab-' + tabName);
  if (activeBtn) activeBtn.classList.add('active');

  const activePanel = document.getElementById('db-panel-' + tabName);
  if (activePanel) activePanel.classList.add('active');

  // Hide add buttons until a table/collection is loaded
  const mysqlAdd = document.getElementById('btn-mysql-add-row');
  if (mysqlAdd) mysqlAdd.style.display = 'none';
}

// ─── Add Row Modal & Submissions ──────────────────────────────────────────────
let modalDbType = null;
let modalTableOrCollection = null;
let modalMode = 'add';
let editingRowData = null;

function getPrimaryKeyColumn(tableName, columns) {
  if (mysqlPrimaryKeys.length === 1) return mysqlPrimaryKeys[0];
  if (mysqlPrimaryKeys.length > 1) return mysqlPrimaryKeys[0];
  if (columns.includes('id')) return 'id';
  const specificId = tableName.toLowerCase() + '_id';
  const match = columns.find(c => c.toLowerCase() === specificId);
  if (match) return match;
  const fallback = columns.find(c => c.endsWith('_id'));
  if (fallback) return fallback;
  return columns[0];
}

function getMysqlPKs(rowData) {
  const pks = mysqlPrimaryKeys.length > 0 ? mysqlPrimaryKeys : [getPrimaryKeyColumn(mysqlCurrentTable, mysqlColumns)];
  return { pkNames: pks, pkValues: pks.map(k => rowData[k]) };
}

function _fieldInputHtml(col, defaultValue, dbType) {
  // Prefer server-provided MySQL column type; fall back to name heuristics for MongoDB
  const meta = (dbType === 'mysql' || dbType === undefined) ? (mysqlColumnMeta[col] || {}) : {};
  const sqlType = (meta.dataType || '').toLowerCase();
  const lower = col.toLowerCase();

  let val = defaultValue !== undefined && defaultValue !== null ? defaultValue : '';

  // Determine input type from SQL type first, then name heuristics
  const isJson = sqlType === 'json' || /category|tags|roles|image_path|reputation/.test(lower);
  const isDate = sqlType === 'date' || (!sqlType && /(?:^|_)date(?:$|_)|_day$|^date/.test(lower));
  const isDatetime = sqlType === 'datetime' || sqlType === 'timestamp' || (!sqlType && /time(?:$|stamp)|datetime|updated|created/.test(lower));
  const isInt = sqlType === 'int' || sqlType === 'bigint' || sqlType === 'smallint' || sqlType === 'tinyint';
  const isFloat = sqlType === 'float' || sqlType === 'double' || sqlType === 'decimal';
  const isNumber = isInt || isFloat || (!sqlType && /^(stocks|price|rank|quantity|count|amount|score|age|weight|height|lat|lon|latitude|longitude)$/.test(lower));
  const isEnum = sqlType === 'enum';
  const isEmail = /email|mail/.test(lower);
  const isUrl = sqlType === 'text' ? false : /url|link/.test(lower);

  const safeVal = (v) => String(v === null || v === undefined ? '' : v).replace(/&/g,'&amp;').replace(/"/g,'&quot;');

  if (isJson) {
    const display = val !== '' ? (typeof val === 'object' ? JSON.stringify(val) : val) : '';
    return `<textarea id="db-field-${col}" name="${col}" class="form-control" rows="3" style="font-family:var(--font-mono);resize:vertical;" placeholder='e.g. ["id1","id2"] or {...}'>${safeVal(display)}</textarea>`;
  }
  if (isDate) {
    let dateVal = '';
    if (val !== '') {
      const d = new Date(val);
      if (!isNaN(d)) dateVal = d.toISOString().slice(0, 10);
      else dateVal = String(val).slice(0, 10);
    }
    return `<input type="date" id="db-field-${col}" name="${col}" class="form-control" value="${dateVal}" />`;
  }
  if (isDatetime) {
    let dtVal = '';
    if (val !== '') {
      const d = new Date(val);
      if (!isNaN(d)) dtVal = d.toISOString().slice(0, 16);
    }
    return `<input type="datetime-local" id="db-field-${col}" name="${col}" class="form-control" value="${dtVal}" />`;
  }
  if (isNumber) {
    return `<input type="number" id="db-field-${col}" name="${col}" class="form-control" value="${safeVal(val)}" step="${isFloat ? 'any' : '1'}" />`;
  }
  if (isEmail) {
    return `<input type="email" id="db-field-${col}" name="${col}" class="form-control" value="${safeVal(val)}" placeholder="user@example.com" />`;
  }
  if (isUrl) {
    return `<input type="url" id="db-field-${col}" name="${col}" class="form-control" value="${safeVal(val)}" placeholder="https://..." />`;
  }
  return `<input type="text" id="db-field-${col}" name="${col}" class="form-control" value="${safeVal(val)}" placeholder="Enter value..." />`;
}

function openAddRowModal(dbType) {
  modalDbType = dbType;
  modalMode = 'add';
  editingRowData = null;
  const overlay = document.getElementById('db-modal-overlay');
  const title = document.getElementById('db-modal-title');
  const fieldsContainer = document.getElementById('db-modal-fields');

  fieldsContainer.innerHTML = '';

  if (dbType === 'mysql') {
    modalTableOrCollection = mysqlCurrentTable;
    const dict = I18N[_currentLang] || I18N.en;
    title.textContent = `${dict['modal.insertMySQL'] || 'Insert into MySQL'}: ${mysqlCurrentTable}`;

    mysqlColumns.forEach(col => {
      const meta = mysqlColumnMeta[col] || {};
      const isPk = mysqlPrimaryKeys.includes(col);
      const isOptional = !isPk && (meta.nullable || meta.hasDefault);
      const optLabel = (I18N[_currentLang] || I18N.en)['modal.optional'] || 'optional';
      fieldsContainer.innerHTML += `
        <div class="form-group">
          <label for="db-field-${col}">${col} ${isOptional ? `<span style="color:var(--text-muted);font-weight:normal;">(${optLabel})</span>` : ''}</label>
          ${_fieldInputHtml(col, undefined, 'mysql')}
        </div>
      `;
    });
  }

  overlay.classList.add('active');
}

function openEditRowModal(dbType, rowData) {
  openAddRowModal(dbType);
  modalMode = 'edit';
  editingRowData = rowData;

  const title = document.getElementById('db-modal-title');
  const dictE = I18N[_currentLang] || I18N.en;
  title.textContent = `${dictE['modal.editMySQL'] || 'Edit Row in MySQL'}: ${mysqlCurrentTable}`;

  // Re-render fields with row values so typed inputs (date, number, etc.) get correct formats
  const form = document.getElementById('db-modal-form');
  const fieldsContainer2 = document.getElementById('db-modal-fields');
  const textarea = form.querySelector('textarea[name="raw_json"]');
  if (textarea) {
    textarea.value = JSON.stringify(rowData, null, 2);
  } else {
    const pks = dbType === 'mysql'
      ? (mysqlPrimaryKeys.length > 0 ? mysqlPrimaryKeys : [getPrimaryKeyColumn(mysqlCurrentTable, mysqlColumns)])
      : [];
    const cols = mysqlColumns;
    fieldsContainer2.innerHTML = '';
    cols.forEach(col => {
      const val = rowData[col];
      const meta = dbType === 'mysql' ? (mysqlColumnMeta[col] || {}) : {};
      const isPk = pks.includes(col);
      const isOptional = dbType === 'mysql' && !isPk && (meta.nullable || meta.hasDefault);
      const optLabel = (I18N[_currentLang] || I18N.en)['modal.optional'] || 'optional';
      const labelSuffix = isOptional ? ` <span style="color:var(--text-muted);font-weight:normal;">(${optLabel})</span>` : '';
      fieldsContainer2.innerHTML += `
        <div class="form-group">
          <label for="db-field-${col}">${col}${labelSuffix}</label>
          ${_fieldInputHtml(col, val !== undefined ? val : '', dbType)}
        </div>
      `;
    });
    if (pks.length) {
      pks.forEach(pk => {
        const inp = form.querySelector(`[name="${pk}"]`);
        if (inp) inp.disabled = true;
      });
    }
  }
}

function closeDbModal() {
  document.getElementById('db-modal-overlay').classList.remove('active');
  const form = document.getElementById('db-modal-form');
  form.reset();
  form.querySelectorAll('.form-control').forEach(inp => inp.disabled = false);
  modalMode = 'add';
  editingRowData = null;
}

async function submitAddRow(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const payload = {};

  const inputs = form.querySelectorAll('.form-control');
  inputs.forEach(input => {
    const name = input.name;
    const val = input.value.trim();

    const meta = mysqlColumnMeta[name] || {};
    const isPk = mysqlPrimaryKeys.includes(name);
    const isOptional = !isPk && (meta.nullable || meta.hasDefault);
    if (isOptional && val === '') return;

    const sqlType = (meta.dataType || '').toLowerCase();
    if (sqlType === 'json') {
      try { payload[name] = val === '' ? null : JSON.parse(val); } catch { payload[name] = val; }
    } else if (val !== '' && !isNaN(val) && val !== '') {
      payload[name] = val.includes('.') ? parseFloat(val) : parseInt(val);
    } else {
      payload[name] = val === '' ? null : val;
    }
  });

  let endpoint = `/dashboard/api/db/mysql/table/${modalTableOrCollection}`;

  let method = 'POST';
  let bodyPayload = payload;

  if (modalMode === 'edit') {
    method = 'PUT';
    const { pkNames, pkValues } = getMysqlPKs(editingRowData);
    bodyPayload = { row: payload, pkNames, pkValues };
  }

  try {
    const res = await fetch(endpoint, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);

    showToast(modalMode === 'edit' ? 'Record updated successfully' : 'Record added successfully', 'success');
    closeDbModal();
    loadMysqlTable(modalTableOrCollection, mysqlOffset);
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// ─── Row Edit / Delete Handlers ───────────────────────────────────────────────
function editMysqlRow(idx) {
  const rowData = mysqlCurrentRows[idx];
  openEditRowModal('mysql', rowData);
}

async function deleteMysqlRow(idx) {
  const rowData = mysqlCurrentRows[idx];
  const { pkNames, pkValues } = getMysqlPKs(rowData);
  if (pkValues.some(v => v === undefined || v === null)) {
    showToast('Cannot delete: primary key is null', 'error');
    return;
  }

  const pkDesc = pkNames.map((k, i) => `${k} = ${pkValues[i]}`).join(', ');
  if (!confirm(`Are you sure you want to delete this row where ${pkDesc}?`)) return;

  try {
    const params = new URLSearchParams();
    pkNames.forEach((k, i) => { params.append('pkNames[]', k); params.append('pkValues[]', pkValues[i]); });
    const res = await fetch(`/dashboard/api/db/mysql/table/${mysqlCurrentTable}?${params}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);

    showToast('Record deleted successfully', 'success');
    loadMysqlTable(mysqlCurrentTable, mysqlOffset);
  } catch (e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}

// ── Interactive Terminal ──────────────────────────────────────────────────
let termInstance = null;
let termWs = null;

function openTerminal(containerId, name) {
  document.getElementById('term-modal-overlay').classList.add('active');
  document.getElementById('term-modal-title').querySelector('span:last-child').textContent = `Container Shell: ${name}`;

  const container = document.getElementById('terminal-container');
  container.innerHTML = ''; 

  const cols = 80;
  const rows = 24;
  
  termInstance = new Terminal({
    cols: cols,
    rows: rows,
    cursorBlink: true,
    theme: {
      background: '#0d0f17',
      foreground: '#e2e8f0',
      cursor: '#f59e0b',
      selectionBackground: 'rgba(99, 102, 241, 0.3)'
    },
    fontFamily: 'JetBrains Mono, Courier New, Courier, monospace',
    fontSize: 13,
    lineHeight: 1.2
  });

  termInstance.open(container);
  termInstance.focus();
  termInstance.write('Connecting to container terminal...\r\n');

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${proto}://${location.host}/dashboard/ws/exec?id=${containerId}&cols=${cols}&rows=${rows}`;
  termWs = new WebSocket(wsUrl);

  termWs.onopen = () => {
    termInstance.write('Connected.\r\n\r\n');
  };

  termWs.onmessage = (e) => {
    termInstance.write(e.data);
  };

  termWs.onclose = () => {
    termInstance.write('\r\nSession closed.\r\n');
    termWs = null;
  };

  termWs.onerror = (err) => {
    termInstance.write('\r\nConnection error.\r\n');
    console.error('Terminal WebSocket error:', err);
    termWs = null;
  };

  termInstance.onData((data) => {
    if (termWs && termWs.readyState === WebSocket.OPEN) {
      termWs.send(data);
    }
  });
}

function closeTermModal() {
  if (termWs) {
    try { termWs.close(); } catch (e) {}
    termWs = null;
  }
  if (termInstance) {
    try { termInstance.dispose(); } catch (e) {}
    termInstance = null;
  }
  document.getElementById('term-modal-overlay').classList.remove('active');
}

async function triggerSync(event) {
  if (event) event.stopPropagation();
  const btn = document.getElementById('btn-sync-trigger');
  if (!btn) return;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Syncing...';

  const tracker = startProgressBar('sync', 'sync-progress-container', 'sync-progress-bar', 'sync-progress-pct', 3);

  try {
    const res = await fetch('/dashboard/api/sync/trigger', { method: 'POST' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast('Database to Meilisearch sync completed', 'success');
    tracker.finish();
    fetchFrontendStatus();
  } catch (e) {
    showToast('Sync failed: ' + e.message, 'error');
    tracker.fail();
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ── SQL Query Editor, Import, and Export ────────────────────────────────────────
function openSqlEditorModal() {
  document.getElementById('sql-modal-overlay').classList.add('active');
  document.getElementById('sql-query-text').focus();
}

function closeSqlModal() {
  document.getElementById('sql-modal-overlay').classList.remove('active');
}

async function runSql() {
  const sql = document.getElementById('sql-query-text').value.trim();
  if (!sql) return;
  
  const wrap = document.getElementById('sql-result-wrap');
  wrap.innerHTML = '<div style="padding: 20px; text-align: center;"><div class="spinner"></div>Running Query...</div>';

  try {
    const res = await fetch('/dashboard/api/db/mysql/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    if (data.columns && data.columns.length > 0) {
      wrap.innerHTML = `
        <table class="db-data-table">
          <thead><tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${data.rows.map(row => `
            <tr>${data.columns.map(c => `<td>${row[c] === null ? '<span class="db-null">NULL</span>' : row[c]}</td>`).join('')}</tr>
          `).join('')}</tbody>
        </table>
      `;
    } else {
      wrap.innerHTML = `<div style="padding: 20px; color: var(--green);">Query executed successfully. Result: ${JSON.stringify(data.info || data)}</div>`;
    }
  } catch (e) {
    wrap.innerHTML = `<div style="padding: 20px; color: var(--red); font-family: monospace;">Error: ${e.message}</div>`;
  }
}

function exportMysqlDump() {
  showToast('Generating database export...', 'info');
  window.location.href = '/dashboard/api/db/mysql/export';
}

function triggerMysqlImport() {
  document.getElementById('mysql-import-file').click();
}

async function handleMysqlImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm(`Are you sure you want to import ${file.name}? This might overwrite existing tables.`)) return;

  showToast('Importing SQL dump...', 'info');

  try {
    const res = await fetch('/dashboard/api/db/mysql/import', {
      method: 'POST',
      body: file
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    showToast('Database imported successfully!', 'success');
    if (mysqlCurrentTable) loadMysqlTable(mysqlCurrentTable, 0);
  } catch (e) {
    showToast('Import failed: ' + e.message, 'error');
  } finally {
    event.target.value = '';
  }
}

// ── API Specifications ──────────────────────────────────────────────────────────
const API_DESCRIPTIONS = {
  // Auth (Keycloak / UAM)
  'POST /api/uam/token':
    'Authenticates a user via Keycloak OpenID Connect (password grant). Kong injects <code>client_id</code>, <code>client_secret</code>, and <code>grant_type</code> automatically — callers only supply <code>username</code> and <code>password</code>. Returns an access token, refresh token, and ID token.',

  'POST /api/uam/creation/token':
    'Obtains a Keycloak admin token using hardcoded superadmin credentials injected by Kong. Used internally by the frontend to call admin-level APIs (e.g. user creation) without exposing the admin password to the client.',

  'GET /api/uam/userinfo':
    'Returns the authenticated user\'s profile claims (sub, email, name, preferred_username) from Keycloak. Requires a valid Bearer token in the <code>Authorization</code> header. Kong proxies the token through to Keycloak\'s <code>/userinfo</code> endpoint.',

  'GET /api/uam/auth':
    'Redirects the browser to the Keycloak OAuth2 authorization page to begin an authorization-code flow. Kong appends <code>client_id=mockten-react-client</code> automatically. Used as the entry point for Google SSO login.',

  'GET /api/uam/broker/google/endpoint':
    'Handles the Google OAuth2 callback for Keycloak\'s identity broker. After Google redirects here, Keycloak exchanges the authorization code and links the Google account to the realm user.',

  'POST /api/uam/broker/google/endpoint':
    'POST variant of the Google SSO broker callback. Accepts form-encoded parameters from the Google authorization server and completes the OpenID Connect federation flow inside Keycloak.',

  'GET /api/uam/users':
    'Lists users in the Keycloak realm via the Admin REST API. Kong forwards the caller\'s <code>Authorization</code> (admin token) header and strips the <code>Host</code> to avoid routing conflicts.',

  'POST /api/uam/users':
    'Creates a new user in the Keycloak realm using the Admin REST API. Requires an admin Bearer token. Kong forwards the token and strips the Host header. CORS is enabled for browser-based admin UIs.',

  'GET /api/uam/roles':
    'Returns all realm-level roles defined in the Keycloak realm (e.g. <code>admin</code>, <code>user</code>). Requires an admin Bearer token forwarded by Kong. Used by the frontend to populate role assignment dropdowns.',

  // Storage
  'GET /api/storage':
    'Proxies GET requests to MinIO object storage (<code>/photos</code> bucket). The path segment after <code>/api/storage</code> maps directly to the photo filename in MinIO. Used by the frontend to render product images without exposing internal MinIO credentials.',

  // Search
  'GET /api/search':
    'Full-text product search backed by MeiliSearch. The <code>searchitem</code> Go service builds a filtered MeiliSearch query supporting keyword, pagination, category, status (on_sale / sold_out), in-stock flag, price range, and minimum rating. Results include product metadata and photo URLs.',

  'GET /api/categories':
    'Returns the complete list of product categories from MySQL via the <code>searchitem</code> service. Used by the frontend search bar to populate the category filter dropdown. No authentication required.',

  // Product
  'GET /api/item/detail':
    'Fetches full product detail (name, description, price, images, stock count, average rating) from MySQL. The <code>product</code> Go service looks up the row by <code>productId</code> path param and returns a JSON object including all fields.',

  'GET /api/item/reviews':
    'Returns paginated customer reviews for a specific product from MySQL. Supports <code>limit</code> / <code>offset</code> query params. The <code>product</code> Go service queries the Reviews table joined on <code>productId</code>.',

  'POST /api/item/review':
    'Submits or updates a product review. The <code>product</code> Go service upserts the review row and atomically recalculates the product\'s average rating using a weighted formula inside a MySQL transaction.',

  // Favorites
  'GET /api/fav':
    'Returns the authenticated user\'s wishlist from MySQL. The <code>product</code> Go service reads the <code>Wishlist</code> table, hydrates each stored product ID with full product data, and returns the list. Requires a valid JWT (user extracted from token claims).',

  'POST /api/fav/([^/]+)': 'Adds a product to the user\'s wishlist in MySQL using an upsert (INSERT … ON DUPLICATE KEY UPDATE). The product ID is extracted from the URL path. Requires a valid JWT. Returns 200 if already favorited.',
  'DELETE /api/fav/([^/]+)': 'Removes a product from the user\'s wishlist by updating the JSON array stored in the <code>Wishlist</code> table. The product ID is extracted from the URL path. Requires a valid JWT.',

  // Cart
  'GET /api/cart':
    'Retrieves the authenticated user\'s shopping cart from Redis. The <code>cart</code> Go service uses the user ID (from JWT) as the Redis key and returns a JSON array of cart items with quantity and product metadata.',

  'POST /api/cart/items':
    'Adds an item to the cart stored in Redis, or increments quantity if already present. The <code>cart</code> Go service deserializes the current cart, upserts the item, and writes back atomically.',

  'PUT /api/cart/items/([^/]+)': 'Updates the quantity of a specific cart item in Redis. The product ID comes from the URL path. If quantity is set to 0, the item is removed.',
  'DELETE /api/cart/items/([^/]+)': 'Removes a specific item from the Redis cart by product ID extracted from the URL path.',
  'DELETE /api/cart':
    'Clears the entire cart for the authenticated user by deleting the Redis key. Used after a successful checkout to reset cart state.',

  // Geocoding / Profile
  'GET /api/profile':
    'Retrieves the authenticated user\'s delivery address profile from the <code>geocoding</code> Go service (stored in a local JSON file keyed by <code>user_id</code>). Returns name, postal code, address, and geocoded latitude/longitude.',

  'POST /api/profile':
    'Saves or updates the user\'s delivery address. The <code>geocoding</code> Go service calls the Google Maps Geocoding API to convert the postal code and address into lat/lon coordinates, then persists the enriched profile.',

  'GET /api/shipping':
    'Calculates the shipping fee between the user\'s saved address (<code>geo_id</code>) and the product\'s warehouse location. The <code>geocoding</code> service computes the Haversine distance and applies a tiered fee schedule.',

  'GET /api/geo':
    'Returns saved geocoded address records for a user from the <code>geocoding</code> service. Used by the checkout flow to let the user select a previously saved delivery address.',

  'PUT /api/geo':
    'Saves a new geocoded address for the user. The <code>geocoding</code> Go service stores the address with lat/lon coordinates returned by Google Maps API.',

  // Payment (ecpay)
  'GET /api/payment-method':
    'Lists the authenticated user\'s saved payment methods (credit/debit cards) from MySQL via the <code>ecpay</code> Go service. Card details are stored encrypted; only type and masked number are returned.',

  'POST /api/payment-method':
    'Registers a new payment method. The <code>ecpay</code> Go service tokenizes the card via Stripe API and stores the Stripe token reference in MySQL. Raw card numbers are never persisted.',

  'PUT /api/payment-method':
    'Updates metadata for an existing saved payment method (e.g. billing name). Does not re-tokenize — the Stripe token reference stays unchanged.',

  'DELETE /api/payment-method':
    'Removes a saved payment method from MySQL and detaches the Stripe payment method via the Stripe API.',

  'GET /api/payment':
    'Returns the authenticated user\'s order/payment history from MySQL. Each record includes order ID, amount, status, payment method used, and timestamp.',

  'POST /api/payment':
    'Executes a payment via the Stripe Charges API using the selected payment method. The <code>ecpay</code> Go service creates a Stripe PaymentIntent, records the order in MySQL, and triggers the shipment and ranking services asynchronously.',

  // Ranking
  'GET /api/ranking':
    'Returns top-ranked products ordered by total purchase count. The <code>ranking</code> Go service reads a sorted set from Redis that is updated in real-time on each purchase event. Supports optional category filter.',

  // Shipment
  'GET /api/shipment':
    'Returns shipment records for the given user from MySQL. Each record includes order ID, recipient, address, current status (preparing / in_transit / delivered), and estimated delivery date simulated by the <code>shipment</code> Go service.',

  'POST /api/shipment':
    'Creates a new shipment record in MySQL and starts the delivery state machine. The <code>shipment</code> Go service advances status from "preparing" → "in_transit" → "delivered" on a configurable tick interval.',

  // Sale
  'GET /api/sale':
    'Returns currently active sale items from the <code>sale</code> Go service. Items are indexed in MeiliSearch with discount metadata; this endpoint queries MeiliSearch and returns the filtered, sorted list of discounted products.',

  // Recommendation
  'GET /api/recommendation':
    'Returns personalized product recommendations for a user. The Python <code>recommendation</code> service uses a collaborative-filtering model (trained on purchase history) to score items. Falls back to popularity-based ranking for cold-start users.',

  'GET /api/recommendation/similar':
    'Returns products similar to the given item using item-to-item collaborative filtering. The recommendation model computes cosine similarity between item embedding vectors and returns the top-N closest items.',

  'POST /api/recommendation/train':
    'Triggers an async retraining of the recommendation model using the latest purchase history from MySQL. The Python service loads the data, re-fits the matrix-factorization model, and persists the result to MinIO.',

  'GET /api/recommendation/model/status':
    'Returns the current status of the recommendation model: whether it is trained, currently training, the timestamp of the last successful train, and the number of users/items in the training data.',

  'GET /api/recommendation/also-bought':
    'Returns products frequently co-purchased with the given product, based on <code>Order</code> transaction history. Joins orders to transactions twice to find other items in the same order as the target product, ranked by co-purchase frequency. Falls back to highest-rated products in the same category when order history is insufficient. Does not require authentication.',

  'GET /api/co-purchase':
    'Returns up to <code>limit</code> products frequently bought by the same users who bought the specified product (<code>product_id</code>). Two-step fallback: (1) co-purchase signal — other products ordered by users who also ordered the target product, ranked by co-buy frequency then average review score; (2) same-category popular products by average review to fill any remaining slots when co-purchase data is sparse. Does not require authentication.',

  // ── Browsing History ────────────────────────────────────────────────────────
  'POST /api/browsing-history/([^/]+)':
    'Records a product page view in the <code>BrowsingHistory</code> MySQL table for the authenticated user. The <code>:productId</code> path segment identifies the viewed product. Called automatically by the frontend when a user visits a product detail page. Requires a valid Bearer token.',

  'GET /api/browsing-history/recommendations':
    'Returns product recommendations derived from the authenticated user\'s browsing history. Looks up the categories of the five most recently viewed product types, then returns the highest-rated products in those categories that the user has not already viewed. Falls back to an empty list if no history exists. Requires a valid Bearer token.',

  'GET /api/stats':
    'Returns API gateway telemetry derived from Kong\'s access log. By default returns both <code>topApis</code> (most requested endpoints) and <code>slowApis</code> (highest average latency, min 3 samples). Pass <code>type=top</code> or <code>type=slow</code> to get a single array. Served by the monitoring dashboard service.',
};

const API_DESCRIPTIONS_JA = {
  'POST /api/uam/token': 'KeycloakのOpenID Connect（パスワードグラント）でユーザー認証を行います。Kongが<code>client_id</code>、<code>client_secret</code>、<code>grant_type</code>を自動付与するため、呼び出し元は<code>username</code>と<code>password</code>のみ指定します。アクセストークン・リフレッシュトークン・IDトークンを返します。',
  'POST /api/uam/creation/token': 'Kongが注入したスーパー管理者の認証情報を使用してKeycloakの管理者トークンを取得します。クライアントに管理者パスワードを公開せずにユーザー作成などの管理APIを呼び出すために使用されます。',
  'GET /api/uam/userinfo': '認証済みユーザーのプロフィール情報（sub、email、name、preferred_username）をKeycloakから返します。<code>Authorization</code>ヘッダーに有効なBearerトークンが必要です。Kongがトークンをプロキシします。',
  'GET /api/uam/auth': '認可コードフローを開始するためにブラウザをKeycloakのOAuth2認可ページにリダイレクトします。KongがGoogleSSOのエントリポイントとして自動的に<code>client_id</code>を付与します。',
  'GET /api/uam/broker/google/endpoint': 'KeycloakのIDブローカーのGoogle OAuth2コールバックを処理します。Googleからリダイレクト後、Keycloakが認可コードを交換してGoogleアカウントをレルムユーザーにリンクします。',
  'POST /api/uam/broker/google/endpoint': 'Google SSOブローカーコールバックのPOSTバリアントです。Googleの認可サーバーからフォームエンコードパラメータを受け取り、Keycloak内でOIDCフェデレーションフローを完了します。',
  'GET /api/uam/users': 'Admin REST APIを通じてKeycloakレルムのユーザー一覧を返します。Kongが呼び出し元の<code>Authorization</code>（管理者トークン）ヘッダーを転送します。',
  'POST /api/uam/users': 'Admin REST APIを使用してKeycloakレルムに新しいユーザーを作成します。管理者のBearerトークンが必要です。',
  'GET /api/uam/roles': 'Keycloakレルムで定義されたすべてのレルムロールを返します。Kongが管理者トークンを転送します。フロントエンドのロール割り当てドロップダウンの生成に使用されます。',
  'GET /api/storage': 'MinIOオブジェクトストレージ（<code>/photos</code>バケット）へのGETリクエストをプロキシします。<code>/api/storage</code>以降のパスがMinIOのファイル名に直接マップされます。',
  'GET /api/search': 'MeiliSearchを利用した全文商品検索。キーワード、ページネーション、カテゴリ、在庫状況、価格範囲、最低評価などのフィルターをサポートします。',
  'GET /api/categories': 'MySQLから商品カテゴリの全リストを返します。フロントエンドの検索バーのカテゴリフィルタードロップダウンに使用されます。',
  'GET /api/item/detail': 'MySQLから商品の詳細情報（名前、説明、価格、画像、在庫数、平均評価）を取得します。',
  'GET /api/item/reviews': '特定商品の顧客レビューをMySQLからページネーション形式で返します。',
  'POST /api/item/review': '商品レビューを投稿または更新します。MySQLトランザクション内で平均評価を再計算します。',
  'GET /api/fav': '認証済みユーザーのウィッシュリストをMySQLから返します。有効なJWTが必要です。',
  'POST /api/fav/([^/]+)': 'MYSQLのウィッシュリストに商品をアップサート（INSERT … ON DUPLICATE KEY UPDATE）で追加します。有効なJWTが必要です。',
  'DELETE /api/fav/([^/]+)': 'ウィッシュリストから商品を削除します。URLパスから商品IDを取得します。有効なJWTが必要です。',
  'GET /api/cart': 'Redisから認証済みユーザーのショッピングカートを取得します。ユーザーIDをRedisキーとして使用します。',
  'POST /api/cart/items': 'Redisのカートにアイテムを追加するか、既に存在する場合は数量を増やします。',
  'PUT /api/cart/items/([^/]+)': 'Redis内の特定カートアイテムの数量を更新します。数量が0の場合はアイテムを削除します。',
  'DELETE /api/cart/items/([^/]+)': 'URLパスの商品IDでRedisカートから特定アイテムを削除します。',
  'DELETE /api/cart': '認証済みユーザーのRedisキーを削除してカート全体をクリアします。チェックアウト後に使用されます。',
  'GET /api/profile': 'ユーザーの配送先住所プロフィール（名前、郵便番号、住所、緯度経度）をgeocordingサービスから取得します。',
  'POST /api/profile': 'ユーザーの配送先住所を保存・更新します。Google Maps APIで郵便番号を緯度経度に変換します。',
  'GET /api/shipping': 'ユーザーの保存済み住所と商品の倉庫間の送料を計算します。Haversine距離に基づく段階的な料金体系を適用します。',
  'GET /api/geo': '保存済みのジオコーディング済み住所レコードを返します。チェックアウト時の配送先選択に使用されます。',
  'PUT /api/geo': 'Google Maps APIで返された緯度経度座標とともに新しい住所を保存します。',
  'GET /api/payment-method': '認証済みユーザーの保存済み支払い方法をMySQLから一覧表示します。カード詳細は暗号化されており、種類とマスクされた番号のみ返します。',
  'POST /api/payment-method': '新しい支払い方法を登録します。Stripe APIでカードをトークン化し、StripeトークンリファレンスのみMySQLに保存します。',
  'PUT /api/payment-method': '既存の支払い方法のメタデータを更新します（例：請求者名）。Stripeトークンは変更されません。',
  'DELETE /api/payment-method': 'MySQLから支払い方法を削除し、Stripe APIでも決済方法を切り離します。',
  'GET /api/payment': '認証済みユーザーの注文・支払い履歴をMySQLから返します。',
  'POST /api/payment': 'Stripe APIで支払いを実行します。注文をMySQLに記録し、配送・ランキングサービスを非同期で起動します。',
  'GET /api/ranking': '購入数順の上位商品を返します。RedisのソートセットをリアルタイムでP更新します。カテゴリフィルターをサポートします。',
  'GET /api/shipment': 'MySQLからユーザーの配送記録を返します。注文ID、受取人、住所、配送状況（準備中/輸送中/配達済み）を含みます。',
  'POST /api/shipment': 'MySQLに新しい配送記録を作成し、配送ステートマシンを開始します。「準備中」→「輸送中」→「配達済み」の順に進行します。',
  'GET /api/sale': 'MeiliSearchから現在有効なセール商品を返します。割引メタデータ付きで索引化されています。',
  'GET /api/recommendation': 'ユーザーへのパーソナライズされた商品レコメンドを返します。協調フィルタリングモデルを使用します。コールドスタートユーザーには人気度ベースのランキングにフォールバックします。',
  'GET /api/recommendation/similar': '指定された商品に類似した商品をアイテム間協調フィルタリングで返します。アイテム埋め込みベクトル間のコサイン類似度を計算します。',
  'POST /api/recommendation/train': 'MySQLの最新購買履歴を使用してレコメンデーションモデルを非同期で再学習します。行列因子分解モデルを再フィットしてMinIOに保存します。',
  'GET /api/recommendation/model/status': 'レコメンデーションモデルの現在の状態（学習済み/学習中、最終学習時刻、ユーザー数/アイテム数）を返します。',

  'GET /api/recommendation/also-bought': '指定商品と同じ注文に含まれた他商品を<code>Order</code>の取引履歴から返します。同一注文内の共同購買頻度順にランキングします。注文履歴が不足する場合は同カテゴリの高評価商品にフォールバックします。認証不要。',

  'GET /api/co-purchase': '指定商品（<code>product_id</code>）を購入したユーザーが他に購入した商品を最大<code>limit</code>件返します。2段階フォールバック: (1) 同一ユーザーの共同購買実績から頻度順・評価順でランキング; (2) 共同購買データが少ない場合は同カテゴリの高評価商品で補完。認証不要。',

  'POST /api/browsing-history/([^/]+)': '認証済みユーザーの商品閲覧履歴をMySQLの<code>BrowsingHistory</code>テーブルに記録します。パスセグメント<code>:productId</code>が閲覧商品を識別します。フロントエンドが商品詳細ページ訪問時に自動的に呼び出します。有効なJWTが必要です。',
  'GET /api/browsing-history/recommendations': '認証済みユーザーの閲覧履歴に基づく商品レコメンドを返します。直近5種類の閲覧商品のカテゴリを特定し、そのカテゴリ内で未閲覧かつ評価の高い商品を返します。履歴がない場合は空リストを返します。有効なJWTが必要です。',
  'GET /api/stats': 'Kongのアクセスログを集計したAPIゲートウェイテレメトリを返します。デフォルトでは<code>topApis</code>（リクエスト数上位）と<code>slowApis</code>（平均レイテンシ上位、最低3サンプル）の両方を返します。<code>type=top</code>または<code>type=slow</code>で絞り込み可能です。',
};

const API_DESCRIPTIONS_ZH = {
  'POST /api/uam/token': '通过Keycloak OpenID Connect（密码授权）对用户进行身份验证。Kong自动注入<code>client_id</code>、<code>client_secret</code>和<code>grant_type</code>，调用方只需提供<code>username</code>和<code>password</code>。返回访问令牌、刷新令牌和ID令牌。',
  'POST /api/uam/creation/token': '使用Kong注入的超级管理员凭据获取Keycloak管理员令牌。用于内部调用管理级API（如用户创建），无需向客户端暴露管理员密码。',
  'GET /api/uam/userinfo': '从Keycloak返回已认证用户的个人信息（sub、email、name、preferred_username）。需要在<code>Authorization</code>头中提供有效的Bearer令牌。',
  'GET /api/uam/auth': '将浏览器重定向到Keycloak OAuth2授权页面，开始授权码流程。作为Google SSO登录的入口点。',
  'GET /api/uam/broker/google/endpoint': '处理Keycloak身份代理的Google OAuth2回调。Google重定向后，Keycloak交换授权码并将Google账号链接到领域用户。',
  'POST /api/uam/broker/google/endpoint': 'Google SSO代理回调的POST变体。接收来自Google授权服务器的表单编码参数，完成Keycloak内的OIDC联合流程。',
  'GET /api/uam/users': '通过Admin REST API列出Keycloak领域中的用户。Kong转发调用方的管理员令牌头。',
  'POST /api/uam/users': '使用Admin REST API在Keycloak领域中创建新用户。需要管理员Bearer令牌。',
  'GET /api/uam/roles': '返回Keycloak领域中定义的所有领域角色。需要管理员Bearer令牌，用于前端角色分配下拉菜单。',
  'GET /api/storage': '代理对MinIO对象存储（<code>/photos</code>存储桶）的GET请求。路径段直接映射到MinIO中的文件名。',
  'GET /api/search': '由MeiliSearch支持的全文商品搜索，支持关键词、分页、类别、库存状态、价格范围和最低评分等过滤器。',
  'GET /api/categories': '从MySQL返回完整的商品类别列表，用于前端搜索栏的类别过滤下拉菜单。',
  'GET /api/item/detail': '从MySQL获取完整的商品详情（名称、描述、价格、图片、库存数量、平均评分）。',
  'GET /api/item/reviews': '从MySQL以分页形式返回特定商品的客户评价。',
  'POST /api/item/review': '提交或更新商品评价。在MySQL事务中原子性地重新计算平均评分。',
  'GET /api/fav': '从MySQL返回已认证用户的心愿单。需要有效的JWT。',
  'POST /api/fav/([^/]+)': '使用UPSERT（INSERT … ON DUPLICATE KEY UPDATE）将商品添加到MySQL心愿单。需要有效的JWT。',
  'DELETE /api/fav/([^/]+)': '从心愿单中删除商品。从URL路径提取商品ID。需要有效的JWT。',
  'GET /api/cart': '从Redis获取已认证用户的购物车。以用户ID作为Redis键。',
  'POST /api/cart/items': '将商品添加到Redis购物车，如已存在则增加数量。',
  'PUT /api/cart/items/([^/]+)': '更新Redis中特定购物车商品的数量。数量为0时删除该商品。',
  'DELETE /api/cart/items/([^/]+)': '从Redis购物车中删除URL路径中指定商品ID的商品。',
  'DELETE /api/cart': '删除已认证用户的Redis键，清空整个购物车。结账后使用。',
  'GET /api/profile': '从geocoding服务获取用户的配送地址（姓名、邮政编码、地址、纬度经度）。',
  'POST /api/profile': '保存或更新用户的配送地址。调用Google Maps API将邮政编码转换为经纬度坐标。',
  'GET /api/shipping': '计算用户保存地址与商品仓库之间的运费。基于Haversine距离应用分级费率。',
  'GET /api/geo': '返回用户保存的地理编码地址记录，用于结账时选择配送地址。',
  'PUT /api/geo': '保存带有Google Maps API返回的经纬度坐标的新地址。',
  'GET /api/payment-method': '从MySQL列出已认证用户的保存支付方式。卡片详情已加密，仅返回类型和脱敏卡号。',
  'POST /api/payment-method': '注册新的支付方式。通过Stripe API对卡片进行令牌化，仅将Stripe令牌引用存储在MySQL中。',
  'PUT /api/payment-method': '更新现有支付方式的元数据（如账单姓名）。Stripe令牌保持不变。',
  'DELETE /api/payment-method': '从MySQL删除支付方式并通过Stripe API分离支付方法。',
  'GET /api/payment': '从MySQL返回已认证用户的订单/支付历史。',
  'POST /api/payment': '通过Stripe API执行支付，将订单记录到MySQL，并异步触发配送和排名服务。',
  'GET /api/ranking': '按购买量返回排名靠前的商品。Redis有序集合实时更新。支持可选的类别过滤器。',
  'GET /api/shipment': '从MySQL返回用户的配送记录，包含订单ID、收件人、地址和配送状态。',
  'POST /api/shipment': '在MySQL中创建新的配送记录并启动配送状态机：准备中→运输中→已送达。',
  'GET /api/sale': '从MeiliSearch返回当前有效的促销商品，带有折扣元数据。',
  'GET /api/recommendation': '返回用户的个性化商品推荐。使用协同过滤模型，冷启动用户回退到基于热度的排名。',
  'GET /api/recommendation/similar': '使用物品间协同过滤返回与指定商品相似的商品，计算物品嵌入向量间的余弦相似度。',
  'POST /api/recommendation/train': '使用MySQL最新购买历史异步重新训练推荐模型，重新拟合矩阵分解模型并持久化到MinIO。',
  'GET /api/recommendation/model/status': '返回推荐模型的当前状态：是否已训练、正在训练、最后成功训练时间戳及训练数据中的用户数/商品数。',

  'GET /api/recommendation/also-bought': '基于<code>Order</code>交易历史，返回与指定商品经常一起购买的商品。通过两次连接订单与事务找到同一订单中的其他商品，按共同购买频次排序。当订单历史不足时，回退到同分类高评分商品。无需身份验证。',

  'GET /api/co-purchase': '返回购买了指定商品（<code>product_id</code>）的用户还购买了哪些商品，最多返回<code>limit</code>件。两步降级策略：(1) 基于同一用户的共同购买记录，按共同购买频次和平均评分排序；(2) 当共同购买数据不足时，用同分类高评分商品补充剩余名额。无需身份验证。',

  'POST /api/browsing-history/([^/]+)': '将已认证用户的商品浏览记录写入MySQL的<code>BrowsingHistory</code>表。路径段<code>:productId</code>标识被浏览的商品。前端在用户访问商品详情页时自动调用。需要有效的JWT。',
  'GET /api/browsing-history/recommendations': '根据已认证用户的浏览历史返回商品推荐。提取最近5种浏览商品所属分类，返回这些分类中评分最高且未曾浏览的商品。若无历史记录则返回空列表。需要有效的JWT。',
  'GET /api/stats': '返回基于Kong访问日志聚合的API网关遥测数据。默认同时返回<code>topApis</code>（请求量最高的端点）和<code>slowApis</code>（平均延迟最高，至少3个样本）。可通过<code>type=top</code>或<code>type=slow</code>筛选。',
};

const API_SCHEMAS = {
  // Sentinel prepended to any schema that requires a Bearer token
  '__auth__': { name: 'Authorization', location: 'header', type: 'string', desc: 'Bearer <access_token>', required: true, default: '__superadmin_token__' },

  'POST /api/uam/token': [
    { name: 'username', location: 'body', type: 'string', desc: 'User login name',  desc_ja: 'ログインユーザー名', desc_zh: '登录用户名', required: true, default: 'superadmin' },
    { name: 'password', location: 'body', type: 'string', desc: 'User password',    desc_ja: 'パスワード',         desc_zh: '用户密码',   required: true, default: 'superadmin' }
  ],
  'GET /api/uam/auth': [
    { name: 'response_type', location: 'query', type: 'string', desc: 'Must be "code" for authorization code flow', desc_ja: '認可コードフローには"code"を指定',          desc_zh: '授权码流程必须填"code"',          required: true,  default: 'code' },
    { name: 'redirect_uri',  location: 'query', type: 'string', desc: 'Callback URL after login',                   desc_ja: 'ログイン後のコールバックURL',              desc_zh: '登录后的回调URL',                 required: true,  default: 'http://localhost/callback' },
    { name: 'scope',         location: 'query', type: 'string', desc: 'Requested scopes (space-separated)',          desc_ja: 'リクエストするスコープ（スペース区切り）', desc_zh: '请求的范围（空格分隔）',           required: false, default: 'openid profile email' },
    { name: 'state',         location: 'query', type: 'string', desc: 'Random string for CSRF protection',           desc_ja: 'CSRF対策用ランダム文字列',               desc_zh: 'CSRF防护用随机字符串',             required: false, default: '' },
    { name: 'nonce',         location: 'query', type: 'string', desc: 'Nonce embedded in ID token',                  desc_ja: 'IDトークンに埋め込まれるnonce',          desc_zh: '嵌入ID令牌的nonce值',              required: false, default: '' },
  ],
  'GET /api/uam/userinfo': ['__auth__'],
  'POST /api/uam/creation/token': [
    { name: 'username', location: 'body', type: 'string', desc: 'Admin login name', desc_ja: '管理者ユーザー名', desc_zh: '管理员用户名', required: true, default: 'superadmin' },
    { name: 'password', location: 'body', type: 'string', desc: 'Admin password',   desc_ja: '管理者パスワード', desc_zh: '管理员密码',   required: true, default: 'superadmin' }
  ],
  'POST /api/uam/users': [
    { name: 'username', location: 'body', type: 'string', desc: 'New username',    desc_ja: '新しいユーザー名',   desc_zh: '新用户名',       required: true, default: 'newuser1' },
    { name: 'email',    location: 'body', type: 'string', desc: 'Email address',   desc_ja: 'メールアドレス',    desc_zh: '电子邮件地址',   required: true, default: 'newuser1@example.com' },
    { name: 'password', location: 'body', type: 'string', desc: 'Password',        desc_ja: 'パスワード',        desc_zh: '密码',           required: true, default: 'password123' }
  ],
  'POST /api/item/review': [
    '__auth__',
    { name: 'productId', location: 'body', type: 'string',  desc: 'ID of the product being reviewed', desc_ja: 'レビュー対象の商品ID',  desc_zh: '被评论的商品ID', required: true,  default: '__first_product_id__' },
    { name: 'rating',    location: 'body', type: 'integer', desc: 'Rating from 1 to 5',               desc_ja: '評価（1〜5）',           desc_zh: '评分（1–5）',   required: true,  default: 5 },
    { name: 'comment',   location: 'body', type: 'string',  desc: 'Review comments text',             desc_ja: 'レビューコメント本文',   desc_zh: '评论内容',       required: false, default: 'Tastes amazing!' }
  ],
  'POST /api/fav/:id': [
    '__auth__',
    { name: 'id', location: 'path', type: 'string', desc: 'ID of the item to favorite',   desc_ja: 'お気に入りに追加する商品ID', desc_zh: '要收藏的商品ID', required: true, default: '__first_product_id__' }
  ],
  'DELETE /api/fav/:id': [
    '__auth__',
    { name: 'id', location: 'path', type: 'string', desc: 'ID of the item to unfavorite', desc_ja: 'お気に入りから削除する商品ID', desc_zh: '要取消收藏的商品ID', required: true, default: '__first_product_id__' }
  ],
  'POST /api/cart/items': [
    '__auth__',
    { name: 'product_id',    location: 'body', type: 'string',  desc: 'ID of the product to add to cart', desc_ja: 'カートに追加する商品ID', desc_zh: '要添加到购物车的商品ID', required: true, default: '__first_product_id__' },
    { name: 'quantity',      location: 'body', type: 'integer', desc: 'Quantity to add',                   desc_ja: '追加する数量',           desc_zh: '添加数量',               required: true, default: 1 },
    { name: 'shipping_type', location: 'body', type: 'string',  desc: 'Shipping method (road/air/sea)',    desc_ja: '配送方法（road/air/sea）', desc_zh: '配送方式（road/air/sea）', required: true, default: 'road' }
  ],
  'PUT /api/cart/items/:id': [
    '__auth__',
    { name: 'id',       location: 'path', type: 'string',  desc: 'ID of the cart item',    desc_ja: 'カートアイテムID',  desc_zh: '购物车商品ID', required: true, default: '__first_product_id__' },
    { name: 'quantity', location: 'body', type: 'integer', desc: 'New quantity value',      desc_ja: '更新後の数量',      desc_zh: '新的数量',     required: true, default: 2 }
  ],
  'DELETE /api/cart/items/:id': [
    '__auth__',
    { name: 'id', location: 'path', type: 'string', desc: 'ID of the cart item to remove', desc_ja: '削除するカートアイテムID', desc_zh: '要移除的购物车商品ID', required: true, default: '__first_product_id__' }
  ],
  'POST /api/profile': [
    '__auth__',
    { name: 'firstName',  location: 'body', type: 'string', desc: 'First name of the user',           desc_ja: 'ユーザーの名',              desc_zh: '用户名字',     required: true, default: 'Liam' },
    { name: 'lastName',   location: 'body', type: 'string', desc: 'Last name of the user',            desc_ja: 'ユーザーの姓',              desc_zh: '用户姓氏',     required: true, default: 'Smith' },
    { name: 'postalCode', location: 'body', type: 'string', desc: 'Postal code for delivery address', desc_ja: '配送先郵便番号',            desc_zh: '配送地址邮政编码', required: true, default: '100-0001' },
    { name: 'address',    location: 'body', type: 'string', desc: 'Street address details',           desc_ja: '住所の詳細',                desc_zh: '街道地址详情', required: true, default: '1-1 Chiyoda, Tokyo' }
  ],
  'POST /api/payment': [
    '__auth__',
    { name: 'orderId',       location: 'body', type: 'string', desc: 'Associated Order UUID',   desc_ja: '関連注文UUID',       desc_zh: '关联订单UUID', required: true, default: 'dc105f9f-501f-43b2-9916-5c1151a91e9e' },
    { name: 'amount',        location: 'body', type: 'number', desc: 'Payment amount total',    desc_ja: '支払い合計金額',     desc_zh: '支付总金额',   required: true, default: 1500 },
    { name: 'paymentMethod', location: 'body', type: 'string', desc: 'Payment method name',     desc_ja: '支払い方法名',       desc_zh: '支付方式名称', required: true, default: 'VISA' }
  ],
  'POST /api/payment-method': [
    '__auth__',
    { name: 'type',    location: 'body', type: 'string', desc: 'Card type (e.g. VISA, JCB)',        desc_ja: 'カード種別（例：VISA、JCB）', desc_zh: '卡类型（如VISA、JCB）',   required: true, default: 'VISA' },
    { name: 'details', location: 'body', type: 'object', desc: 'Payment card details object',       desc_ja: 'カード詳細オブジェクト',     desc_zh: '支付卡详情对象',          required: true, default: '{"card_number":"1111222233334444","holder_name":"Liam Smith"}' }
  ],
  'POST /api/shipment': [
    '__auth__',
    { name: 'orderId',    location: 'body', type: 'string', desc: 'Associated Order UUID',       desc_ja: '関連注文UUID',       desc_zh: '关联订单UUID',   required: true, default: 'dc105f9f-501f-43b2-9916-5c1151a91e9e' },
    { name: 'recipient',  location: 'body', type: 'string', desc: 'Full name of recipient',      desc_ja: '受取人のフルネーム', desc_zh: '收件人全名',     required: true, default: 'Liam Smith' },
    { name: 'address',    location: 'body', type: 'string', desc: 'Shipping address details',    desc_ja: '配送先住所の詳細',   desc_zh: '配送地址详情',   required: true, default: '1-1 Chiyoda, Tokyo' }
  ],
  'GET /api/recommendation': [
    { name: 'user_id', location: 'query', type: 'string', desc: 'User email or ID for personalized recommendations', desc_ja: 'パーソナライズ推薦用ユーザーメールまたはID', desc_zh: '个性化推荐用用户邮箱或ID', required: true, default: 'dev_user_001@example.com' }
  ],
  'GET /api/recommendation/similar': [
    { name: 'product_id', location: 'query', type: 'string', desc: 'Product ID for similar item recommendations', desc_ja: '類似商品推薦用商品ID', desc_zh: '相似商品推荐用商品ID', required: true, default: '__first_product_id__' }
  ],

  // ── Search ──────────────────────────────────────────────────────────────────
  'GET /api/search': [
    { name: 'q',          location: 'query', type: 'string',  desc: 'Search keyword',                       desc_ja: '検索キーワード',                      desc_zh: '搜索关键词',               required: false, default: '__first_product_name__' },
    { name: 'p',          location: 'query', type: 'integer', desc: 'Page number (1-based)',                 desc_ja: 'ページ番号（1始まり）',               desc_zh: '页码（从1开始）',           required: false, default: 1 },
    { name: 'status',     location: 'query', type: 'string',  desc: 'Item status filter (repeatable)',       desc_ja: '商品ステータスフィルター（複数可）', desc_zh: '商品状态过滤（可重复）',    required: false, default: '' },
    { name: 'category',   location: 'query', type: 'string',  desc: 'Category ID filter (repeatable)',       desc_ja: 'カテゴリIDフィルター（複数可）',     desc_zh: '分类ID过滤（可重复）',      required: false, default: '' },
    { name: 'stock',      location: 'query', type: 'string',  desc: 'In-stock filter: "1" = in stock only', desc_ja: '在庫フィルター: "1"=在庫あり',       desc_zh: '库存过滤："1"=仅有货',      required: false, default: '' },
    { name: 'min_price',  location: 'query', type: 'number',  desc: 'Minimum price filter',                 desc_ja: '最低価格フィルター',                 desc_zh: '最低价格过滤',              required: false, default: '' },
    { name: 'max_price',  location: 'query', type: 'number',  desc: 'Maximum price filter',                 desc_ja: '最高価格フィルター',                 desc_zh: '最高价格过滤',              required: false, default: '' },
    { name: 'min_rating', location: 'query', type: 'number',  desc: 'Minimum average rating filter',        desc_ja: '最低平均評価フィルター',             desc_zh: '最低平均评分过滤',          required: false, default: '' }
  ],
  'GET /api/categories': [],

  // ── Product ─────────────────────────────────────────────────────────────────
  'GET /api/item/detail': [
    { name: 'productId', location: 'path', type: 'string', desc: 'Product ID appended to URL path', desc_ja: 'URLパスに付加する商品ID', desc_zh: '附加到URL路径的商品ID', required: true, default: '__first_product_id__' }
  ],
  'GET /api/item/reviews': [
    { name: 'productId', location: 'path',  type: 'string',  desc: 'Product ID appended to URL path', desc_ja: 'URLパスに付加する商品ID', desc_zh: '附加到URL路径的商品ID', required: true,  default: '__first_product_id__' },
    { name: 'limit',     location: 'query', type: 'integer', desc: 'Max reviews to return',           desc_ja: '取得するレビューの最大件数', desc_zh: '返回评论的最大数量',    required: false, default: 10 },
    { name: 'offset',    location: 'query', type: 'integer', desc: 'Pagination offset',               desc_ja: 'ページネーションオフセット', desc_zh: '分页偏移量',             required: false, default: 0 }
  ],

  // ── Favorites ───────────────────────────────────────────────────────────────
  'GET /api/fav': ['__auth__'],

  // ── Cart ────────────────────────────────────────────────────────────────────
  'GET /api/cart': ['__auth__'],
  'DELETE /api/cart': ['__auth__'],

  // ── Profile / Geocoding ─────────────────────────────────────────────────────
  'GET /api/profile': [
    '__auth__',
    { name: 'user_id', location: 'query', type: 'string', desc: 'User ID', desc_ja: 'ユーザーID', desc_zh: '用户ID', required: true, default: '__superadmin_email__' },
  ],
  'GET /api/shipping': [
    '__auth__',
    { name: 'user_id',    location: 'query', type: 'string', desc: 'User ID',                   desc_ja: 'ユーザーID',              desc_zh: '用户ID',              required: true,  default: '__superadmin_email__' },
    { name: 'geo_id',     location: 'query', type: 'string', desc: 'Saved address geo ID',       desc_ja: '保存済み住所のgeo ID',    desc_zh: '已保存地址的geo ID',  required: false, default: '__first_geo_id__' },
    { name: 'product_id', location: 'query', type: 'string', desc: 'Product ID for weight/size', desc_ja: '重量・サイズ確認用商品ID', desc_zh: '用于获取重量/尺寸的商品ID', required: false, default: '__first_product_id__' },
  ],
  'GET /api/geo': [
    '__auth__',
    { name: 'user_id', location: 'query', type: 'string', desc: 'User ID', desc_ja: 'ユーザーID', desc_zh: '用户ID', required: true, default: '__superadmin_email__' },
  ],
  'PUT /api/geo': [
    '__auth__',
    { name: 'user_id',    location: 'body', type: 'string', desc: 'User ID',        desc_ja: 'ユーザーID',  desc_zh: '用户ID',    required: true, default: '__superadmin_email__' },
    { name: 'postalCode', location: 'body', type: 'string', desc: 'Postal code',    desc_ja: '郵便番号',    desc_zh: '邮政编码',  required: true, default: '100-0001' },
    { name: 'address',    location: 'body', type: 'string', desc: 'Street address', desc_ja: '住所',        desc_zh: '街道地址',  required: true, default: '1-1 Chiyoda, Tokyo' },
  ],

  // ── Payment ─────────────────────────────────────────────────────────────────
  'GET /api/payment-method': ['__auth__'],
  'PUT /api/payment-method': [
    '__auth__',
    { name: 'id',      location: 'body', type: 'string', desc: 'Payment method ID to update',  desc_ja: '更新する支払い方法ID',      desc_zh: '要更新的支付方式ID',     required: true, default: '' },
    { name: 'type',    location: 'body', type: 'string', desc: 'Card type (VISA, JCB, etc.)',  desc_ja: 'カード種別（VISA、JCB等）', desc_zh: '卡类型（VISA、JCB等）',  required: true, default: 'VISA' },
    { name: 'details', location: 'body', type: 'object', desc: 'Updated card details object',  desc_ja: '更新後のカード詳細',        desc_zh: '更新后的卡详情对象',     required: true, default: '{"card_number":"1111222233334444","holder_name":"Liam Smith"}' }
  ],
  'DELETE /api/payment-method': [
    '__auth__',
    { name: 'id', location: 'body', type: 'string', desc: 'Payment method ID to delete', desc_ja: '削除する支払い方法ID', desc_zh: '要删除的支付方式ID', required: true, default: '' }
  ],
  'GET /api/payment': ['__auth__'],

  // ── Ranking ─────────────────────────────────────────────────────────────────
  'GET /api/ranking': [
    { name: 'category', location: 'query', type: 'string', desc: 'Filter by category slug (optional)', desc_ja: 'カテゴリスラグでフィルター（任意）', desc_zh: '按分类标识过滤（可选）', required: false, default: '' }
  ],

  // ── Shipment ────────────────────────────────────────────────────────────────
  'GET /api/shipment': [
    '__auth__',
    { name: 'userId', location: 'query', type: 'string', desc: 'User ID to fetch shipments for', desc_ja: '配送記録を取得するユーザーID', desc_zh: '要查询配送记录的用户ID', required: true, default: 'dev_user_001@example.com' }
  ],

  // ── Sale ────────────────────────────────────────────────────────────────────
  'GET /api/sale': [],

  // ── Recommendation ──────────────────────────────────────────────────────────
  'GET /api/recommendation/model/status': [],
  'GET /api/recommendation/also-bought': [
    { name: 'product_id', location: 'query', type: 'string',  desc: 'Target product ID to find co-purchased items for', desc_ja: '共同購買商品を検索する対象商品ID', desc_zh: '目标商品ID，用于查找共同购买商品', required: true,  default: '__first_product_id__' },
    { name: 'limit',      location: 'query', type: 'integer', desc: 'Max number of products to return (default 5)',     desc_ja: '返す商品数の上限（デフォルト5）',  desc_zh: '返回商品数量上限（默认5）',         required: false, default: 5 }
  ],
  'POST /api/recommendation/train': [
    { name: 'force', location: 'body', type: 'boolean', desc: 'Force retrain even if model is current', desc_ja: 'モデルが最新でも強制再学習する', desc_zh: '即使模型是最新的也强制重新训练', required: false, default: true }
  ],

  'GET /api/co-purchase': [
    { name: 'product_id', location: 'query', type: 'string',  desc: 'Target product ID to find co-purchased items for', desc_ja: '共同購買レコメンドを取得する対象商品ID', desc_zh: '目标商品ID，用于查找共同购买商品', required: true,  default: '__first_product_id__' },
    { name: 'limit',      location: 'query', type: 'integer', desc: 'Max number of products to return (default 4, max 20)',  desc_ja: '返す商品数の上限（デフォルト4、最大20）',            desc_zh: '返回商品数量上限（默认4，最多20）',            required: false, default: 4 }
  ],

  // ── Browsing History ────────────────────────────────────────────────────────
  'POST /api/browsing-history/([^/]+)': [
    '__auth__',
    { name: 'productId', location: 'path', type: 'string', desc: 'Product ID to record as viewed', desc_ja: '閲覧記録する商品ID', desc_zh: '要记录为已浏览的商品ID', required: true, default: '__first_product_id__' }
  ],
  'GET /api/browsing-history/recommendations': [
    '__auth__',
    { name: 'limit', location: 'query', type: 'integer', desc: 'Max number of recommendations to return (default 8, max 50)', desc_ja: '返すレコメンド数の上限（デフォルト8、最大50）', desc_zh: '返回推荐数量上限（默认8，最多50）', required: false, default: 8 }
  ],

  // ── Stats ───────────────────────────────────────────────────────────────────
  'GET /api/stats': [
    { name: 'type', location: 'query', type: 'string', desc: 'Filter: "top" = top requested, "slow" = slowest endpoints. Omit for both.', desc_ja: 'フィルター: "top"=リクエスト数上位, "slow"=遅いエンドポイント。省略すると両方返す。', desc_zh: '过滤："top"=请求量最高，"slow"=最慢端点。省略返回两者。', required: false, default: '' }
  ],

  // ── Storage ─────────────────────────────────────────────────────────────────
  'GET /api/storage': [
    { name: 'path', location: 'path', type: 'string', desc: 'Photo filename (appended to URL)', desc_ja: '画像ファイル名（URLに付加）', desc_zh: '图片文件名（附加到URL）', required: true, default: '__first_product_id_png__' }
  ]
};

// ── Response Schemas ─────────────────────────────────────────────────────────
const API_RESPONSE_SCHEMAS = {
  'POST /api/uam/token': [
    { field: 'access_token',  type: 'string',  desc: 'JWT Bearer token for API authorization',        desc_ja: 'API認可用JWTベアラートークン',              desc_zh: 'API授权用JWT Bearer令牌' },
    { field: 'refresh_token', type: 'string',  desc: 'Token used to obtain a new access token',       desc_ja: '新しいアクセストークン取得用トークン',       desc_zh: '用于获取新访问令牌的令牌' },
    { field: 'id_token',      type: 'string',  desc: 'OpenID Connect ID token',                       desc_ja: 'OpenID Connect IDトークン',                 desc_zh: 'OpenID Connect ID令牌' },
    { field: 'token_type',    type: 'string',  desc: 'Token type, always "Bearer"',                   desc_ja: 'トークン種別（常に"Bearer"）',               desc_zh: '令牌类型，始终为"Bearer"' },
    { field: 'expires_in',    type: 'integer', desc: 'Access token lifetime in seconds',              desc_ja: 'アクセストークンの有効期限（秒）',            desc_zh: '访问令牌有效期（秒）' },
  ],
  'GET /api/uam/auth': [
    { field: '(302)', type: 'Redirect', desc: 'Redirects browser to Keycloak login page (HTML, not JSON)', desc_ja: 'ブラウザをKeycloakログインページへリダイレクト（JSONではなくHTML）', desc_zh: '将浏览器重定向到Keycloak登录页面（HTML，非JSON）' },
    { field: 'Location', type: 'header', desc: 'URL of the Keycloak login UI with session parameters',    desc_ja: 'セッションパラメータ付きKeycloakログインUI URL',                  desc_zh: '带会话参数的Keycloak登录UI URL' },
  ],
  'GET /api/uam/userinfo': [
    { field: 'sub',                type: 'string',  desc: 'Unique user identifier (UUID)',               desc_ja: 'ユーザーの一意識別子（UUID）',       desc_zh: '用户唯一标识符（UUID）' },
    { field: 'preferred_username', type: 'string',  desc: 'Username of the authenticated user',          desc_ja: '認証済みユーザーのユーザー名',        desc_zh: '已认证用户的用户名' },
    { field: 'email',              type: 'string',  desc: 'User email address',                          desc_ja: 'ユーザーのメールアドレス',            desc_zh: '用户电子邮件地址' },
    { field: 'email_verified',     type: 'boolean', desc: 'Whether the email has been verified',         desc_ja: 'メールが確認済みかどうか',            desc_zh: '邮箱是否已验证' },
  ],
  'GET /api/search': [
    { field: 'items',                 type: 'array',   desc: 'List of matching products',               desc_ja: '検索にマッチした商品リスト',          desc_zh: '匹配的商品列表' },
    { field: 'items[].product_id',    type: 'string',  desc: 'Unique product identifier',               desc_ja: '商品の一意識別子',                   desc_zh: '商品唯一标识符' },
    { field: 'items[].product_name',  type: 'string',  desc: 'Display name of the product',            desc_ja: '商品の表示名',                       desc_zh: '商品显示名称' },
    { field: 'items[].seller_name',   type: 'string',  desc: 'Name of the seller',                     desc_ja: '販売者名',                           desc_zh: '卖家名称' },
    { field: 'items[].category',      type: 'integer', desc: 'Category ID number',                     desc_ja: 'カテゴリID番号',                     desc_zh: '分类ID编号' },
    { field: 'items[].category_name', type: 'string',  desc: 'Human-readable category name',           desc_ja: 'カテゴリ表示名',                     desc_zh: '可读的分类名称' },
    { field: 'items[].price',         type: 'integer', desc: 'Price in JPY',                           desc_ja: '価格（円）',                         desc_zh: '价格（日元）' },
    { field: 'items[].ranking',       type: 'integer', desc: 'Popularity rank within category',        desc_ja: 'カテゴリ内の人気ランク',              desc_zh: '类别内热门排名' },
    { field: 'items[].stocks',        type: 'integer', desc: 'Available stock quantity',               desc_ja: '在庫数',                             desc_zh: '可用库存数量' },
    { field: 'items[].main_url',      type: 'string',  desc: 'URL of the main product image',         desc_ja: '商品メイン画像のURL',                 desc_zh: '商品主图URL' },
    { field: 'items[].avg_review',    type: 'number',  desc: 'Average review rating (0–5)',            desc_ja: 'レビュー平均評価（0〜5）',             desc_zh: '平均评分（0–5）' },
    { field: 'items[].review_count',  type: 'integer', desc: 'Total number of reviews',               desc_ja: 'レビュー総数',                        desc_zh: '评论总数' },
    { field: 'items[].condition',     type: 'string',  desc: '"new" or "used"',                       desc_ja: '新品（new）または中古（used）',        desc_zh: '"new"或"used"' },
    { field: 'total',                 type: 'integer', desc: 'Estimated total number of matching products', desc_ja: 'マッチした商品の推定総数',       desc_zh: '匹配商品的估算总数' },
    { field: 'page',                  type: 'integer', desc: 'Current page number',                   desc_ja: '現在のページ番号',                    desc_zh: '当前页码' },
  ],
  'GET /api/categories': [
    { field: '[].category_id',    type: 'string', desc: 'Unique category identifier',        desc_ja: 'カテゴリの一意識別子',  desc_zh: '分类唯一标识符' },
    { field: '[].category_name',  type: 'string', desc: 'Display name of the category',     desc_ja: 'カテゴリ表示名',        desc_zh: '分类显示名称' },
    { field: '[].category_image', type: 'string', desc: 'Image filename for the category',  desc_ja: 'カテゴリ画像ファイル名', desc_zh: '分类图片文件名' },
  ],
  'GET /api/item/detail': [
    { field: 'product_id',   type: 'string',  desc: 'Unique product identifier',        desc_ja: '商品の一意識別子',              desc_zh: '商品唯一标识符' },
    { field: 'product_name', type: 'string',  desc: 'Display name of the product',     desc_ja: '商品の表示名',                  desc_zh: '商品显示名称' },
    { field: 'price',        type: 'integer', desc: 'Price in JPY',                    desc_ja: '価格（円）',                    desc_zh: '价格（日元）' },
    { field: 'category',     type: 'string',  desc: 'Category name',                   desc_ja: 'カテゴリ名',                    desc_zh: '分类名称' },
    { field: 'category_id',  type: 'string',  desc: 'Category ID',                     desc_ja: 'カテゴリID',                    desc_zh: '分类ID' },
    { field: 'summary',      type: 'string',  desc: 'Product description',             desc_ja: '商品説明',                      desc_zh: '商品描述' },
    { field: 'regist_day',   type: 'string',  desc: 'Registration date (ISO 8601)',    desc_ja: '登録日（ISO 8601）',            desc_zh: '注册日期（ISO 8601）' },
    { field: 'last_update',  type: 'string',  desc: 'Last update date (ISO 8601)',     desc_ja: '最終更新日（ISO 8601）',        desc_zh: '最后更新日期（ISO 8601）' },
    { field: 'seller_name',  type: 'string',  desc: 'Name of the seller',              desc_ja: '販売者名',                      desc_zh: '卖家名称' },
    { field: 'stocks',       type: 'integer', desc: 'Available stock quantity',        desc_ja: '在庫数',                        desc_zh: '可用库存数量' },
    { field: 'avg_review',   type: 'number',  desc: 'Average review rating (0–5)',     desc_ja: 'レビュー平均評価（0〜5）',       desc_zh: '平均评分（0–5）' },
    { field: 'review_count', type: 'integer', desc: 'Total number of reviews',         desc_ja: 'レビュー総数',                  desc_zh: '评论总数' },
  ],
  'GET /api/item/reviews': [
    { field: '[].review_id',  type: 'string',  desc: 'Unique review identifier',                  desc_ja: 'レビューの一意識別子',          desc_zh: '评论唯一标识符' },
    { field: '[].user_id',    type: 'string',  desc: 'ID of the reviewer',                        desc_ja: 'レビュアーのユーザーID',         desc_zh: '评论者用户ID' },
    { field: '[].rating',     type: 'integer', desc: 'Rating from 1 to 5',                        desc_ja: '評価（1〜5）',                  desc_zh: '评分（1–5）' },
    { field: '[].comment',    type: 'string',  desc: 'Review text content',                       desc_ja: 'レビューコメント',              desc_zh: '评论内容' },
    { field: '[].created_at', type: 'string',  desc: 'Review creation timestamp (ISO 8601)',      desc_ja: 'レビュー作成日時（ISO 8601）',  desc_zh: '评论创建时间（ISO 8601）' },
  ],
  'GET /api/fav': [
    { field: '[].product_id',   type: 'string',  desc: 'Product ID of the favorited item', desc_ja: 'お気に入り商品のID',      desc_zh: '收藏商品的ID' },
    { field: '[].product_name', type: 'string',  desc: 'Product display name',             desc_ja: '商品の表示名',            desc_zh: '商品显示名称' },
    { field: '[].price',        type: 'integer', desc: 'Price in JPY',                    desc_ja: '価格（円）',              desc_zh: '价格（日元）' },
    { field: '[].main_url',     type: 'string',  desc: 'URL of the main product image',   desc_ja: '商品メイン画像のURL',      desc_zh: '商品主图URL' },
  ],
  'GET /api/cart': [
    { field: 'updated_at',                   type: 'string',  desc: 'Last cart update timestamp (ISO 8601)', desc_ja: 'カート最終更新日時（ISO 8601）', desc_zh: '购物车最后更新时间（ISO 8601）' },
    { field: 'items',                         type: 'array',   desc: 'Cart line items',                       desc_ja: 'カートの商品リスト',              desc_zh: '购物车商品列表' },
    { field: 'items[].id',                    type: 'string',  desc: 'Cart item identifier',                  desc_ja: 'カートアイテムID',               desc_zh: '购物车商品标识符' },
    { field: 'items[].product',               type: 'object',  desc: 'Product detail snapshot',               desc_ja: '商品詳細のスナップショット',       desc_zh: '商品详情快照' },
    { field: 'items[].product.product_id',    type: 'string',  desc: 'Product ID',                            desc_ja: '商品ID',                         desc_zh: '商品ID' },
    { field: 'items[].product.product_name',  type: 'string',  desc: 'Product name',                         desc_ja: '商品名',                          desc_zh: '商品名称' },
    { field: 'items[].product.price',         type: 'integer', desc: 'Unit price in JPY',                    desc_ja: '単価（円）',                      desc_zh: '单价（日元）' },
    { field: 'items[].quantity',              type: 'integer', desc: 'Quantity in cart',                      desc_ja: 'カート内数量',                    desc_zh: '购物车数量' },
    { field: 'items[].added_at',              type: 'string',  desc: 'Timestamp when added (ISO 8601)',       desc_ja: '追加日時（ISO 8601）',            desc_zh: '添加时间（ISO 8601）' },
    { field: 'items[].shipping_fee',          type: 'integer', desc: 'Shipping cost in JPY',                 desc_ja: '送料（円）',                      desc_zh: '运费（日元）' },
    { field: 'items[].shipping_type',         type: 'string',  desc: '"standard" or "express"',              desc_ja: '配送種別（standard / express）',   desc_zh: '"standard"或"express"' },
    { field: 'items[].shipping_days',         type: 'integer', desc: 'Estimated delivery days',              desc_ja: '配送予定日数',                    desc_zh: '预计配送天数' },
  ],
  'GET /api/profile': [
    { field: 'user_id',     type: 'string', desc: 'User identifier',  desc_ja: 'ユーザーID',    desc_zh: '用户标识符' },
    { field: 'first_name',  type: 'string', desc: 'First name',       desc_ja: '名',            desc_zh: '名字' },
    { field: 'last_name',   type: 'string', desc: 'Last name',        desc_ja: '姓',            desc_zh: '姓氏' },
    { field: 'postal_code', type: 'string', desc: 'Postal code',      desc_ja: '郵便番号',      desc_zh: '邮政编码' },
    { field: 'address',     type: 'string', desc: 'Street address',   desc_ja: '住所',          desc_zh: '街道地址' },
  ],
  'GET /api/geo': [
    { field: '[].geo_id',        type: 'string',  desc: 'Unique address record ID',        desc_ja: '住所レコードの一意ID',           desc_zh: '地址记录唯一ID' },
    { field: '[].is_primary',    type: 'boolean', desc: 'Whether this is the default address', desc_ja: 'デフォルト住所かどうか',      desc_zh: '是否为默认地址' },
    { field: '[].user_name',     type: 'string',  desc: 'Associated username',             desc_ja: '関連ユーザー名',                 desc_zh: '关联用户名' },
    { field: '[].country_code',  type: 'string',  desc: 'ISO 3166-1 country code',         desc_ja: 'ISO 3166-1 国コード',           desc_zh: 'ISO 3166-1 国家代码' },
    { field: '[].postal_code',   type: 'string',  desc: 'Postal / zip code',               desc_ja: '郵便番号',                       desc_zh: '邮政编码' },
    { field: '[].prefecture',    type: 'string',  desc: 'Prefecture / state',              desc_ja: '都道府県',                       desc_zh: '省/州' },
    { field: '[].city',          type: 'string',  desc: 'City name',                       desc_ja: '市区町村',                       desc_zh: '城市名称' },
    { field: '[].town',          type: 'string',  desc: 'Town / district',                 desc_ja: '町名・番地',                     desc_zh: '街道/地区' },
    { field: '[].building_name', type: 'string',  desc: 'Building name (optional)',         desc_ja: '建物名（任意）',                 desc_zh: '建筑名称（可选）' },
    { field: '[].room_number',   type: 'string',  desc: 'Room number (optional)',           desc_ja: '部屋番号（任意）',               desc_zh: '房间号（可选）' },
  ],
  'GET /api/shipping': [
    { field: 'standard_fee',  type: 'integer', desc: 'Standard shipping cost in JPY',          desc_ja: '通常配送料（円）',         desc_zh: '普通运费（日元）' },
    { field: 'express_fee',   type: 'integer', desc: 'Express shipping cost in JPY',           desc_ja: '速達配送料（円）',         desc_zh: '快速运费（日元）' },
    { field: 'standard_days', type: 'integer', desc: 'Estimated days for standard delivery',   desc_ja: '通常配送の予定日数',       desc_zh: '普通配送预计天数' },
    { field: 'express_days',  type: 'integer', desc: 'Estimated days for express delivery',    desc_ja: '速達配送の予定日数',       desc_zh: '快速配送预计天数' },
  ],
  'GET /api/payment-method': [
    { field: '[].id',      type: 'string', desc: 'Payment method identifier',    desc_ja: '支払い方法ID',              desc_zh: '支付方式标识符' },
    { field: '[].type',    type: 'string', desc: 'Card type (e.g. VISA, JCB)',  desc_ja: 'カード種別（例：VISA、JCB）', desc_zh: '卡类型（如VISA、JCB）' },
    { field: '[].details', type: 'object', desc: 'Card detail object (masked)',  desc_ja: 'カード詳細オブジェクト（マスク済み）', desc_zh: '卡详情对象（已脱敏）' },
  ],
  'GET /api/payment': [
    { field: '[].payment_id',     type: 'string',  desc: 'Payment record identifier',        desc_ja: '支払いレコードID',           desc_zh: '支付记录标识符' },
    { field: '[].order_id',       type: 'string',  desc: 'Associated order UUID',             desc_ja: '関連注文UUID',              desc_zh: '关联订单UUID' },
    { field: '[].amount',         type: 'number',  desc: 'Payment amount in JPY',             desc_ja: '支払い金額（円）',           desc_zh: '支付金额（日元）' },
    { field: '[].payment_method', type: 'string',  desc: 'Payment method name used',          desc_ja: '使用した支払い方法名',       desc_zh: '使用的支付方式名称' },
    { field: '[].paid_at',        type: 'string',  desc: 'Payment timestamp (ISO 8601)',      desc_ja: '支払い日時（ISO 8601）',     desc_zh: '支付时间（ISO 8601）' },
  ],
  'GET /api/ranking': [
    { field: 'ranking_month',          type: 'string',  desc: 'Month the ranking was computed (YYYY-MM)', desc_ja: 'ランキング集計月（YYYY-MM）', desc_zh: '排名计算月份（YYYY-MM）' },
    { field: 'category',               type: 'string',  desc: 'Category slug, empty = all categories',   desc_ja: 'カテゴリスラグ（空=全カテゴリ）', desc_zh: '分类标识，空=全部分类' },
    { field: 'ranking',                type: 'array',   desc: 'Ranked product list',                     desc_ja: 'ランク付き商品リスト',         desc_zh: '排名商品列表' },
    { field: 'ranking[].product_id',   type: 'string',  desc: 'Product identifier',                      desc_ja: '商品ID',                       desc_zh: '商品标识符' },
    { field: 'ranking[].score',        type: 'number',  desc: 'Ranking score',                           desc_ja: 'ランキングスコア',              desc_zh: '排名得分' },
    { field: 'ranking[].product_name', type: 'string',  desc: 'Product display name',                   desc_ja: '商品表示名',                   desc_zh: '商品显示名称' },
    { field: 'ranking[].image',        type: 'string',  desc: 'Product image URL',                      desc_ja: '商品画像URL',                  desc_zh: '商品图片URL' },
    { field: 'ranking[].summary',      type: 'string',  desc: 'Short product description',              desc_ja: '商品の簡単な説明',              desc_zh: '商品简短描述' },
    { field: 'ranking[].price',        type: 'integer', desc: 'Price in JPY',                           desc_ja: '価格（円）',                   desc_zh: '价格（日元）' },
    { field: 'ranking[].rating',       type: 'number',  desc: 'Average review rating (0–5)',            desc_ja: 'レビュー平均評価（0〜5）',       desc_zh: '平均评分（0–5）' },
  ],
  'GET /api/shipment': [
    { field: '[].transaction_id', type: 'string', desc: 'Shipment transaction identifier',           desc_ja: '配送トランザクションID',          desc_zh: '配送交易标识符' },
    { field: '[].product_id',     type: 'string', desc: 'Shipped product identifier',                desc_ja: '配送商品ID',                      desc_zh: '已配送商品标识符' },
    { field: '[].product_name',   type: 'string', desc: 'Product display name',                     desc_ja: '商品表示名',                      desc_zh: '商品显示名称' },
    { field: '[].status',         type: 'string', desc: 'Shipment status (e.g. shipped, delivered)', desc_ja: '配送ステータス（例：shipped）',    desc_zh: '配送状态（如shipped、delivered）' },
    { field: '[].purchase_date',  type: 'string', desc: 'Purchase timestamp (ISO 8601)',             desc_ja: '購入日時（ISO 8601）',            desc_zh: '购买时间（ISO 8601）' },
  ],
  'POST /api/shipment': [
    { field: 'transaction_id', type: 'string', desc: 'Created shipment transaction identifier', desc_ja: '作成された配送トランザクションID', desc_zh: '创建的配送交易标识符' },
    { field: 'status',         type: 'string', desc: 'Initial shipment status',                 desc_ja: '初期配送ステータス',               desc_zh: '初始配送状态' },
  ],
  'GET /api/sale': [
    { field: '[].id',            type: 'string', desc: 'Sale campaign identifier',              desc_ja: 'セールキャンペーンID',             desc_zh: '促销活动标识符' },
    { field: '[].name',          type: 'string', desc: 'Campaign display name',                 desc_ja: 'キャンペーン表示名',               desc_zh: '活动显示名称' },
    { field: '[].start_date',    type: 'string', desc: 'Campaign start date (ISO 8601)',        desc_ja: 'キャンペーン開始日（ISO 8601）',   desc_zh: '活动开始日期（ISO 8601）' },
    { field: '[].end_date',      type: 'string', desc: 'Campaign end date (ISO 8601)',          desc_ja: 'キャンペーン終了日（ISO 8601）',   desc_zh: '活动结束日期（ISO 8601）' },
    { field: '[].discount_rate', type: 'number', desc: 'Discount percentage (0–100)',           desc_ja: '割引率（0〜100）',                 desc_zh: '折扣率（0–100）' },
  ],
  'GET /api/recommendation': [
    { field: '[].product_id',   type: 'string', desc: 'Recommended product identifier',        desc_ja: 'レコメンド商品ID',                 desc_zh: '推荐商品标识符' },
    { field: '[].product_name', type: 'string', desc: 'Product display name',                  desc_ja: '商品表示名',                       desc_zh: '商品显示名称' },
    { field: '[].category_id',  type: 'string', desc: 'Category identifier',                   desc_ja: 'カテゴリID',                       desc_zh: '分类标识符' },
    { field: '[].price',        type: 'number', desc: 'Price in JPY',                          desc_ja: '価格（円）',                       desc_zh: '价格（日元）' },
    { field: '[].score',        type: 'number', desc: 'Recommendation confidence score',       desc_ja: 'レコメンド信頼スコア',              desc_zh: '推荐置信度得分' },
    { field: '[].image_url',    type: 'string', desc: 'Product image URL',                     desc_ja: '商品画像URL',                      desc_zh: '商品图片URL' },
  ],
  'GET /api/recommendation/also-bought': [
    { field: 'product_id',              type: 'string',  desc: 'The queried product ID',                                                         desc_ja: '検索対象の商品ID',                                             desc_zh: '查询的商品ID' },
    { field: 'also_bought',             type: 'array',   desc: 'Ordered list of co-purchased products (order history first, same-category fallback)', desc_ja: '共同購買商品リスト（注文履歴優先、同カテゴリフォールバック）', desc_zh: '共同购买商品列表（订单历史优先，同分类补充）' },
    { field: 'also_bought[].product_id',   type: 'string',  desc: 'Unique product identifier',          desc_ja: '商品の一意識別子',      desc_zh: '商品唯一标识符' },
    { field: 'also_bought[].product_name', type: 'string',  desc: 'Display name of the product',        desc_ja: '商品の表示名',          desc_zh: '商品显示名称' },
    { field: 'also_bought[].category_id',  type: 'string',  desc: 'Category identifier',                desc_ja: 'カテゴリID',            desc_zh: '分类标识符' },
    { field: 'also_bought[].price',        type: 'number',  desc: 'Price in USD',                       desc_ja: '価格（USD）',           desc_zh: '价格（美元）' },
    { field: 'also_bought[].image_url',    type: 'string',  desc: 'Product image URL (/api/storage/<id>.png)', desc_ja: '商品画像URL', desc_zh: '商品图片URL' },
    { field: 'count',                      type: 'integer', desc: 'Total number of products returned',  desc_ja: '返却された商品数',      desc_zh: '返回的商品总数' },
  ],
  'GET /api/recommendation/similar': [
    { field: '[].product_id',   type: 'string', desc: 'Similar product identifier',            desc_ja: '類似商品ID',                       desc_zh: '相似商品标识符' },
    { field: '[].product_name', type: 'string', desc: 'Product display name',                  desc_ja: '商品表示名',                       desc_zh: '商品显示名称' },
    { field: '[].score',        type: 'number', desc: 'Cosine similarity score',               desc_ja: 'コサイン類似度スコア',              desc_zh: '余弦相似度得分' },
  ],
  'GET /api/storage': [
    { field: '(binary)', type: 'image/*', desc: 'Raw image binary (PNG/JPEG). Rendered directly in Response Log.', desc_ja: '画像バイナリ（PNG/JPEG）。レスポンスログに直接表示。', desc_zh: '原始图片二进制（PNG/JPEG），直接在响应日志中渲染。' },
  ],
  'POST /api/item/review': [
    { field: 'productId',   type: 'string',  desc: 'Product ID that was reviewed',                  desc_ja: 'レビュー対象の商品ID',              desc_zh: '被评论的商品ID' },
    { field: 'reviewId',    type: 'string',  desc: 'Unique review identifier (UUID)',                desc_ja: 'レビューの一意識別子（UUID）',       desc_zh: '评论唯一标识符（UUID）' },
    { field: 'userId',      type: 'string',  desc: 'User ID of the reviewer',                       desc_ja: 'レビュアーのユーザーID',             desc_zh: '评论者用户ID' },
    { field: 'userName',    type: 'string',  desc: 'Username of the reviewer',                      desc_ja: 'レビュアーのユーザー名',             desc_zh: '评论者用户名' },
    { field: 'rating',      type: 'integer', desc: 'Rating given (1–5)',                            desc_ja: '付けた評価（1〜5）',                 desc_zh: '评分（1–5）' },
    { field: 'comment',     type: 'string',  desc: 'Review comment text',                           desc_ja: 'レビューコメント本文',               desc_zh: '评论文本内容' },
    { field: 'createdAt',   type: 'string',  desc: 'Review creation timestamp (ISO 8601)',          desc_ja: 'レビュー作成日時（ISO 8601）',       desc_zh: '评论创建时间（ISO 8601）' },
    { field: 'avgReview',   type: 'number',  desc: 'Updated average rating for the product',       desc_ja: '商品の更新後平均評価',               desc_zh: '商品更新后的平均评分' },
    { field: 'reviewCount', type: 'integer', desc: 'Updated total review count for the product',   desc_ja: '商品の更新後レビュー総数',            desc_zh: '商品更新后的评论总数' },
  ],
  'POST /api/profile': [
    { field: '(200)', type: 'No Content', desc: 'Empty 200 OK on success — profile saved and geocoded', desc_ja: '成功時は空の200 OK — プロフィール保存＆ジオコーディング完了', desc_zh: '成功时返回空200 OK — 个人资料已保存并完成地理编码' },
  ],
  'POST /api/fav/:id': [
    { field: 'status', type: 'string', desc: '"success" when item was added to wishlist',    desc_ja: 'ウィッシュリスト追加成功時に"success"', desc_zh: '添加到心愿单成功时返回"success"' },
  ],
  'DELETE /api/fav/:id': [
    { field: 'status', type: 'string', desc: '"success" when item was removed from wishlist', desc_ja: 'ウィッシュリスト削除成功時に"success"', desc_zh: '从心愿单删除成功时返回"success"' },
  ],
  'POST /api/cart/items': [
    { field: '(204)', type: 'No Content', desc: 'Empty response on success',                   desc_ja: '成功時は空レスポンス',           desc_zh: '成功时返回空响应' },
  ],
  'PUT /api/cart/items/:id': [
    { field: '(204)', type: 'No Content', desc: 'Empty response on success',                   desc_ja: '成功時は空レスポンス',           desc_zh: '成功时返回空响应' },
  ],
  'DELETE /api/cart/items/:id': [
    { field: '(204)', type: 'No Content', desc: 'Empty response on success',                   desc_ja: '成功時は空レスポンス',           desc_zh: '成功时返回空响应' },
  ],
  'DELETE /api/cart': [
    { field: '(204)', type: 'No Content', desc: 'Empty response on success — all cart items cleared', desc_ja: '成功時は空レスポンス — カート内全商品が削除される', desc_zh: '成功时返回空响应 — 购物车所有商品已清空' },
  ],
  'GET /api/co-purchase': [
    { field: 'products',                  type: 'array',   desc: 'Ordered list of co-purchased products (co-buy first, same-category fallback after)',  desc_ja: '共同購買商品リスト（共同購買優先、同カテゴリフォールバック後続）', desc_zh: '共同购买商品列表（共同购买优先，同分类补充在后）' },
    { field: 'products[].product_id',     type: 'string',  desc: 'Unique product identifier',                                                            desc_ja: '商品の一意識別子',                                                desc_zh: '商品唯一标识符' },
    { field: 'products[].product_name',   type: 'string',  desc: 'Display name of the product',                                                          desc_ja: '商品の表示名',                                                    desc_zh: '商品显示名称' },
    { field: 'products[].category_id',    type: 'string',  desc: 'Category identifier',                                                                   desc_ja: 'カテゴリID',                                                      desc_zh: '分类标识符' },
    { field: 'products[].price',          type: 'integer', desc: 'Price in USD',                                                                          desc_ja: '価格（USD）',                                                     desc_zh: '价格（美元）' },
    { field: 'products[].avg_review',     type: 'number',  desc: 'Average review rating (0–5)',                                                           desc_ja: 'レビュー平均評価（0〜5）',                                         desc_zh: '平均评分（0–5）' },
    { field: 'products[].image_url',      type: 'string',  desc: 'URL of the product image (/api/storage/<id>.png)',                                      desc_ja: '商品画像URL（/api/storage/<id>.png）',                             desc_zh: '商品图片URL（/api/storage/<id>.png）' },
    { field: 'count',                     type: 'integer', desc: 'Total number of products returned',                                                     desc_ja: '返却された商品数',                                                desc_zh: '返回的商品总数' },
  ],

  // ── Browsing History ──────────────────────────────────────────────────────
  'POST /api/browsing-history/([^/]+)': [
    { field: 'status', type: 'string', desc: '"recorded" on success', desc_ja: '成功時は"recorded"', desc_zh: '成功时返回"recorded"' },
  ],
  'GET /api/browsing-history/recommendations': [
    { field: 'recommendations',               type: 'array',   desc: 'List of recommended products based on browsing history',              desc_ja: '閲覧履歴に基づくレコメンド商品リスト',          desc_zh: '基于浏览历史的推荐商品列表' },
    { field: 'recommendations[].product_id',  type: 'string',  desc: 'Unique product identifier',                                          desc_ja: '商品の一意識別子',                               desc_zh: '商品唯一标识符' },
    { field: 'recommendations[].product_name',type: 'string',  desc: 'Display name of the product',                                        desc_ja: '商品の表示名',                                   desc_zh: '商品显示名称' },
    { field: 'recommendations[].category_id', type: 'string',  desc: 'Category identifier',                                                desc_ja: 'カテゴリID',                                     desc_zh: '分类标识符' },
    { field: 'recommendations[].price',       type: 'integer', desc: 'Price in JPY',                                                       desc_ja: '価格（円）',                                     desc_zh: '价格（日元）' },
    { field: 'recommendations[].avg_review',  type: 'number',  desc: 'Average review rating (0–5)',                                        desc_ja: 'レビュー平均評価（0〜5）',                        desc_zh: '平均评分（0–5）' },
    { field: 'recommendations[].image_url',   type: 'string',  desc: 'URL of the product image (/api/storage/<id>.png)',                   desc_ja: '商品画像URL（/api/storage/<id>.png）',            desc_zh: '商品图片URL（/api/storage/<id>.png）' },
    { field: 'count',                         type: 'integer', desc: 'Number of recommendations returned',                                 desc_ja: '返却されたレコメンド数',                          desc_zh: '返回的推荐数量' },
  ],

  'GET /api/stats': [
    { field: 'topApis',                    type: 'array',   desc: 'Most requested endpoints (present when type omitted or type=top)',    desc_ja: 'リクエスト数上位エンドポイント（type省略またはtype=topの場合）',     desc_zh: '请求量最高的端点（type省略或type=top时返回）' },
    { field: 'topApis[].method',           type: 'string',  desc: 'HTTP method (GET, POST, …)',                                          desc_ja: 'HTTPメソッド（GET, POSTなど）',                                     desc_zh: 'HTTP方法（GET、POST等）' },
    { field: 'topApis[].path',             type: 'string',  desc: 'Normalized request path (UUIDs replaced with :id)',                   desc_ja: '正規化リクエストパス（UUIDは:idに置換）',                          desc_zh: '标准化请求路径（UUID替换为:id）' },
    { field: 'topApis[].count',            type: 'integer', desc: 'Total request count in the last 5000 access log lines',              desc_ja: 'アクセスログ最新5000行でのリクエスト総数',                          desc_zh: '最近5000条访问日志中的总请求数' },
    { field: 'slowApis',                   type: 'array',   desc: 'Slowest endpoints by avg latency, min 3 samples (present when type omitted or type=slow)', desc_ja: '平均レイテンシ上位エンドポイント、最低3サンプル（type省略またはtype=slowの場合）', desc_zh: '平均延迟最高端点，至少3个样本（type省略或type=slow时返回）' },
    { field: 'slowApis[].method',          type: 'string',  desc: 'HTTP method',                                                         desc_ja: 'HTTPメソッド',                                                     desc_zh: 'HTTP方法' },
    { field: 'slowApis[].path',            type: 'string',  desc: 'Normalized request path',                                             desc_ja: '正規化リクエストパス',                                             desc_zh: '标准化请求路径' },
    { field: 'slowApis[].avgMs',           type: 'integer', desc: 'Average response time in milliseconds',                               desc_ja: '平均レスポンス時間（ミリ秒）',                                     desc_zh: '平均响应时间（毫秒）' },
    { field: 'slowApis[].sampleCount',     type: 'integer', desc: 'Number of samples used for the average',                              desc_ja: '平均算出に使用したサンプル数',                                     desc_zh: '用于计算平均值的样本数量' },
  ],
};

// Overrides the path used in the Test Request form when the Kong route path
// differs from the actual service endpoint (e.g. Kong /api/sale → /api/sale/active).
const API_TEST_PATH_OVERRIDES = {
  'GET /api/sale': '/api/sale/active',
};

function _normalizePath(path) {
  let p = path;
  if (p.startsWith('~')) p = p.slice(1).trim();
  if (p.endsWith('$')) p = p.slice(0, -1);
  // Convert Kong regex captures like ([^/]+) to :id so they match schema keys
  p = p.replace(/\([^)]+\)/g, ':id');
  return p;
}

function findApiDescription(method, path) {
  let cleanPath = _normalizePath(path);
  const key = `${method} ${cleanPath}`;
  const dict = _currentLang === 'ja' ? API_DESCRIPTIONS_JA : _currentLang === 'zh' ? API_DESCRIPTIONS_ZH : API_DESCRIPTIONS;
  if (dict[key]) return dict[key];
  for (const k of Object.keys(dict)) {
    const [m, p] = k.split(' ');
    if (m !== method) continue;
    const regexStr = '^' + p.replace(/:[^\/]+/g, '[^\\/]+') + '$';
    if (new RegExp(regexStr).test(cleanPath)) return dict[k];
  }
  return null;
}

function _expandSchema(raw) {
  if (!raw) return null;
  return raw.map(f => f === '__auth__' ? API_SCHEMAS['__auth__'] : f);
}

function findApiSchema(method, path) {
  const cleanPath = _normalizePath(path);
  const key = `${method} ${cleanPath}`;
  if (API_SCHEMAS[key]) return _expandSchema(API_SCHEMAS[key]);

  for (const k of Object.keys(API_SCHEMAS)) {
    const [m, p] = k.split(' ');
    if (m !== method) continue;
    const regexStr = '^' + p.replace(/:[^\/]+/g, '[^\\/]+') + '$';
    if (new RegExp(regexStr).test(cleanPath)) return _expandSchema(API_SCHEMAS[k]);
  }
  return null;
}

function findApiResponseSchema(method, path) {
  const cleanPath = _normalizePath(path);
  const key = `${method} ${cleanPath}`;
  if (API_RESPONSE_SCHEMAS[key]) return API_RESPONSE_SCHEMAS[key];

  for (const k of Object.keys(API_RESPONSE_SCHEMAS)) {
    const [m, p] = k.split(' ');
    if (m !== method) continue;
    const regexStr = '^' + p.replace(/:[^\/]+/g, '[^\\/]+') + '$';
    if (new RegExp(regexStr).test(cleanPath)) return API_RESPONSE_SCHEMAS[k];
  }
  return null;
}

let apiSpecs = [];
async function initApiView() {
  const list = document.getElementById('api-list-ul');
  list.innerHTML = '<div class="loading-row"><div class="spinner"></div></div>';
  try {
    const res = await fetch('/dashboard/api/kong/spec');
    apiSpecs = await res.json();
    if (apiSpecs.error) throw new Error(apiSpecs.error);

    let html = '';
    apiSpecs.forEach((svc, sIdx) => {
      svc.routes.forEach((route, rIdx) => {
        const method = route.methods[0] || 'ANY';
        const path = route.paths[0] || '';
        const methodColor = method === 'GET' ? 'var(--green)' : method === 'POST' ? 'var(--blue)' : method === 'DELETE' ? 'var(--red)' : method === 'PUT' ? '#d97706' : 'var(--text-muted)';
        const methodBg = method === 'GET' ? '#16a34a22' : method === 'POST' ? 'var(--blue-bg)' : method === 'DELETE' ? '#dc262622' : method === 'PUT' ? '#d9770622' : 'var(--bg-secondary)';
        html += `
          <div class="db-list-item" id="api-item-${sIdx}-${rIdx}" onclick="selectApiRoute(${sIdx}, ${rIdx})">
            <span class="badge" style="padding:1px 6px; font-size:10px; background:${methodBg}; color:${methodColor}; flex-shrink:0;">
              ${method}
            </span>
            <span class="db-item-name" style="font-family:monospace; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${path}
            </span>
          </div>
        `;
      });
    });
    list.innerHTML = html || '<div class="db-error">No routes defined</div>';
  } catch (e) {
    list.innerHTML = `<div class="db-error">Error: ${e.message}</div>`;
  }
}

let selectedSIdx = null, selectedRIdx = null;
let _currentApiRoute = null; // {method, path} for language-switch re-render
function selectApiRoute(sIdx, rIdx) {
  selectedSIdx = sIdx;
  selectedRIdx = rIdx;
  document.querySelectorAll('#api-list-ul .db-list-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`api-item-${sIdx}-${rIdx}`).classList.add('active');

  const svc = apiSpecs[sIdx];
  const route = svc.routes[rIdx];
  const method = route.methods[0] || 'GET';
  const path = route.paths[0];

  document.getElementById('api-placeholder').style.display = 'none';
  const card = document.getElementById('api-detail-card');
  card.style.display = 'block';

  document.getElementById('api-detail-title').textContent = `${method} ${path}`;
  document.getElementById('api-detail-method').textContent = method;
  document.getElementById('api-detail-path').textContent = path;
  document.getElementById('api-detail-target').textContent = svc.url;

  document.getElementById('api-test-response').innerHTML = '<span style="color:var(--text-muted);">Response will appear here...</span>';

  _currentApiRoute = { method, path };

  // Render description
  const desc = findApiDescription(method, path);
  const descContainer = document.getElementById('api-description-container');
  const descText = document.getElementById('api-description-text');
  if (desc) {
    descText.innerHTML = desc;
    descContainer.style.display = 'block';
  } else {
    descContainer.style.display = 'none';
  }

  // Render input specification and GUI form
  const schema = findApiSchema(method, path);
  const specContainer = document.getElementById('api-input-spec-container');
  const guiForm = document.getElementById('api-test-gui-form');

  const isGetLike = ['GET', 'HEAD', 'DELETE'].includes(method);

  if (schema && schema.length > 0) {
    specContainer.style.display = 'block';
    document.getElementById('api-input-spec-tbody').innerHTML = schema.map(f => {
      const fd = _currentLang === 'ja' ? (f.desc_ja || f.desc) : _currentLang === 'zh' ? (f.desc_zh || f.desc) : f.desc;
      return `
      <tr>
        <td><strong style="color:var(--accent); font-family:monospace;">${f.name}</strong></td>
        <td><span class="badge" style="background:var(--blue-bg); color:var(--blue); font-size:10px; padding:2px 6px;">${f.location}</span></td>
        <td><code style="font-family:monospace; font-size:11px;">${f.type}</code></td>
        <td>${f.required
          ? '<span class="badge" style="background:rgba(239,68,68,0.15); color:var(--red); font-size:10px; padding:2px 6px;">Yes</span>'
          : '<span class="badge" style="background:var(--bg-elevated); color:var(--text-muted); font-size:10px; padding:2px 6px;">No</span>'}</td>
        <td style="color:var(--text-secondary);">${fd}</td>
      </tr>`;
    }).join('');

    guiForm.innerHTML = schema.map(f => {
      const fd = _currentLang === 'ja' ? (f.desc_ja || f.desc) : _currentLang === 'zh' ? (f.desc_zh || f.desc) : f.desc;
      return `
      <div class="form-group" style="margin-bottom:12px; text-align:left;">
        <label style="font-weight:500; margin-bottom:4px; display:block; font-size:12px; color:var(--text-secondary);">
          ${f.name} ${f.required ? '<span style="color:var(--red); font-size:10px;">*</span>' : ''} <span style="font-size:10px; color:var(--text-muted);">(${f.location}, ${f.type})</span>
        </label>
        <input type="text" class="form-control api-gui-input" data-name="${f.name}" data-location="${f.location}" data-type="${f.type}" style="width:100%; font-family:monospace; background:var(--bg-surface); color:#e2e8f0; border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px; font-size:13px;" data-sentinel="${['__superadmin_token__', '__first_product_id__', '__first_product_name__', '__first_product_id_png__', '__superadmin_email__', '__first_geo_id__'].includes(f.default) ? f.default : ''}" value="${['__superadmin_token__', '__first_product_id__', '__first_product_name__', '__first_product_id_png__', '__superadmin_email__', '__first_geo_id__'].includes(f.default) ? 'Loading...' : (f.default ?? '')}" placeholder="${fd}" />
      </div>`;
    }).join('');

    // Async-fill __superadmin_token__ — only targets Authorization inputs
    if (schema.some(f => f.default === '__superadmin_token__')) {
      fetch('/dashboard/api/superadmin-token').then(r => r.json()).then(d => {
        document.querySelectorAll('.api-gui-input[data-sentinel="__superadmin_token__"]').forEach(el => {
          el.value = `Bearer ${d.token}`;
        });
      }).catch(() => {
        document.querySelectorAll('.api-gui-input[data-sentinel="__superadmin_token__"]').forEach(el => {
          if (el.value === 'Loading...') el.value = '';
        });
      });
    }

    // Async-fill __first_product_id__, __first_product_name__, __first_product_id_png__
    if (schema.some(f => ['__first_product_id__', '__first_product_name__', '__first_product_id_png__'].includes(f.default))) {
      _fetchFirstProduct().then(() => {
        document.querySelectorAll('.api-gui-input[data-sentinel="__first_product_id__"]').forEach(el => {
          el.value = _firstProductIdCache || '';
        });
        document.querySelectorAll('.api-gui-input[data-sentinel="__first_product_name__"]').forEach(el => {
          el.value = _firstProductNameCache || '';
        });
        document.querySelectorAll('.api-gui-input[data-sentinel="__first_product_id_png__"]').forEach(el => {
          el.value = _firstProductIdCache ? `${_firstProductIdCache}.png` : '';
        });
      });
    }

    // Async-fill __superadmin_email__ — fetched from /api/uam/userinfo with superadmin token
    if (schema.some(f => f.default === '__superadmin_email__' || f.default === '__first_geo_id__')) {
      _fetchSuperadminEmail().then(() => {
        document.querySelectorAll('.api-gui-input[data-sentinel="__superadmin_email__"]').forEach(el => {
          el.value = _superadminEmailCache || '';
        });
        if (schema.some(f => f.default === '__first_geo_id__')) {
          _fetchFirstGeoId().then(() => {
            document.querySelectorAll('.api-gui-input[data-sentinel="__first_geo_id__"]').forEach(el => {
              el.value = _firstGeoIdCache || '';
            });
          });
        }
      });
    }
  } else if (schema !== null && schema.length === 0) {
    // Explicit empty schema — no params, Bearer token is auto-attached
    specContainer.style.display = 'none';
    guiForm.innerHTML = `<p style="font-size:12px;color:var(--text-muted);padding:4px 0;">No parameters required. Authorization header is attached automatically.</p>`;
  } else if (isGetLike) {
    // GET with no schema — no body makes sense
    specContainer.style.display = 'none';
    guiForm.innerHTML = `<p style="font-size:12px;color:var(--text-muted);padding:4px 0;">No parameters required.</p>`;
  } else {
    specContainer.style.display = 'none';
    guiForm.innerHTML = `
      <div class="form-group" style="margin-bottom: 12px; text-align:left;">
        <label style="font-weight: 500; margin-bottom: 6px; display: block; font-size:12px; color:var(--text-secondary);">Request Body (JSON)</label>
        <textarea id="api-test-body" class="form-control" rows="4" style="width:100%; font-family:monospace; background: var(--bg-surface); color:#e2e8f0; border: 1px solid var(--border); border-radius: var(--radius-sm); padding:10px; font-size:13px;" placeholder="{}">{}</textarea>
      </div>
    `;
  }

  // Render Response Schema
  const respSchema = findApiResponseSchema(method, path);
  const respContainer = document.getElementById('api-response-schema-container');
  const respTbody = document.getElementById('api-response-schema-tbody');
  if (respSchema && respSchema.length > 0) {
    respContainer.style.display = 'block';
    respTbody.innerHTML = respSchema.map(r => {
      const d = _currentLang === 'ja' ? (r.desc_ja || r.desc) : _currentLang === 'zh' ? (r.desc_zh || r.desc) : r.desc;
      return `
      <tr>
        <td><strong style="color:var(--accent); font-family:monospace;">${r.field}</strong></td>
        <td><code style="font-family:monospace; font-size:11px;">${r.type}</code></td>
        <td style="color:var(--text-secondary);">${d}</td>
      </tr>`;
    }).join('');
  } else {
    respContainer.style.display = 'none';
  }
}

async function sendTestRequest() {
  const svc = apiSpecs[selectedSIdx];
  const route = svc.routes[selectedRIdx];
  const method = route.methods[0] || 'GET';
  let path = route.paths[0];
  // Use override path when Kong route differs from actual service endpoint
  const overrideKey = `${method} ${_normalizePath(path)}`;
  if (API_TEST_PATH_OVERRIDES[overrideKey]) path = API_TEST_PATH_OVERRIDES[overrideKey];
  const resPanel = document.getElementById('api-test-response');
  
  resPanel.innerHTML = '<span style="color:var(--yellow)">Sending test request...</span>';

  try {
    let parsedBody = null;
    let queryParams = new URLSearchParams();
    const explicitHeaders = {};  // from schema fields with location === 'header'

    const guiInputs = document.querySelectorAll('.api-gui-input');
    if (guiInputs.length > 0) {
      let bodyObj = {};
      guiInputs.forEach(input => {
        const name = input.getAttribute('data-name');
        const loc = input.getAttribute('data-location');
        const type = input.getAttribute('data-type');
        let value = input.value.trim();

        let typedVal = value;
        if (value !== '') {
          if (type === 'integer') typedVal = parseInt(value, 10);
          else if (type === 'number') typedVal = parseFloat(value);
          else if (type === 'object') {
            try { typedVal = JSON.parse(value); } catch (err) {}
          }
        }

        if (loc === 'header') {
          if (value !== '') explicitHeaders[name] = value;
          return;
        }

        if (loc === 'path') {
          if (path.includes(':id')) {
            path = path.replace(':id', value);
          } else if (path.includes('([^/]+)')) {
            path = path.replace('([^/]+)', value);
          } else if (path.endsWith('$')) {
            let cleanPath = path;
            if (cleanPath.startsWith('~')) cleanPath = cleanPath.slice(1).trim();
            if (cleanPath.endsWith('$')) cleanPath = cleanPath.slice(0, -1);
            if (cleanPath.includes('([^/]+)')) {
              path = cleanPath.replace('([^/]+)', value);
            } else {
              path = cleanPath + '/' + value;
            }
          } else {
            path = path + '/' + value;
          }
        } else if (loc === 'query') {
          if (value !== '') {
            queryParams.append(name, value);
          }
        } else if (loc === 'body') {
          if (value !== '') {
            bodyObj[name] = typedVal;
          }
        }
      });
      
      if (path.startsWith('~')) path = path.slice(1).trim();
      if (path.endsWith('$')) path = path.slice(0, -1);

      if (Object.keys(bodyObj).length > 0) {
        parsedBody = bodyObj;
      }
    } else {
      const bodyEl = document.getElementById('api-test-body');
      const body = bodyEl ? bodyEl.value.trim() : '{}';
      if (body && body !== '{}') {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          throw new Error('Invalid JSON request body');
        }
      }
    }

    let url = path;
    const qStr = queryParams.toString();
    if (qStr) {
      url += (url.includes('?') ? '&' : '?') + qStr;
    }

    // Endpoints that require form-urlencoded (OAuth2 token endpoints)
    const isFormEncoded = url === '/api/uam/token';
    // Skip auto-auth if the schema provides an explicit Authorization header, or it's the auth endpoint itself
    const skipAutoAuth = isFormEncoded || 'Authorization' in explicitHeaders;

    // Fetch superadmin token from dashboard proxy (cached server-side)
    let authToken = null;
    if (!skipAutoAuth) {
      try {
        const tr = await fetch('/dashboard/api/superadmin-token');
        if (tr.ok) { const td = await tr.json(); authToken = td.token; }
      } catch {}
    }

    const headers = { ...explicitHeaders };
    let fetchBody;
    if (parsedBody) {
      if (isFormEncoded) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        fetchBody = new URLSearchParams(parsedBody).toString();
      } else {
        headers['Content-Type'] = 'application/json';
        fetchBody = JSON.stringify(parsedBody);
      }
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const start = performance.now();
    const res = await fetch(url, {
      method: method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: fetchBody
    });
    const end = performance.now();
    const latency = (end - start).toFixed(0);

    const contentType = res.headers.get('content-type') || '';
    const statusLine = `<span style="color:${res.ok ? 'var(--green)' : 'var(--red)'}">Status: ${res.status} ${res.statusText} (${latency}ms)</span>`;

    if (contentType.startsWith('image/')) {
      // Display image directly instead of garbled binary text
      resPanel.innerHTML = `${statusLine}
<div style="margin-top:12px;">
  <img src="${url}" alt="response image" style="max-width:100%;max-height:400px;border-radius:6px;border:1px solid var(--border);" />
  <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">${url}</div>
</div>`;
    } else {
      const responseText = await res.text();
      let formatted = responseText;
      try { formatted = JSON.stringify(JSON.parse(responseText), null, 2); } catch {}
      resPanel.innerHTML = `${statusLine}\n\n${formatted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`;
    }
  } catch (e) {
    resPanel.innerHTML = `<span style="color:var(--red)">Error: ${e.message}</span>`;
  }
}

// ── Keycloak info ───────────────────────────────────────────────────────────────
let kcData = null;
async function initKeycloakView() {
  if (kcData) return;
  try {
    const [res, liveRes] = await Promise.all([
      fetch('/dashboard/api/keycloak/info'),
      fetch('/dashboard/api/keycloak/users/live').catch(() => null),
    ]);
    kcData = await res.json();
    if (kcData.error) throw new Error(kcData.error);

    // Merge live Keycloak users (includes Google SSO) into kcData.users
    if (liveRes && liveRes.ok) {
      const liveUsers = await liveRes.json();
      const staticUsernames = new Set((kcData.users || []).map(u => u.username));
      const extra = liveUsers
        .filter(u => u.username && !staticUsernames.has(u.username) && !u.username.startsWith('service-account-'))
        .map(u => ({
          username: u.username,
          email: u.email || '',
          enabled: u.enabled,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          groups: [],
          realmRoles: [],
          attributes: {},
        }));
      kcData.users = [...(kcData.users || []), ...extra];
    }

    renderKcUsers(kcData.users);
    renderKcClients(kcData.clients);
    renderKcRolesAndGroups(kcData.roles, kcData.groups);
  } catch (e) {
    showToast('Keycloak config error: ' + e.message, 'error');
  }
}

function renderKcUsers(users) {
  const tbody = document.getElementById('kc-users-tbody');
  tbody.innerHTML = users.map((u, idx) => `
    <tr>
      <td><strong style="color:var(--accent); font-family:monospace;">${u.username}</strong></td>
      <td>${u.email || '-'}</td>
      <td>${u.enabled ? '<span class="badge running"><span class="badge-dot"></span>Yes</span>' : '<span class="badge exited"><span class="badge-dot"></span>No</span>'}</td>
      <td>${u.realmRoles.join(', ') || '-'}</td>
      <td>${u.groups.join(', ') || '-'}</td>
      <td><button class="btn-act btn-act-ok" style="height:auto; padding:4px 10px; font-size:11px; white-space:nowrap; line-height:1.4;" onclick="viewKcUserDetails(${idx})">${(I18N[_currentLang]||I18N.en)['kc.viewJson']||'View JSON'}</button></td>
    </tr>
  `).join('');
}

function searchKcUsers() {
  const q = document.getElementById('kc-user-search').value.toLowerCase();
  const filtered = kcData.users.filter(u => 
    u.username.toLowerCase().includes(q) || 
    (u.email && u.email.toLowerCase().includes(q))
  );
  renderKcUsers(filtered);
}

function renderKcClients(clients) {
  const tbody = document.getElementById('kc-clients-tbody');
  tbody.innerHTML = clients.map(c => `
    <tr>
      <td><strong style="font-family:monospace; color:var(--blue);">${c.clientId}</strong></td>
      <td>${c.enabled ? 'Yes' : 'No'}</td>
      <td>${c.protocol}</td>
      <td>${c.publicClient ? 'Public' : 'Confidential'}</td>
      <td><code style="font-size:11px;">${c.redirectUris.join(', ')}</code></td>
    </tr>
  `).join('');
}

function renderKcRolesAndGroups(roles, groups) {
  const rTbody = document.getElementById('kc-roles-tbody');
  rTbody.innerHTML = roles.map(r => `
    <tr>
      <td><strong style="color:var(--yellow); font-family:monospace;">${r.name}</strong></td>
      <td>${r.description || '-'}</td>
    </tr>
  `).join('');

  const gTbody = document.getElementById('kc-groups-tbody');
  gTbody.innerHTML = groups.map(g => `
    <tr>
      <td><strong style="color:var(--purple); font-family:monospace;">${g.name}</strong></td>
    </tr>
  `).join('');
}

function viewKcUserDetails(idx) {
  const user = kcData.users[idx];
  document.getElementById('kc-user-modal-title').textContent = `User details: ${user.username}`;
  document.getElementById('kc-user-modal-json').textContent = JSON.stringify(user, null, 2);
  document.getElementById('kc-user-modal').classList.add('active');
}

function closeKcUserModal() {
  document.getElementById('kc-user-modal').classList.remove('active');
}

let currentKcTab = 'users';
function switchKcTab(tab) {
  currentKcTab = tab;
  document.querySelectorAll('.kc-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('#view-keycloak .db-tab-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById('kc-panel-' + tab).style.display = 'block';
  document.getElementById('kc-tab-' + tab).classList.add('active');
}

// ── Recommendation model diagnostics ────────────────────────────────────────────
let _modelUsers = [];      // [{id, label}]
let _modelSelectedUser = 'dev_user_001@example.com';

async function initModelView() {
  fetchModelStatus();
  fetchModelMetrics();
  await _loadModelUsers();
  fetchModelRecommendations();
}

async function _loadModelUsers() {
  try {
    const [kcRes, liveRes] = await Promise.all([
      fetch('/dashboard/api/keycloak/info'),
      fetch('/dashboard/api/keycloak/users/live').catch(() => null),
    ]);
    const kcData = kcRes.ok ? await kcRes.json() : { users: [] };
    const liveUsers = (liveRes && liveRes.ok) ? await liveRes.json() : [];

    const staticMap = new Map();
    (kcData.users || []).forEach(u => {
      if (u.username) staticMap.set(u.username, u);
    });

    // Merge live Keycloak users (includes Google SSO) with static realm export
    liveUsers.forEach(u => {
      if (u.username && !staticMap.has(u.username)) {
        staticMap.set(u.username, {
          username: u.username,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          realmRoles: (u.realmMappings || []).map(r => r.name),
        });
      }
    });

    _modelUsers = [...staticMap.values()]
      .filter(u => u.username && !u.username.startsWith('service-account-'))
      .map(u => ({
        id: u.email || u.username,
        label: (u.firstName || u.lastName)
          ? `${u.firstName || ''} ${u.lastName || ''}`.trim() + ` (${u.email || u.username})`
          : (u.email || u.username)
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    _modelUsers = [
      { id: 'dev_user_001', label: 'Liam Smith (dev_user_001)' },
      { id: 'dev_user_002', label: 'Olivia Johnson (dev_user_002)' },
      { id: 'dev_user_003', label: 'Noah Williams (dev_user_003)' },
      { id: 'dev_user_004', label: 'Emma Brown (dev_user_004)' },
    ];
  }
  const first = _modelUsers.find(u => u.id === _modelSelectedUser) || _modelUsers[0];
  if (first) {
    _modelSelectedUser = first.id;
    _updateUserInputPlaceholder(first.label);
  }
}

function _updateUserInputPlaceholder(label) {
  const inp = document.getElementById('user-search-input');
  if (!inp) return;
  inp.value = '';
  inp.placeholder = label;
}

function openUserDropdown() {
  const inp = document.getElementById('user-search-input');
  if (inp) inp.value = '';
  _renderUserDropdown('');
  document.getElementById('user-dropdown-list').style.display = 'block';
  document.addEventListener('click', _closeUserDropdownOutside, { once: true });
}

function _closeUserDropdownOutside(e) {
  const wrap = document.getElementById('user-search-dropdown');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('user-dropdown-list').style.display = 'none';
    const inp = document.getElementById('user-search-input');
    if (inp) inp.value = '';
  } else {
    document.addEventListener('click', _closeUserDropdownOutside, { once: true });
  }
}

function filterUserDropdown() {
  const q = (document.getElementById('user-search-input').value || '').toLowerCase();
  _renderUserDropdown(q);
}

function _renderUserDropdown(q) {
  const list = document.getElementById('user-dropdown-list');
  const filtered = q ? _modelUsers.filter(u => u.label.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)) : _modelUsers;
  list.innerHTML = filtered.map(u => `
    <div onclick="selectModelUser('${u.id}','${u.label.replace(/'/g,"&#39;")}')"
      style="padding:7px 12px;cursor:pointer;font-size:13px;color:var(--text-primary);${u.id===_modelSelectedUser?'background:var(--bg-secondary);':''}"
      onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='${u.id===_modelSelectedUser?'var(--bg-secondary)':'transparent'}'">
      ${u.label}
    </div>`).join('');
  if (filtered.length === 0) list.innerHTML = '<div style="padding:10px 12px;color:var(--text-muted);font-size:13px;">No users found</div>';
}

function selectModelUser(id, label) {
  _modelSelectedUser = id;
  _updateUserInputPlaceholder(label);
  document.getElementById('user-dropdown-list').style.display = 'none';
  fetchModelRecommendations();
}

const MODEL_METRIC_DEFS = [
  { key: 'precision_at_k', label: 'Precision@K',  threshold: 0.09,
    desc:    'Fraction of the top-K recommended items that are actually relevant. Higher means fewer irrelevant results. Sensitive to K and data sparsity. Target: ≥ 0.09.',
    desc_ja: 'Top-K推薦アイテムのうち、実際に関連するアイテムの割合。高いほど不要な結果が少ない。KとデータスパースさにS敏感。目標: ≥ 0.09。',
    desc_zh: 'Top-K推荐商品中实际相关商品的比例。越高表示无关结果越少。对K值和数据稀疏性敏感。目标: ≥ 0.09。' },
  { key: 'recall_at_k',    label: 'Recall@K',     threshold: 0.05,
    desc:    'Fraction of all relevant items that appear in the top-K list. Measures coverage of true positives. Low K naturally limits recall. Target: ≥ 0.05.',
    desc_ja: '全関連アイテムのうちTop-Kリストに出現する割合。真陽性のカバレッジを測定。Kが小さいと自然に低くなる。目標: ≥ 0.05。',
    desc_zh: '所有相关商品中出现在Top-K列表中的比例。衡量真阳性的覆盖率。K值小时自然受限。目标: ≥ 0.05。' },
  { key: 'ndcg_at_k',      label: 'NDCG@K',       threshold: 0.15,
    desc:    'Normalized Discounted Cumulative Gain. Rewards relevant items ranked higher. Score of 1.0 = perfect ranking. Penalizes relevant items buried lower. Target: ≥ 0.15.',
    desc_ja: '正規化割引累積利得。上位にランクされた関連アイテムを評価。1.0が完璧なランキング。下位に埋もれると減点。目標: ≥ 0.15。',
    desc_zh: '归一化折损累积增益。奖励排名靠前的相关商品。1.0为完美排名，相关商品排名靠后则扣分。目标: ≥ 0.15。' },
  { key: 'auc',            label: 'AUC',           threshold: 0.70,
    desc:    'Area Under the ROC Curve. Probability that a relevant item is ranked above a random irrelevant one. 0.5 = random; 1.0 = perfect. Target: ≥ 0.70.',
    desc_ja: 'ROC曲線下面積。関連アイテムがランダムな非関連アイテムより上位にランクされる確率。0.5=ランダム、1.0=完璧。目標: ≥ 0.70。',
    desc_zh: 'ROC曲线下面积。相关商品排名高于随机无关商品的概率。0.5=随机，1.0=完美。目标: ≥ 0.70。' },
  { key: 'mrr',            label: 'MRR',           threshold: 0.20,
    desc:    'Mean Reciprocal Rank. Average of 1/rank for the first relevant item per user. 1.0 means the correct item is always ranked first. Target: ≥ 0.20.',
    desc_ja: '平均逆数ランク。ユーザーごとの最初の関連アイテムの1/rankの平均。1.0は常に1位に正解。目標: ≥ 0.20。',
    desc_zh: '平均倒数排名。每个用户第一个相关商品的1/排名的平均值。1.0表示正确商品始终排名第一。目标: ≥ 0.20。' },
  { key: 'hit_rate_at_k',  label: 'Hit Rate@K',   threshold: 0.30,
    desc:    'Proportion of users for whom at least one relevant item appears in the top-K list. A binary per-user success metric. Target: ≥ 0.30.',
    desc_ja: 'Top-Kリストに関連アイテムが1つ以上出現したユーザーの割合。ユーザーごとの二値的成功指標。目標: ≥ 0.30。',
    desc_zh: 'Top-K列表中出现至少一个相关商品的用户比例。每个用户的二元成功指标。目标: ≥ 0.30。' },
  { key: 'coverage',       label: 'Coverage',      threshold: 0.30,
    desc:    'Fraction of the total item catalog that appears in any recommendation. Low coverage indicates popularity bias — only a few items are ever recommended. Target: ≥ 0.30.',
    desc_ja: '全商品カタログのうち推薦に登場する割合。低いと人気バイアス（一部の商品しか推薦されない）を示す。目標: ≥ 0.30。',
    desc_zh: '推荐中出现的全部商品占总商品目录的比例。低覆盖率表示存在热度偏差——只有少数商品被推荐。目标: ≥ 0.30。' },
];

async function fetchModelMetrics() {
  const grid = document.getElementById('model-metrics-grid');
  const updatedEl = document.getElementById('model-metrics-updated');
  if (!grid) return;
  try {
    const res = await fetch('/dashboard/api/recommendation/metrics');
    if (!res.ok) throw new Error('No metrics');
    const m = await res.json();
    if (updatedEl && m.trained_at) {
      updatedEl.textContent = `Updated: ${new Date(m.trained_at).toLocaleString()}`;
    }
    grid.innerHTML = MODEL_METRIC_DEFS.map(def => {
      const val = m[def.key];
      if (val === undefined || val === null) return '';
      const pct = Math.min(val / (def.threshold * 2) * 100, 100);
      const pass = val >= def.threshold;
      const color = pass ? 'var(--green)' : (val >= def.threshold * 0.7 ? '#d97706' : 'var(--red)');
      const badge = pass
        ? `<span style="font-size:10px;background:#16a34a22;color:var(--green);border:1px solid var(--green);padding:2px 7px;border-radius:10px;">PASS</span>`
        : `<span style="font-size:10px;background:#dc262622;color:var(--red);border:1px solid var(--red);padding:2px 7px;border-radius:10px;">BELOW</span>`;
      return `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;font-weight:600;color:var(--text-primary);">${def.label}</span>
            ${badge}
          </div>
          <div style="display:flex;align-items:baseline;gap:6px;">
            <span style="font-size:22px;font-weight:700;color:${color};">${val.toFixed(3)}</span>
            <span style="font-size:11px;color:var(--text-muted);">/ ${def.threshold.toFixed(2)}</span>
          </div>
          <div style="background:#1e2340;border-radius:4px;height:5px;overflow:hidden;">
            <div style="width:${pct.toFixed(1)}%;height:100%;background:${color};transition:width 0.4s;border-radius:4px;"></div>
          </div>
          <div style="background:#0d1117;border:1px solid var(--border);border-radius:4px;padding:8px 10px;">
            <p style="font-size:10px;color:var(--text-muted);line-height:1.6;margin:0;">${def['desc_'+_currentLang] || def.desc}</p>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    grid.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px;grid-column:1/-1;">No metrics yet — run the pipeline to train the model.</div>`;
  }
}

async function fetchModelStatus() {
  const statusVal = document.getElementById('model-status-val');
  const trainedVal = document.getElementById('model-trained-val');
  try {
    const res = await fetch('/dashboard/api/recommendation/status');
    const data = await res.json();
    if (data.is_training_in_progress) {
      statusVal.textContent = 'Training...';
      statusVal.style.color = 'var(--yellow)';
    } else {
      statusVal.textContent = data.is_trained ? 'Trained / Ready' : 'Untrained';
      statusVal.style.color = data.is_trained ? 'var(--green)' : 'var(--red)';
    }
    trainedVal.textContent = data.trained_at ? new Date(data.trained_at).toLocaleString() : 'Never';
  } catch (e) {
    statusVal.textContent = 'Service Offline';
    statusVal.style.color = 'var(--red)';
  }
}

async function trainModel() {
  const btn = document.getElementById('btn-model-train');
  btn.disabled = true;
  btn.textContent = 'Starting Training...';
  showToast('Initiating model training in background...', 'info');

  const tracker = startProgressBar('model', 'model-progress-container', 'model-progress-bar', 'model-progress-pct', 5);

  try {
    const res = await fetch('/dashboard/api/recommendation/train', { method: 'POST' });
    const data = await res.json();
    showToast(data.message || 'Model training started!', 'success');
    
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const sRes = await fetch('/dashboard/api/recommendation/status');
        const sData = await sRes.json();
        fetchModelStatus(); // update UI display
        if (!sData.is_training_in_progress || attempts > 20) {
          clearInterval(interval);
          tracker.finish();
          btn.disabled = false;
          btn.innerHTML = '<span>↺ Train Model Now</span>';
          fetchModelRecommendations();
          // Small delay to let backend finish writing metrics before fetching
          setTimeout(() => fetchModelMetrics(), 1500);
        }
      } catch {
        if (attempts > 20) {
          clearInterval(interval);
          tracker.finish();
          btn.disabled = false;
          btn.innerHTML = '<span>↺ Train Model Now</span>';
        }
      }
    }, 3000);
  } catch (e) {
    showToast('Failed to start training: ' + e.message, 'error');
    tracker.fail();
    btn.disabled = false;
    btn.innerHTML = '<span>↺ Train Model Now</span>';
  }
}

let _categoryMapCache = null;
async function _fetchCategoryMap() {
  if (_categoryMapCache) return _categoryMapCache;
  try {
    const r = await fetch('/api/categories');
    const d = await r.json();
    _categoryMapCache = {};
    (Array.isArray(d) ? d : []).forEach(c => {
      _categoryMapCache[c.category_id] = c.category_name;
    });
  } catch { _categoryMapCache = {}; }
  return _categoryMapCache;
}

async function fetchModelRecommendations() {
  const userId = _modelSelectedUser;
  const tbody = document.getElementById('model-recs-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;"><div class="spinner"></div>Loading recommendations...</td></tr>';

  try {
    const [res, catMap] = await Promise.all([
      fetch(`/dashboard/api/recommend?user_id=${userId}&limit=10`),
      _fetchCategoryMap(),
    ]);
    const data = await res.json();
    const recs = data.recommendations || [];
    if (recs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:var(--text-secondary)">No recommendation data available (Cold start fallback empty)</td></tr>';
      return;
    }
    tbody.innerHTML = recs.map((r, i) => {
      const catName = catMap[r.category_id] || `Category ${r.category_id}`;
      return `
      <tr>
        <td><strong>#${i + 1}</strong></td>
        <td><code style="font-size:11px;">${r.product_id}</code></td>
        <td><strong>${r.product_name}</strong></td>
        <td><span class="badge paused" style="font-size:11px;">${catName}</span></td>
        <td><strong style="color:var(--green); font-family:monospace;">${r.score.toFixed(4)}</strong></td>
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color:var(--red)">Failed to fetch diagnostics: ${e.message}</td></tr>`;
  }
}

// ── CI Pipelines – GitHub Actions style UI ─────────────────────────────────────
let ciWs = null;
let ciJobs = new Map();   // jobName → { status, startMs, endMs, steps: [{name,status,startMs,endMs,logs:[]}] }
let ciSelectedJob = null;
let ciProgressTimer = null;
let ciRawLogOpen = false;
const CI_JOB_ORDER = [
  'build_ecfront','build_ecpay',
  'build_ranking','build_sale','build_shipment','build_searchitem','build_product','build_geocoding','build_dashboard',
  'push_snapshot_container_ecfront','push_snapshot_container_ecpay',
  'push_snapshot_container_ranking','push_snapshot_container_sale','push_snapshot_container_shipment',
  'push_snapshot_container_searchitem','push_snapshot_container_product',
  'push_snapshot_container_uam','push_snapshot_container_apigw',
  'push_snapshot_container_minio','push_snapshot_container_meilisearch','push_snapshot_container_mysql',
  'push_snapshot_container_sync','push_snapshot_container_redis','push_snapshot_container_geocoding','push_snapshot_container_dashboard',
];

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '').replace(/\x1B\([A-Z]/g, '');
}

// actual act format: [WorkflowName/JobName   ] message
function parseCILine(raw) {
  const line = stripAnsi(raw);
  const m = line.match(/^\[([^\]]+?)\s*\]\s*(.*)/s);
  if (!m) return null;
  const prefix = m[1];
  const slashIdx = prefix.lastIndexOf('/');
  const jobName = (slashIdx >= 0 ? prefix.slice(slashIdx + 1) : prefix).trim();
  return { jobName, msg: m[2] };
}

function ciJobStatus(job) {
  if (!job) return 'idle';
  if (job.status === 'success') return 'success';
  if (job.status === 'failed') return 'failed';
  if (job.status === 'running') return 'running';
  return 'queued';
}

function ciStatusIcon(status) {
  if (status === 'success') return '<span style="color:var(--green);font-size:15px;">✓</span>';
  if (status === 'failed')  return '<span style="color:var(--red);font-size:15px;">✗</span>';
  if (status === 'running') return '<div class="dot-streaming" style="width:12px;height:12px;flex-shrink:0;"></div>';
  if (status === 'skipped') return '<span style="color:var(--text-muted);font-size:14px;">—</span>';
  return '<span style="color:var(--text-muted);font-size:14px;">○</span>';
}

function fmtCIDuration(startMs, endMs) {
  if (!startMs) return '';
  const ms = (endMs || Date.now()) - startMs;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms/1000).toFixed(0)}s`;
  return `${Math.floor(ms/60000)}m ${Math.floor((ms%60000)/1000)}s`;
}

function jobDisplayName(name) {
  return name.replace(/_/g, '_​'); // allow wrap after underscore
}

function renderCIJobList() {
  if (ciWs) updateCIProgress();
  const el = document.getElementById('ci-job-list');
  if (ciJobs.size === 0) {
    el.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:12px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" style="margin-bottom:8px;display:block;margin:0 auto 8px;opacity:0.4;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><p style="margin:0;">No runs yet</p></div>`;
    return;
  }
  // Sort by CI_JOB_ORDER, unknowns at end
  const names = [...ciJobs.keys()].sort((a,b) => {
    const ia = CI_JOB_ORDER.indexOf(a), ib = CI_JOB_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1; if (ib === -1) return -1;
    return ia - ib;
  });
  el.innerHTML = names.map(name => {
    const job = ciJobs.get(name);
    const st = ciJobStatus(job);
    const dur = job.startMs ? fmtCIDuration(job.startMs, job.endMs) : '';
    const sel = name === ciSelectedJob ? 'background:var(--bg-elevated); border-left:3px solid var(--blue);' : 'border-left:3px solid transparent;';
    return `<div onclick="selectCIJob('${name}')" style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;${sel}transition:background 0.1s;" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='${name===ciSelectedJob?'var(--bg-elevated)':'transparent'}'">
      <div style="width:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ciStatusIcon(st)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${name}">${name}</div>
      </div>
      <div style="font-size:10px;color:var(--text-muted);font-family:monospace;flex-shrink:0;">${dur}</div>
    </div>`;
  }).join('');
}

function selectCIJob(name) {
  ciSelectedJob = name;
  renderCIJobList();
  renderCISteps();
}

function renderCISteps() {
  const header = document.getElementById('ci-detail-header');
  const stepEl = document.getElementById('ci-step-list');
  if (!ciSelectedJob || !ciJobs.has(ciSelectedJob)) {
    header.innerHTML = '<div style="font-weight:600;font-size:13px;color:var(--text-muted);">Select a job to view details</div>';
    stepEl.innerHTML = '';
    return;
  }
  const job = ciJobs.get(ciSelectedJob);
  const st = ciJobStatus(job);
  const dur = job.startMs ? fmtCIDuration(job.startMs, job.endMs) : '';
  header.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
    ${ciStatusIcon(st)}
    <span style="font-weight:600;font-size:14px;color:var(--text-primary);">${ciSelectedJob}</span>
    ${dur ? `<span style="font-size:11px;color:var(--text-muted);font-family:monospace;">${dur}</span>` : ''}
  </div>`;

  if (job.steps.length === 0) {
    stepEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px;">Waiting for steps…</div>';
    return;
  }

  stepEl.innerHTML = job.steps.map((step, idx) => {
    const sst = step.status || 'running';
    const sdur = step.startMs ? fmtCIDuration(step.startMs, step.endMs) : '';
    const expanded = step._expanded ? '' : 'display:none;';
    const logHtml = step.logs.map(l => {
      const cls = /error|fail|fatal/i.test(l) ? 'color:var(--red)' : /warn/i.test(l) ? 'color:var(--yellow)' : 'color:var(--text-secondary)';
      return `<div style="font-size:11px;font-family:'JetBrains Mono',monospace;padding:1px 0;${cls};white-space:pre-wrap;">${escapeHtml(l)}</div>`;
    }).join('');
    return `<div style="border-bottom:1px solid var(--border);">
      <div onclick="toggleCIStep(${idx})" style="display:flex;align-items:center;gap:10px;padding:10px 18px;cursor:pointer;user-select:none;" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='transparent'">
        <div style="width:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ciStatusIcon(sst)}</div>
        <div style="flex:1;font-size:12px;color:var(--text-primary);">${escapeHtml(step.name)}</div>
        <div style="font-size:10px;color:var(--text-muted);font-family:monospace;">${sdur}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-left:4px;">${step._expanded ? '▲' : '▼'}</div>
      </div>
      <div id="ci-step-logs-${idx}" style="${expanded}background:#0a0c12;padding:10px 18px 10px 46px;max-height:300px;overflow-y:auto;">
        ${logHtml || `<div style="color:var(--text-muted);font-size:11px;font-family:monospace;">No output</div>`}
      </div>
    </div>`;
  }).join('');
}

function toggleCIStep(idx) {
  if (!ciSelectedJob) return;
  const job = ciJobs.get(ciSelectedJob);
  if (!job || !job.steps[idx]) return;
  job.steps[idx]._expanded = !job.steps[idx]._expanded;
  renderCISteps();
}

function toggleCIRawLog() {
  ciRawLogOpen = !ciRawLogOpen;
  const el = document.getElementById('ci-log-output');
  const toggle = document.getElementById('ci-raw-toggle');
  el.style.height = ciRawLogOpen ? '200px' : '0';
  el.style.borderTop = ciRawLogOpen ? '1px solid var(--border)' : 'none';
  toggle.textContent = ciRawLogOpen ? '▲ collapse' : '▼ expand';
}

function processActLine(raw) {
  const parsed = parseCILine(raw);
  if (!parsed) return;
  const { jobName, msg } = parsed;

  if (!ciJobs.has(jobName)) {
    ciJobs.set(jobName, { status: 'running', startMs: Date.now(), endMs: null, steps: [] });
    renderCIJobList();
    if (!ciSelectedJob) selectCIJob(jobName);
  }
  const job = ciJobs.get(jobName);

  // ⭐ Run stepname  →  step started
  const runM = msg.match(/⭐\s+Run\s+(.+)/);
  if (runM) {
    job.steps.push({ name: runM[1].trim(), status: 'running', startMs: Date.now(), endMs: null, logs: [], _expanded: false });
    renderCIJobList();
    if (jobName === ciSelectedJob) renderCISteps();
    return;
  }

  // ✅  Success - stepname [duration]
  const okM = msg.match(/✅\s+Success\s*-\s*(.+)/);
  if (okM && !/Job succeeded/.test(msg)) {
    const raw = okM[1];
    const durM = raw.match(/\[([\d.]+)(ms|s)\]$/);
    const sn = raw.replace(/\s*\[[\d.]+[a-z]+\]\s*$/, '').trim();
    const step = [...job.steps].reverse().find(s => s.name === sn);
    if (step) {
      step.status = 'success';
      if (durM) step.endMs = step.startMs + (durM[2] === 'ms' ? Math.round(parseFloat(durM[1])) : Math.round(parseFloat(durM[1]) * 1000));
      else step.endMs = Date.now();
    }
    renderCIJobList();
    if (jobName === ciSelectedJob) renderCISteps();
    return;
  }

  // ❌  Failure - stepname [duration]
  const ngM = msg.match(/❌\s+Failure\s*-\s*(.+)/);
  if (ngM && !/Job failed/.test(msg)) {
    const raw = ngM[1];
    const durM = raw.match(/\[([\d.]+)(ms|s)\]$/);
    const sn = raw.replace(/\s*\[[\d.]+[a-z]+\]\s*$/, '').trim();
    const step = [...job.steps].reverse().find(s => s.name === sn);
    if (step) {
      step.status = 'failed';
      if (durM) step.endMs = step.startMs + (durM[2] === 'ms' ? Math.round(parseFloat(durM[1])) : Math.round(parseFloat(durM[1]) * 1000));
      else step.endMs = Date.now();
    }
    job.status = 'failed';
    renderCIJobList();
    if (jobName === ciSelectedJob) renderCISteps();
    return;
  }

  // Job-level result (🏁 Job succeeded / ❌ Job failed)
  if (/Job succeeded/.test(msg)) {
    if (job.status !== 'failed') job.status = 'success';
    job.endMs = Date.now();
    renderCIJobList();
    if (jobName === ciSelectedJob) renderCISteps();
    return;
  }
  if (/Job failed/.test(msg)) {
    job.status = 'failed'; job.endMs = Date.now();
    renderCIJobList();
    if (jobName === ciSelectedJob) renderCISteps();
    return;
  }

  // Log line:   | output
  if (/^\s*\|/.test(msg)) {
    const lastStep = job.steps[job.steps.length - 1];
    if (lastStep) {
      lastStep.logs.push(msg.replace(/^\s*\|\s?/, ''));
      if (jobName === ciSelectedJob && lastStep._expanded) renderCISteps();
    }
  }
}

// Build jobs only (push_snapshot_* and e2e_tests are excluded/skipped)
const CI_BUILD_JOB_COUNT = CI_JOB_ORDER.filter(n => n.startsWith('build_')).length;

function updateCIProgress() {
  const container = document.getElementById('ci-progress-container');
  const bar = document.getElementById('ci-progress-bar');
  const pctEl = document.getElementById('ci-progress-pct');
  container.style.display = 'flex';
  const now = Date.now();
  const total = Math.max(CI_BUILD_JOB_COUNT, ciJobs.size);
  let score = 0;
  for (const job of ciJobs.values()) {
    if (job.status === 'success' || job.status === 'failed') {
      score += 1;
    } else if (job.status === 'running' && job.startMs) {
      // elapsed-based partial: ramp from 0 to 0.8 over 120s
      score += Math.min(0.8, (now - job.startMs) / 120000);
    }
  }
  const p = Math.min(Math.floor(score / total * 100), 99);
  bar.style.width = p + '%';
  pctEl.textContent = p + '%';
}

function saveCICache(status) {
  if (ciJobs.size === 0) return;
  try {
    const jobs = {};
    ciJobs.forEach((job, name) => {
      jobs[name] = { ...job, steps: job.steps.map(s => ({ ...s, _expanded: false })) };
    });
    sessionStorage.setItem('ci_last_run', JSON.stringify({ jobs, selectedJob: ciSelectedJob, status }));
  } catch(e) { console.error('[saveCICache]', e); }
}

function restoreCICache() {
  try {
    const raw = sessionStorage.getItem('ci_last_run');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data.jobs || Object.keys(data.jobs).length === 0) {
      sessionStorage.removeItem('ci_last_run');
      return;
    }
    ciJobs.clear();
    for (const [name, job] of Object.entries(data.jobs)) ciJobs.set(name, job);
    ciSelectedJob = data.selectedJob;
    const st = data.status;
    document.getElementById('ci-status').innerHTML = st === 'failed'
      ? '<div class="dot-failed"></div><span style="color:var(--red);">Failed <span style="opacity:.6;font-size:10px;">(last run)</span></span>'
      : '<div class="dot-success"></div><span style="color:var(--green);">Success <span style="opacity:.6;font-size:10px;">(last run)</span></span>';
    // Restore progress bar to 100%
    const container = document.getElementById('ci-progress-container');
    container.style.display = 'flex';
    document.getElementById('ci-progress-bar').style.width = '100%';
    document.getElementById('ci-progress-pct').textContent = '100%';
    renderCIJobList();
    if (ciSelectedJob) renderCISteps();
  } catch(e) { console.error('[restoreCICache]', e); }
}

function runCIPipeline() {
  if (ciWs) { ciWs.close(); ciWs = null; }
  if (ciProgressTimer) { clearInterval(ciProgressTimer); ciProgressTimer = null; }

  ciJobs.clear();
  ciSelectedJob = null;
  document.getElementById('ci-log-output').innerHTML = '';
  document.getElementById('ci-step-list').innerHTML = '';
  document.getElementById('ci-detail-header').innerHTML = '<div style="font-weight:600;font-size:13px;color:var(--text-muted);">Select a job to view details</div>';
  document.getElementById('ci-progress-container').style.display = 'flex';
  document.getElementById('ci-progress-bar').style.width = '0%';
  document.getElementById('ci-progress-pct').textContent = '0%';
  renderCIJobList();

  document.getElementById('ci-status').innerHTML = '<div class="dot-streaming"></div><span style="color:var(--blue);">Running</span>';

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ciWs = new WebSocket(`${proto}://${location.host}/dashboard/ws/ci`);
  ciProgressTimer = setInterval(() => { if (ciWs) updateCIProgress(); }, 1000);

  let _lineBuf = '';
  ciWs.onmessage = e => {
    const output = document.getElementById('ci-log-output');
    const div = document.createElement('div');
    div.className = 'log-line';
    div.style.cssText = 'font-size:11px;font-family:monospace;white-space:pre-wrap;';
    div.textContent = stripAnsi(e.data);
    output.appendChild(div);
    if (ciRawLogOpen) output.scrollTop = output.scrollHeight;

    _lineBuf += e.data;
    const lines = _lineBuf.split('\n');
    _lineBuf = lines.pop();
    for (const line of lines) {
      if (line.trim()) processActLine(line);
    }
  };

  ciWs.onclose = () => {
    ciWs = null;
    if (ciProgressTimer) { clearInterval(ciProgressTimer); ciProgressTimer = null; }
    ciJobs.forEach(job => {
      if (job.status === 'running') { job.status = 'success'; job.endMs = Date.now(); }
      job.steps.forEach(s => { if (s.status === 'running') { s.status = 'success'; s.endMs = Date.now(); } });
    });
    const anyFail = [...ciJobs.values()].some(j => j.status === 'failed');
    const finalStatus = anyFail ? 'failed' : 'success';
    document.getElementById('ci-status').innerHTML = anyFail
      ? '<div class="dot-failed"></div><span style="color:var(--red);">Failed</span>'
      : '<div class="dot-success"></div><span style="color:var(--green);">Success</span>';
    document.getElementById('ci-progress-bar').style.width = '100%';
    document.getElementById('ci-progress-pct').textContent = '100%';
    renderCIJobList();
    if (ciSelectedJob) renderCISteps();
    saveCICache(finalStatus);
  };

  ciWs.onerror = () => {
    ciWs = null;
    document.getElementById('ci-status').innerHTML = '<div class="dot-failed"></div><span style="color:var(--red);">Error</span>';
    renderCIJobList();
    if (ciSelectedJob) renderCISteps();
  };
}

function clearCIView() {
  if (ciWs) { ciWs.close(); ciWs = null; }
  ciJobs.clear(); ciSelectedJob = null; ciRawLogOpen = false;
  document.getElementById('ci-log-output').innerHTML = '';
  document.getElementById('ci-log-output').style.height = '0';
  document.getElementById('ci-raw-toggle').textContent = '▼ expand';
  document.getElementById('ci-status').innerHTML = '<div class="dot-idle"></div><span style="color:var(--text-muted);">Idle</span>';
  document.getElementById('ci-progress-container').style.display = 'none';
  renderCIJobList();
  document.getElementById('ci-step-list').innerHTML = '';
  document.getElementById('ci-detail-header').innerHTML = '<div style="font-weight:600;font-size:13px;color:var(--text-muted);">Select a job to view details</div>';
}

function clearCILogs() { clearCIView(); }

// ── Playwright Test Runner ──────────────────────────────────────────────────────
// ── E2E Test Runner ─────────────────────────────────────────────────────────
let testsWs = null;
let testScenarios = new Map(); // specFile → { displayName, status, startMs, endMs, tests:[{name,status,durationMs,logs:[]}] }
let testSelectedSpec = null;
let testRawLogOpen = false;
let testProgressTimer = null;

// Map spec filename → display name
function specDisplayName(file) {
  const m = file.match(/scenario(\d+)/i);
  if (m) return 'Scenario ' + m[1];
  return file.replace(/\.spec\.ts$/, '');
}

function initTestsView() {}

function renderTestScenarioList() {
  const el = document.getElementById('test-scenario-list');
  if (testScenarios.size === 0) {
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:var(--text-muted);">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <span style="font-size:12px;">No runs yet</span></div>`;
    return;
  }
  const icons = { success:'<span style="color:var(--green)">✓</span>', failed:'<span style="color:var(--red)">✗</span>', running:'<div class="dot-streaming" style="display:inline-block;width:8px;height:8px;margin-right:2px;"></div>', pending:'<span style="color:var(--text-muted)">○</span>' };
  el.innerHTML = [...testScenarios.entries()].map(([file, sc]) => {
    const active = file === testSelectedSpec ? 'background:var(--bg-elevated); border-color:var(--blue);' : '';
    const dur = sc.endMs ? fmtDuration(sc.endMs - sc.startMs) : (sc.startMs ? fmtDuration(Date.now() - sc.startMs) : '');
    const passed = sc.tests.filter(t => t.status === 'success').length;
    const total = sc.tests.length;
    return `<div onclick="selectTestSpec('${file}')" style="padding:10px 12px; border-radius:6px; border:1px solid var(--border); margin-bottom:6px; cursor:pointer; ${active}">
      <div style="display:flex; align-items:center; gap:8px;">
        ${icons[sc.status] || icons.pending}
        <span style="font-size:12px; font-weight:600; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${sc.displayName}</span>
        <span style="font-size:10px; color:var(--text-muted); font-family:monospace;">${dur}</span>
      </div>
      ${total > 0 ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px;padding-left:16px;">${passed}/${total} passed</div>` : ''}
    </div>`;
  }).join('');
}

function renderTestStepList() {
  const header = document.getElementById('test-detail-header');
  const list = document.getElementById('test-step-list');
  if (!testSelectedSpec || !testScenarios.has(testSelectedSpec)) {
    header.innerHTML = '<span style="color:var(--text-muted);">Select a spec to view details</span>';
    list.innerHTML = '';
    return;
  }
  const sc = testScenarios.get(testSelectedSpec);
  const dur = sc.endMs ? fmtDuration(sc.endMs - sc.startMs) : (sc.startMs ? fmtDuration(Date.now() - sc.startMs) : '');
  const statusColor = sc.status === 'success' ? 'var(--green)' : sc.status === 'failed' ? 'var(--red)' : 'var(--blue)';
  header.innerHTML = `<span style="font-weight:600;">${sc.displayName}</span>
    <span style="margin-left:8px;font-size:11px;color:var(--text-muted);font-family:monospace;">${sc.tests.length} tests${dur ? ' · ' + dur : ''}</span>`;

  if (sc.tests.length === 0) {
    list.innerHTML = `<div style="padding:20px;color:var(--text-muted);font-size:12px;">Waiting for tests...</div>`;
    return;
  }

  list.innerHTML = sc.tests.map((t, i) => {
    const icon = t.status === 'success' ? '✓' : t.status === 'failed' ? '✗' : '●';
    const col = t.status === 'success' ? 'var(--green)' : t.status === 'failed' ? 'var(--red)' : 'var(--blue)';
    const tdur = t.durationMs != null ? (t.durationMs >= 1000 ? (t.durationMs/1000).toFixed(1)+'s' : t.durationMs+'ms') : '';
    const logsHtml = t.logs.length ? t.logs.map(l => {
      const lc = /error|fail/i.test(l) ? 'var(--red)' : 'var(--text-secondary)';
      return `<div style="font-size:10px;font-family:monospace;color:${lc};white-space:pre-wrap;padding:1px 0;">${l}</div>`;
    }).join('') : '';
    const expanded = t._expanded;
    return `<div style="border:1px solid var(--border); border-radius:6px; margin-bottom:6px; overflow:hidden;">
      <div onclick="toggleTestStep(${i})" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;background:var(--bg-elevated);">
        <span style="color:${col};font-size:13px;width:14px;text-align:center;">${icon}</span>
        <span style="font-size:12px;flex:1;">${t.name}</span>
        <span style="font-size:10px;color:var(--text-muted);font-family:monospace;">${tdur}</span>
        <span style="font-size:10px;color:var(--text-muted);">${expanded ? '▲' : '▼'}</span>
      </div>
      ${expanded ? `<div style="padding:8px 12px;background:var(--bg-surface);border-top:1px solid var(--border);">${logsHtml || '<span style="font-size:11px;color:var(--text-muted);">No output captured</span>'}</div>` : ''}
    </div>`;
  }).join('');
}

function toggleTestStep(idx) {
  if (!testSelectedSpec || !testScenarios.has(testSelectedSpec)) return;
  const sc = testScenarios.get(testSelectedSpec);
  if (!sc.tests[idx]) return;
  sc.tests[idx]._expanded = !sc.tests[idx]._expanded;
  renderTestStepList();
}

function selectTestSpec(file) {
  testSelectedSpec = file;
  renderTestScenarioList();
  renderTestStepList();
}

function updateTestProgress() {
  const container = document.getElementById('test-progress-container');
  const bar = document.getElementById('test-progress-bar');
  const pct = document.getElementById('test-progress-pct');
  container.style.display = 'flex';
  const total = testScenarios.size || 1;
  const now = Date.now();
  let score = 0;
  for (const sc of testScenarios.values()) {
    if (sc.status === 'success' || sc.status === 'failed') score += 1;
    else if (sc.status === 'running' && sc.startMs) score += Math.min(0.8, (now - sc.startMs) / 60000);
  }
  const p = Math.min(Math.floor(score / total * 100), 99);
  bar.style.width = p + '%';
  pct.textContent = p + '%';
}

// Parse a Playwright list-reporter line.
// Handles formats (with or without line:col, with or without test number):
//   ✓  1 [chromium] › tests/scenario1.spec.ts:5:5 › Describe › Test (1.2s)
//   ✗  2 [chromium] › scenario2.spec.ts › Test name (5s)
let _lastFailedTest = null; // { spec, title } for capturing error lines after ✗

function parsePlaywrightLine(raw) {
  const clean = stripAnsi(raw);
  // Completed test line: starts with ✓ or ✗
  const doneM = clean.match(/^\s*([✓✔✗✘×])\s+(?:\d+\s+)?\[.+?\]\s+›\s+(.+?\.spec\.ts)[:\d]*\s+›\s+(.+?)\s+\(([\d.]+)(ms|s)\)\s*$/);
  if (doneM) {
    const passed = doneM[1] === '✓' || doneM[1] === '✔';
    const spec = doneM[2].replace(/^.*\//, ''); // strip leading path, keep filename
    const title = doneM[3].trim();
    const durationMs = doneM[5] === 'ms' ? Math.round(parseFloat(doneM[4])) : Math.round(parseFloat(doneM[4]) * 1000);
    return { type: 'done', spec, title, passed, durationMs };
  }
  // Running (started) line: [chromium] › spec:line › title  (no checkmark, no duration)
  const runM = clean.match(/^\s*\[.+?\]\s+›\s+(.+?\.spec\.ts)[:\d]*\s+›\s+(.+)$/);
  if (runM) {
    const spec = runM[1].replace(/^.*\//, '');
    return { type: 'running', spec, title: runM[2].trim() };
  }
  // Error/log line following a failed test (indented, no › pattern)
  if (_lastFailedTest && /^\s{4,}/.test(clean) && clean.trim().length > 0) {
    return { type: 'log', spec: _lastFailedTest.spec, title: _lastFailedTest.title, line: clean.trim() };
  }
  // Non-indented line resets the error capture context
  if (clean.trim().length > 0 && !/^\s/.test(clean)) _lastFailedTest = null;
  return null;
}

function processPlaywrightLine(raw) {
  const parsed = parsePlaywrightLine(raw);
  if (!parsed) return;
  const { spec, title } = parsed;

  if (parsed.type === 'log') {
    const sc = testScenarios.get(spec);
    if (sc) {
      const t = sc.tests.find(t => t.name === title);
      if (t) {
        t.logs.push(parsed.line);
        if (testSelectedSpec === spec) renderTestStepList();
      }
    }
    return;
  }

  if (!testScenarios.has(spec)) {
    testScenarios.set(spec, { displayName: specDisplayName(spec), status: 'running', startMs: Date.now(), endMs: null, tests: [] });
    renderTestScenarioList();
    if (!testSelectedSpec) selectTestSpec(spec);
  }
  const sc = testScenarios.get(spec);

  if (parsed.type === 'running') {
    _lastFailedTest = null;
    if (!sc.tests.find(t => t.name === title)) {
      sc.tests.push({ name: title, status: 'running', durationMs: null, logs: [], _expanded: false });
      renderTestScenarioList();
      if (testSelectedSpec === spec) renderTestStepList();
    }
  } else if (parsed.type === 'done') {
    let t = sc.tests.find(t => t.name === title);
    if (!t) { t = { name: title, status: 'pending', durationMs: null, logs: [], _expanded: false }; sc.tests.push(t); }
    t.status = parsed.passed ? 'success' : 'failed';
    t.durationMs = parsed.durationMs;
    if (!parsed.passed) { t._expanded = true; _lastFailedTest = { spec, title }; }
    else _lastFailedTest = null;
    sc.endMs = Date.now();
    sc.status = sc.tests.some(x => x.status === 'failed') ? 'failed' : 'running';
    renderTestScenarioList();
    if (testSelectedSpec === spec) renderTestStepList();
  }
  updateTestProgress();
}

function runAllTests() { startTestRunner(''); }
function runSingleTest(spec) { startTestRunner(spec); }

function startTestRunner(spec) {
  if (testsWs) { testsWs.close(); testsWs = null; }
  if (testProgressTimer) { clearInterval(testProgressTimer); testProgressTimer = null; }

  testScenarios.clear();
  testSelectedSpec = null;
  document.getElementById('test-log-output').innerHTML = '';
  document.getElementById('test-step-list').innerHTML = '';
  document.getElementById('test-detail-header').innerHTML = '<span style="color:var(--text-muted);">Select a spec to view details</span>';
  document.getElementById('test-progress-container').style.display = 'none';
  document.getElementById('test-progress-bar').style.width = '0%';
  document.getElementById('test-progress-pct').textContent = '0%';
  document.getElementById('test-status').innerHTML = '<div class="dot-streaming"></div><span style="color:var(--blue);">Running</span>';
  renderTestScenarioList();

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  testsWs = new WebSocket(`${proto}://${location.host}/dashboard/ws/tests?spec=${encodeURIComponent(spec)}`);
  testProgressTimer = setInterval(() => { if (testsWs) updateTestProgress(); }, 1000);

  let _lineBuf = '';
  testsWs.onmessage = e => {
    const output = document.getElementById('test-log-output');
    const div = document.createElement('div');
    div.className = 'log-line';
    div.style.cssText = 'font-size:11px;font-family:monospace;white-space:pre-wrap;';
    div.textContent = stripAnsi(e.data);
    output.appendChild(div);
    if (testRawLogOpen) output.scrollTop = output.scrollHeight;

    _lineBuf += e.data;
    const lines = _lineBuf.split('\n');
    _lineBuf = lines.pop();
    for (const line of lines) { if (line.trim()) processPlaywrightLine(line); }
  };

  testsWs.onclose = () => {
    testsWs = null;
    if (testProgressTimer) { clearInterval(testProgressTimer); testProgressTimer = null; }
    // Finalize any still-running scenarios
    testScenarios.forEach(sc => {
      if (sc.status === 'running') { sc.status = sc.tests.some(t => t.status === 'failed') ? 'failed' : 'success'; sc.endMs = Date.now(); }
      sc.tests.forEach(t => { if (t.status === 'running') t.status = 'success'; });
    });
    const anyFail = [...testScenarios.values()].some(s => s.status === 'failed');
    document.getElementById('test-status').innerHTML = anyFail
      ? '<div class="dot-failed"></div><span style="color:var(--red);">Failed</span>'
      : '<div class="dot-success"></div><span style="color:var(--green);">Success</span>';
    document.getElementById('test-progress-bar').style.width = '100%';
    document.getElementById('test-progress-pct').textContent = '100%';
    renderTestScenarioList();
    if (testSelectedSpec) renderTestStepList();
  };

  testsWs.onerror = () => {
    testsWs = null;
    document.getElementById('test-status').innerHTML = '<div class="dot-failed"></div><span style="color:var(--red);">Error</span>';
  };
}

function clearTestView() {
  if (testsWs) { testsWs.close(); testsWs = null; }
  if (testProgressTimer) { clearInterval(testProgressTimer); testProgressTimer = null; }
  testScenarios.clear(); testSelectedSpec = null; testRawLogOpen = false;
  document.getElementById('test-log-output').innerHTML = '';
  document.getElementById('test-log-output').style.height = '0';
  document.getElementById('test-raw-toggle').textContent = '▼ expand';
  document.getElementById('test-status').innerHTML = '<div class="dot-idle"></div><span style="color:var(--text-muted);">Idle</span>';
  document.getElementById('test-progress-container').style.display = 'none';
  document.getElementById('test-step-list').innerHTML = '';
  document.getElementById('test-detail-header').innerHTML = '<span style="color:var(--text-muted);">Select a spec to view details</span>';
  renderTestScenarioList();
}

function toggleTestRawLog() {
  testRawLogOpen = !testRawLogOpen;
  const el = document.getElementById('test-log-output');
  el.style.height = testRawLogOpen ? '200px' : '0';
  document.getElementById('test-raw-toggle').textContent = testRawLogOpen ? '▲ collapse' : '▼ expand';
}

function clearTestLogs() { clearTestView(); }

// ── Security Scanning (Snyk-style report) ──────────────────────────────────
function initVulnView() {
  _vulnSelectedType = 'all';
  _setVulnSelectedBtn('all');
}

let vulnWs = null;
let vulnCurrentTab = 'report';
// vulnImages: Map<imageName, { os, severity:{C,H,M,L}, findings:[...], expanded, scanType }>
let vulnImages = new Map();
let _vulnCurrentImage = null;   // image name being parsed
let _vulnParseState = 'idle';   // idle | header | table
let _vulnPendingSecretFinding = null; // secret finding awaiting location line
let _vulnScanPhase = null;      // current scan type being run ('trivy'|'sca'|'sast'|'dast')
let _vulnAllRunning = false;    // true while Scan All is running sequentially
let _vulnAllWasRun = false;     // true after at least one Scan All has completed or is running
let _vulnScanResults = {};      // { trivy:'running'|'pass'|'fail', sca:..., sast:..., dast:... }
let _vulnSelectedType = 'all';  // currently selected view type
let _vulnLogsByType = {};       // { trivy: [lines...], sca: [lines...], ... }

const SEV_COLOR = { CRITICAL:'#dc2626', HIGH:'#ea580c', MEDIUM:'#d97706', LOW:'#64748b', UNKNOWN:'#475569' };
const SEV_SHORT = { CRITICAL:'C', HIGH:'H', MEDIUM:'M', LOW:'L', UNKNOWN:'U' };

function switchVulnTab(tab) {
  vulnCurrentTab = tab;
  const report = document.getElementById('vuln-report-view');
  const log    = document.getElementById('vuln-log-view');
  const tabR   = document.getElementById('vuln-tab-report');
  const tabL   = document.getElementById('vuln-tab-log');
  const copyBtn = document.getElementById('vuln-copy-btn');
  if (tab === 'report') {
    report.style.display = 'block'; log.style.display = 'none';
    tabR.style.color = 'var(--blue)'; tabR.style.borderBottomColor = 'var(--blue)';
    tabL.style.color = 'var(--text-muted)'; tabL.style.borderBottomColor = 'transparent';
    if (copyBtn) copyBtn.style.display = 'none';
  } else {
    report.style.display = 'none'; log.style.display = 'block';
    tabL.style.color = 'var(--blue)'; tabL.style.borderBottomColor = 'var(--blue)';
    tabR.style.color = 'var(--text-muted)'; tabR.style.borderBottomColor = 'transparent';
    if (copyBtn) { copyBtn.style.display = 'flex'; }
    _renderVulnLog(_vulnSelectedType);
  }
}

function sevChip(sev, n) {
  if (!n && n !== 0) return '';
  return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;background:${SEV_COLOR[sev]}22;color:${SEV_COLOR[sev]};border:1px solid ${SEV_COLOR[sev]}55;">${n} <span style="opacity:.7;font-size:10px;">${SEV_SHORT[sev]}</span></span>`;
}

function renderVulnReport() {
  const summary = document.getElementById('vuln-summary');
  const findings = document.getElementById('vuln-findings');

  // Filter by selected type for display
  // 'all' tab: only show entries/results from a Scan All run
  // Individual tabs: show the latest entries/results for that type, regardless of how it was triggered
  const displayImages = (_vulnSelectedType === 'all')
    ? (_vulnAllWasRun ? new Map([...vulnImages.entries()].filter(([, v]) => v.runContext === 'all')) : new Map())
    : new Map([...vulnImages.entries()].filter(([, v]) => v.scanType === _vulnSelectedType));
  const displayResults = (_vulnSelectedType === 'all')
    ? (_vulnAllWasRun ? _vulnScanResults : {})
    : (_vulnScanResults[_vulnSelectedType] ? { [_vulnSelectedType]: _vulnScanResults[_vulnSelectedType] } : {});

  const hasResults = Object.keys(displayResults).length > 0;
  if (displayImages.size === 0 && !hasResults) {
    const statusEl = document.getElementById('vuln-status');
    const scanDone = statusEl && !statusEl.querySelector('.dot-streaming');
    summary.style.display = 'none';
    findings.innerHTML = `<div class="log-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>${scanDone ? 'No issues detected' : 'Scan in progress...'}</p></div>`;
    return;
  }

  // Aggregate totals
  const totals = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 };
  for (const img of displayImages.values()) {
    totals.CRITICAL += img.severity.CRITICAL || 0;
    totals.HIGH     += img.severity.HIGH     || 0;
    totals.MEDIUM   += img.severity.MEDIUM   || 0;
    totals.LOW      += img.severity.LOW      || 0;
  }
  summary.style.display = 'flex';
  summary.innerHTML = `
    <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:12px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <span style="font-weight:700;font-size:13px;color:var(--text-primary);">${displayImages.size} target${displayImages.size !== 1 ? 's' : ''} scanned</span>
      <div style="display:flex;gap:8px;">
        ${sevChip('CRITICAL', totals.CRITICAL)}
        ${sevChip('HIGH', totals.HIGH)}
        ${sevChip('MEDIUM', totals.MEDIUM)}
        ${sevChip('LOW', totals.LOW)}
      </div>
    </div>`;

  const renderImgCard = (name, img) => {
    const total = (img.severity.CRITICAL||0)+(img.severity.HIGH||0)+(img.severity.MEDIUM||0)+(img.severity.LOW||0);
    const hasSecrets = img.findings.some(f => f.type === 'secret');
    const isSecret = img.os === 'secrets' || img.os === 'text' || hasSecrets;
    const tableRows = img.findings.map(f => {
      if (f.type === 'secret') {
        return `<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:7px 10px;font-family:monospace;font-size:11px;color:var(--text-secondary);">${f.lib}</td>
          <td style="padding:7px 10px;font-size:11px;color:var(--text-primary);font-weight:600;">${f.cve}</td>
          <td style="padding:7px 10px;"><span style="font-size:11px;font-weight:700;color:${SEV_COLOR[f.sev]||'#8892b0'};">${f.sev}</span></td>
          <td style="padding:7px 10px;font-family:monospace;font-size:11px;color:var(--blue);">${f.ver||'-'}</td>
          <td style="padding:7px 10px;font-size:11px;color:var(--text-muted);">${f.title||'-'}</td>
        </tr>`;
      }
      return `<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:7px 10px;font-family:monospace;font-size:11px;color:var(--text-secondary);">${f.lib}</td>
        <td style="padding:7px 10px;"><a href="https://avd.aquasec.com/nvd/${f.cve.toLowerCase()}" target="_blank" style="font-family:monospace;font-size:11px;color:var(--blue);text-decoration:none;">${f.cve}</a></td>
        <td style="padding:7px 10px;"><span style="font-size:11px;font-weight:700;color:${SEV_COLOR[f.sev]||'#8892b0'};">${f.sev}</span></td>
        <td style="padding:7px 10px;font-family:monospace;font-size:11px;color:var(--text-muted);">${f.ver||'-'}</td>
        <td style="padding:7px 10px;font-size:11px;color:var(--text-secondary);">${f.title}</td>
      </tr>`;
    }).join('');
    const cardIcon = isSecret
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16" style="flex-shrink:0;color:var(--red);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16" style="flex-shrink:0;color:var(--blue);"><rect x="2" y="2" width="20" height="20" rx="3"/><path d="M7 10h10M7 14h7"/></svg>`;
    return `<div style="border:1px solid var(--border);border-radius:8px;margin-bottom:12px;overflow:hidden;">
      <div onclick="toggleVulnImage('${name.replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;background:var(--bg-elevated);">
        ${cardIcon}
        <span style="font-family:monospace;font-size:12px;font-weight:600;flex:1;">${name}</span>
        ${img.os ? `<span style="font-size:11px;color:var(--text-muted);">${img.os}</span>` : ''}
        <div style="display:flex;gap:6px;">
          ${sevChip('CRITICAL', img.severity.CRITICAL||0)}
          ${sevChip('HIGH', img.severity.HIGH||0)}
          ${sevChip('MEDIUM', img.severity.MEDIUM||0)}
          ${sevChip('LOW', img.severity.LOW||0)}
        </div>
        <span style="font-size:11px;color:var(--text-muted);margin-left:4px;">${img.expanded ? '▲' : '▼'}</span>
      </div>
      ${img.expanded && img.findings.length > 0 ? `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:var(--bg-surface);border-bottom:1px solid var(--border);">
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:600;">${isSecret ? 'RULE ID' : 'LIBRARY'}</th>
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:600;">${isSecret ? 'FINDING' : 'CVE'}</th>
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:600;">SEVERITY</th>
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:600;">${isSecret ? 'LOCATION' : 'VERSION'}</th>
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:600;">${isSecret ? 'DESCRIPTION' : 'TITLE'}</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>` : img.expanded && total === 0 ? `<div style="padding:12px 16px;font-size:12px;color:var(--green);">✓ No issues found</div>` : ''}
    </div>`;
  };

  const SCAN_ORDER = ['trivy', 'sca', 'sast', 'dast'];
  const SCAN_LABELS = { trivy: 'Container Scan', sca: 'SCA', sast: 'SAST', dast: 'DAST' };
  const usedPhases = new Set([...displayImages.values()].map(v => v.scanType).filter(Boolean));
  const isAllMode = usedPhases.size > 1 || Object.keys(displayResults).length > 1;

  if (isAllMode || Object.keys(displayResults).length > 0) {
    const scanStatusBar = SCAN_ORDER.map(phase => {
      const st = displayResults[phase];
      if (!st) return '';
      const entries = [...displayImages.entries()].filter(([, v]) => v.scanType === phase);
      const hasIssues = entries.some(([, v]) => (v.severity.CRITICAL||0)+(v.severity.HIGH||0) > 0);
      const isFail = hasIssues || (st === 'fail' && entries.length === 0);
      const color = st === 'running' ? 'var(--blue)' : isFail ? 'var(--red)' : 'var(--green)';
      const icon = st === 'running'
        ? `<div class="dot-streaming" style="width:8px;height:8px;"></div>`
        : isFail
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>`;
      const label = st === 'running' ? 'Running' : isFail ? 'FAIL' : 'PASS';
      return `<div style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;background:${color}18;border:1px solid ${color}44;">
        <span style="color:${color};display:flex;align-items:center;">${icon}</span>
        <span style="font-size:11px;font-weight:700;color:var(--text-primary);">${SCAN_LABELS[phase]}</span>
        <span style="font-size:10px;font-weight:600;color:${color};">${label}</span>
      </div>`;
    }).filter(Boolean).join('');

    if (scanStatusBar) {
      summary.style.display = 'block';
      summary.innerHTML = `
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:12px 16px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:${displayImages.size>0?'10px':'0'};">
            ${scanStatusBar}
          </div>
          ${displayImages.size > 0 ? `<div style="display:flex;align-items:center;gap:16px;padding-top:8px;border-top:1px solid var(--border)40;">
            <span style="font-size:11px;color:var(--text-muted);">${displayImages.size} target${displayImages.size!==1?'s':''} scanned</span>
            <div style="display:flex;gap:6px;">${sevChip('CRITICAL',totals.CRITICAL)}${sevChip('HIGH',totals.HIGH)}${sevChip('MEDIUM',totals.MEDIUM)}${sevChip('LOW',totals.LOW)}</div>
          </div>` : ''}
        </div>`;
    }

    if (displayImages.size === 0) {
      findings.innerHTML = `<div class="log-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>No issues detected</p></div>`;
      return;
    }

    findings.innerHTML = SCAN_ORDER.map(phase => {
      const entries = [...displayImages.entries()].filter(([, v]) => v.scanType === phase);
      if (!entries.length) return '';
      const phaseHasIssues = entries.some(([, v]) => (v.severity.CRITICAL||0)+(v.severity.HIGH||0) > 0);
      const phaseColor = phaseHasIssues ? 'var(--red)' : 'var(--green)';
      const phaseIcon = phaseHasIssues
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`;
      return `<div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border);">
          <span style="color:${phaseColor};">${phaseIcon}</span>
          <span style="font-size:12px;font-weight:700;color:var(--text-primary);">${SCAN_LABELS[phase]||phase}</span>
          <span style="font-size:11px;color:var(--text-muted);">${entries.length} target${entries.length!==1?'s':''}</span>
        </div>
        ${entries.map(([n, img]) => renderImgCard(n, img)).join('')}
      </div>`;
    }).join('');
  } else {
    findings.innerHTML = [...displayImages.entries()].map(([name, img]) => renderImgCard(name, img)).join('');
  }
}

function toggleVulnImage(name) {
  const img = vulnImages.get(name);
  if (img) { img.expanded = !img.expanded; renderVulnReport(); }
}

// Parse a Trivy output line
function parseTrivyLine(raw) {
  const clean = stripAnsi(raw);

  // "Scanning image: X:latest..." → set current image name
  const scanM = clean.match(/Scanning image[:\s]+(.+)/i);
  if (scanM) {
    _vulnCurrentImage = scanM[1].trim().replace(/:latest.*$/, '');
    _vulnParseState = 'idle';
    return;
  }

  if (clean.includes('│')) {
    // New Trivy v0.71+ Report Summary row: │ imgname:latest (os ver) │ type │ N │ - │
    // Only match rows that have "(os)" pattern — the primary image row, not sub-targets
    const summaryM = clean.match(/│\s*([^│(]+?)\s+\(([^)]+)\)\s*│\s*\w+\s*│\s*(\d+)\s*│/);
    if (summaryM && _vulnCurrentImage) {
      const os = summaryM[2].trim();
      const vulnCount = parseInt(summaryM[3]);
      if (!vulnImages.has(_vulnCurrentImage)) {
        vulnImages.set(_vulnCurrentImage, { os, severity: { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 }, findings: [], expanded: false, scanType: _vulnScanPhase, runContext: _vulnAllRunning ? 'all' : _vulnScanPhase });
      } else {
        const img = vulnImages.get(_vulnCurrentImage);
        if (!img.os) img.os = os;
      }
      renderVulnReport();
      return;
    }

    // SCA / SAST: trivy fs scan file rows (path │ type │ count/dash) — no "(os)" pattern
    if ((_vulnScanPhase === 'sca' || _vulnScanPhase === 'sast') && !summaryM) {
      const cols = clean.split('│').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        const path = cols[0];
        const type = cols[1].toLowerCase();
        const knownTypes = /^(gomod|npm|pip|gobinary|node-pkg|python-pkg|jar|cargo|nuget|composer|rubygems|cocoapods|text|conan|swift|debian|ubuntu|alpine|redhat)$/;
        if (knownTypes.test(type) && path && !path.match(/^[-─┼├┤]+$/) && path !== 'Target' && path !== 'Type') {
          // Skip entries with no findings (count column is '-' or 0)
          const countStr = cols[2] || '-';
          const count = countStr === '-' ? 0 : (parseInt(countStr) || 0);
          if (count <= 0) return;
          if (!vulnImages.has(path)) {
            vulnImages.set(path, { os: type, severity: { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 }, findings: [], expanded: false, scanType: _vulnScanPhase, runContext: _vulnAllRunning ? 'all' : _vulnScanPhase });
            renderVulnReport();
          }
        }
      }
    }

    // CVE table row (old format or new with vulns): │ lib │ CVE-XXXX-XXXX │ SEV │ ...
    if (clean.match(/CVE-\d{4}-\d+/i) && _vulnCurrentImage) {
      const img = vulnImages.get(_vulnCurrentImage);
      if (!img) return;
      const cols = clean.split('│').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        const cveIdx = cols.findIndex(c => /CVE-\d{4}-\d+/i.test(c));
        if (cveIdx >= 0) {
          const lib = cols[cveIdx - 1] || cols[0];
          const cve = cols[cveIdx].match(/(CVE-\d{4}-\d+)/i)?.[1] || cols[cveIdx];
          const sev = cols[cveIdx + 1]?.toUpperCase() || 'UNKNOWN';
          const status = cols[cveIdx + 2] || '';
          const ver = cols[cveIdx + 3] || '';
          const title = cols[cveIdx + 4] || '';
          if (!img.findings.find(f => f.cve === cve && f.lib === lib)) {
            img.findings.push({ lib, cve, sev, status, ver, title });
            img.severity[sev] = (img.severity[sev] || 0) + 1;
          }
          renderVulnReport();
        }
      }
    }
    return;
  }

  // Old Trivy format: standalone "imagename (os version)" line
  const hdrM = clean.match(/^([^\s(]+)\s+\(([^)]+)\)\s*$/);
  if (hdrM) {
    const name = hdrM[1].trim().replace(/:latest$/, '');
    // Only treat as a new top-level image if it matches the image set by "Scanning image:" OR no image is active yet.
    // Sub-targets like "Java (jar)" inside a container scan must stay under the parent image.
    const isMainImage = !_vulnCurrentImage || name === _vulnCurrentImage;
    if (isMainImage) {
      if (!vulnImages.has(name)) {
        vulnImages.set(name, { os: hdrM[2].trim(), severity: { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 }, findings: [], expanded: false, scanType: _vulnScanPhase, runContext: _vulnAllRunning ? 'all' : _vulnScanPhase });
      }
      _vulnCurrentImage = name;
      _vulnParseState = 'header';
    }
    // else: sub-target (e.g. "Java (jar)") — keep _vulnCurrentImage pointing to the parent image
    return;
  }

  // Old Trivy format: "Total: N (CRITICAL: X, HIGH: Y, ...)"
  const totalM = clean.match(/Total:\s*\d+\s*\((.+)\)/);
  if (totalM && _vulnCurrentImage) {
    const img = vulnImages.get(_vulnCurrentImage);
    if (img) {
      for (const part of totalM[1].split(',')) {
        const m = part.trim().match(/(\w+):\s*(\d+)/);
        if (m) img.severity[m[1].toUpperCase()] = parseInt(m[2]);
      }
      _vulnParseState = 'table';
      renderVulnReport();
    }
    return;
  }

  // SAST secret finding: "CRITICAL: Stripe (stripe-secret-token)"
  const secretM = clean.match(/^(CRITICAL|HIGH|MEDIUM|LOW|INFO):\s+(.+?)\s+\(([^)]+)\)\s*$/);
  if (secretM && _vulnCurrentImage) {
    const [, sev, findingName, ruleId] = secretM;
    const img = vulnImages.get(_vulnCurrentImage);
    if (img && !img.findings.find(f => f.lib === ruleId)) {
      const finding = { lib: ruleId, cve: findingName, sev, status: '', ver: '', title: '', type: 'secret' };
      img.findings.push(finding);
      _vulnPendingSecretFinding = finding;
      renderVulnReport();
    }
    return;
  }

  // SAST location line: " .secrets:1 (offset: 18 bytes)"
  if (_vulnPendingSecretFinding) {
    const locM = clean.match(/^\s+([^\s]+:\d+)\s+\(offset:/);
    if (locM) {
      _vulnPendingSecretFinding.ver = locM[1];
      renderVulnReport();
    }
    if (clean.match(/^[═─\s]*$/) || locM) return;
    // Next non-separator non-empty content line = description
    if (clean.trim() && !clean.match(/^[═─]+$/)) {
      if (!_vulnPendingSecretFinding.title) {
        _vulnPendingSecretFinding.title = clean.trim();
        renderVulnReport();
      }
    }
  }
}

function selectVulnScanType(type) {
  _vulnSelectedType = type;
  _setVulnSelectedBtn(type);
  renderVulnReport();
  _renderVulnLog(type);
}

function _renderVulnLog(type) {
  const logOut = document.getElementById('vuln-log-output');
  if (!logOut) return;
  // Show the stored log lines for the selected type (or merged for 'all')
  // 'all' only shows logs if Scan All was actually run
  const types = (type === 'all' && _vulnAllWasRun) ? ['trivy', 'sca', 'sast', 'dast']
              : (type === 'all') ? []
              : [type];
  const lines = types.flatMap(t => _vulnLogsByType[t] || []);
  if (lines.length === 0) {
    logOut.innerHTML = `<div class="log-placeholder" style="padding:20px;color:var(--text-muted);font-size:12px;">No log for this scan type yet.</div>`;
    return;
  }
  logOut.innerHTML = '';
  for (const text of lines) {
    const div = document.createElement('div');
    div.className = 'log-line';
    div.style.cssText = 'font-size:11px;font-family:monospace;white-space:pre-wrap;';
    div.textContent = text;
    logOut.appendChild(div);
  }
  logOut.scrollTop = logOut.scrollHeight;
}

function runCurrentVulnScan() {
  runVulnScan(_vulnSelectedType || 'all');
}

function _setVulnSelectedBtn(selectedType) {
  const map = { trivy: 'vuln-btn-trivy', sast: 'vuln-btn-sast', dast: 'vuln-btn-dast', sca: 'vuln-btn-sca', all: 'vuln-btn-all' };
  const accentColors = { all: 'var(--accent)', trivy: 'var(--blue)', sast: 'var(--purple,#a855f7)', dast: 'var(--orange,#f97316)', sca: 'var(--green)' };
  for (const [t, id] of Object.entries(map)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    if (t === selectedType) {
      btn.style.background = accentColors[t] || 'var(--accent)';
      btn.style.opacity = '1';
      btn.style.boxShadow = `0 0 0 2px ${accentColors[t] || 'var(--accent)'}88`;
    } else {
      btn.style.background = t === 'all' ? 'var(--accent)' : '';
      btn.style.opacity = '0.55';
      btn.style.boxShadow = '';
    }
  }
}

function _setVulnScanBtn(activeType) {
  const map = { trivy: 'vuln-btn-trivy', sast: 'vuln-btn-sast', dast: 'vuln-btn-dast', sca: 'vuln-btn-sca', all: 'vuln-btn-all' };
  for (const [t, id] of Object.entries(map)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    if (t === activeType) {
      btn.style.boxShadow = '0 0 0 2px var(--blue), 0 0 10px rgba(59,130,246,0.4)';
      btn.style.opacity = '1';
      btn.style.position = 'relative';
      const dot = document.createElement('span');
      dot.id = `${id}-dot`;
      dot.style.cssText = 'position:absolute;top:-4px;right:-4px;width:8px;height:8px;border-radius:50%;background:var(--blue);animation:pulse-dot 1.2s infinite;';
      btn.style.position = 'relative';
      if (!btn.querySelector(`#${id}-dot`)) btn.appendChild(dot);
    } else {
      btn.style.boxShadow = '';
      btn.style.opacity = activeType ? '0.45' : '';
      const dot = btn.querySelector(`#${id}-dot`);
      if (dot) dot.remove();
    }
  }
}

function _runSingleScanWs(type) {
  return new Promise((resolve) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/dashboard/ws/vulnerability?type=${type}`);
    vulnWs = ws;
    let _lineBuf = '';
    let _passed = false;
    let _failed = false;
    ws.onmessage = e => {
      // Store log line per type so switching scan type also switches the raw log
      if (_vulnScanPhase) {
        if (!_vulnLogsByType[_vulnScanPhase]) _vulnLogsByType[_vulnScanPhase] = [];
        _vulnLogsByType[_vulnScanPhase].push(e.data);
      }
      // Only append to the visible log output if this is the currently selected type (or 'all')
      const logOut = document.getElementById('vuln-log-output');
      if (_vulnSelectedType === 'all' || _vulnSelectedType === _vulnScanPhase) {
        const div = document.createElement('div');
        div.className = 'log-line';
        div.style.cssText = 'font-size:11px;font-family:monospace;white-space:pre-wrap;';
        div.textContent = e.data;
        logOut.appendChild(div);
        if (vulnCurrentTab === 'log') logOut.scrollTop = logOut.scrollHeight;
      }
      // Use server-sent exit code for reliable pass/fail (avoids false positives from echoed script commands)
      const exitM = e.data.match(/Security scan.*finished with exit code\s+(\d+)/);
      if (exitM) {
        if (parseInt(exitM[1]) === 0) _passed = true;
        else _failed = true;
      } else if (e.data.includes('PASSED') || e.data.includes('scan completed')) {
        _passed = true;
      } else if (e.data.includes('vulnerabilities detected')) {
        _failed = true;
      }
      _lineBuf += e.data;
      const lines = _lineBuf.split('\n');
      _lineBuf = lines.pop();
      for (const line of lines) parseTrivyLine(line);
      // DAST: ZAP alert lines → add to vulnImages as MEDIUM (WARN-NEW) or HIGH (FAIL-NEW)
      if (_vulnScanPhase === 'dast') {
        const zapM = e.data.match(/^(WARN-NEW|FAIL-NEW):\s*(.+?)\s*\[(\d+)\](?:\s*x\s*(\d+))?/);
        if (zapM) {
          const desc = zapM[2].trim();
          const ruleId = zapM[3];
          const count = parseInt(zapM[4] || '1');
          const sev = zapM[1] === 'FAIL-NEW' ? 'HIGH' : 'MEDIUM';
          if (!vulnImages.has(desc)) {
            vulnImages.set(desc, { os: 'zap-alert', severity: { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 }, findings: [], expanded: false, scanType: 'dast', runContext: _vulnAllRunning ? 'all' : 'dast' });
          }
          const entry = vulnImages.get(desc);
          entry.severity[sev] = (entry.severity[sev] || 0) + count;
          renderVulnReport();
        }
      }
    };
    ws.onclose = () => { vulnWs = null; resolve(_failed ? 'fail' : _passed ? 'pass' : 'pass'); };
    ws.onerror = () => { vulnWs = null; resolve('fail'); };
  });
}

async function runVulnScan(type) {
  if (vulnWs || _vulnAllRunning) return;

  // Clear only the types that will be re-run (preserve results of other types)
  const typesToClear = type === 'all' ? ['trivy', 'sca', 'sast', 'dast'] : [type];
  for (const [key, val] of vulnImages) {
    if (typesToClear.includes(val.scanType)) vulnImages.delete(key);
  }
  for (const t of typesToClear) { delete _vulnScanResults[t]; _vulnLogsByType[t] = []; }
  _vulnCurrentImage = null;
  _vulnParseState = 'idle';
  _vulnPendingSecretFinding = null;
  _vulnScanPhase = null;

  document.getElementById('vuln-log-output').innerHTML = '';
  document.getElementById('vuln-findings').innerHTML = `<div class="log-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>Scan in progress...</p></div>`;
  document.getElementById('vuln-summary').style.display = 'none';

  const LABEL = { trivy:'Container Scan', sast:'SAST', dast:'DAST', sca:'SCA' };
  const tracker = startProgressBar('vuln', 'vuln-progress-container', 'vuln-progress-bar', 'vuln-progress-pct', type === 'all' ? 10 : 40);

  const runBtn = document.getElementById('vuln-run-btn');
  if (runBtn) { runBtn.disabled = true; runBtn.style.opacity = '0.5'; }

  if (type === 'all') {
    _vulnAllRunning = true;
    _vulnAllWasRun = true;
    _setVulnScanBtn('all');
    const phases = ['trivy', 'sca', 'sast', 'dast'];
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      _vulnScanPhase = phase;
      _vulnScanResults[phase] = 'running';
      document.getElementById('vuln-status').innerHTML = `<div class="dot-streaming"></div><span style="color:var(--blue);">Running: ${LABEL[phase]} (${i+1}/${phases.length})</span>`;
      const result = await _runSingleScanWs(phase);
      _vulnScanResults[phase] = result;
    }
    _vulnAllRunning = false;
    _vulnScanPhase = null;
    _setVulnScanBtn(null);
    _setVulnSelectedBtn(_vulnSelectedType);
    const hasFindings = [...vulnImages.values()].some(i => (i.severity.CRITICAL||0)+(i.severity.HIGH||0) > 0);
    document.getElementById('vuln-status').innerHTML = hasFindings
      ? '<div class="dot-failed"></div><span style="color:var(--red);">Issues found</span>'
      : '<div class="dot-success"></div><span style="color:var(--green);">Scan complete</span>';
    if (hasFindings) tracker.fail(); else tracker.finish();
    for (const img of vulnImages.values()) {
      if ((img.severity.CRITICAL||0)+(img.severity.HIGH||0) > 0) img.expanded = true;
    }
    if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = '1'; }
    renderVulnReport();
    return;
  }

  // Individual scan
  _vulnScanPhase = type;
  document.getElementById('vuln-status').innerHTML = `<div class="dot-streaming"></div><span style="color:var(--blue);">Running: ${LABEL[type]||type}</span>`;
  _setVulnScanBtn(type);

  const result = await _runSingleScanWs(type);
  _vulnScanResults[type] = result;

  _vulnScanPhase = null;
  _setVulnScanBtn(null);
  _setVulnSelectedBtn(_vulnSelectedType);
  const hasFindings = [...vulnImages.values()].some(i => (i.severity.CRITICAL||0)+(i.severity.HIGH||0) > 0);
  document.getElementById('vuln-status').innerHTML = hasFindings
    ? '<div class="dot-failed"></div><span style="color:var(--red);">Issues found</span>'
    : '<div class="dot-success"></div><span style="color:var(--green);">Scan complete</span>';
  if (hasFindings) tracker.fail(); else tracker.finish();
  for (const img of vulnImages.values()) {
    if ((img.severity.CRITICAL||0)+(img.severity.HIGH||0) > 0) img.expanded = true;
  }
  if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = '1'; }
  renderVulnReport();
}

function clearVulnLogs() {
  if (vulnWs) { vulnWs.close(); vulnWs = null; }
  _vulnAllRunning = false;
  _vulnAllWasRun = false;
  _vulnScanPhase = null;
  _vulnScanResults = {};
  _vulnLogsByType = {};
  vulnImages.clear();
  _vulnCurrentImage = null;
  _vulnPendingSecretFinding = null;
  document.getElementById('vuln-log-output').innerHTML = `<div class="log-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>Select a scan type to run</p></div>`;
  document.getElementById('vuln-findings').innerHTML = `<div class="log-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>Run a scan to view results</p></div>`;
  document.getElementById('vuln-summary').style.display = 'none';
  document.getElementById('vuln-status').innerHTML = '<div class="dot-idle"></div><span>Idle</span>';
  document.getElementById('vuln-progress-container').style.display = 'none';
  _vulnSelectedType = 'all';
  _setVulnSelectedBtn('all');
  const runBtn = document.getElementById('vuln-run-btn');
  if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = '1'; }
}

function copyLogContent(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const lines = Array.from(el.querySelectorAll('.log-line')).map(d => d.textContent);
  if (!lines.length) { showToast('No log content to copy', 'info'); return; }
  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => showToast('Copied to clipboard', 'success'))
    .catch(() => showToast('Copy failed', 'error'));
}

function exportLogs(containerId, filenameBase) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const lines = Array.from(el.querySelectorAll('.log-line')).map(d => d.textContent);
  if (!lines.length) { showToast('No log content to export', 'info'); return; }
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filenameBase}-${ts}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── System Telemetry ────────────────────────────────────────────────────────────
let telemetryChart = null;
const telemetryHistory = { mysql: [], redis: [], kong: [], timestamps: [] };
// Telemetry is initialized and polled inside DOMContentLoaded / showView

async function fetchTelemetry() {
  try {
    const res = await fetch('/dashboard/api/telemetry');
    const data = await res.json();

    const dbEl = document.getElementById('tel-kong-db');
    dbEl.textContent = data.kong.db === 'connected' ? 'Connected' : 'Offline';
    dbEl.className = `badge ${data.kong.db === 'connected' ? 'running' : 'exited'}`;
    document.getElementById('tel-kong-conn').textContent = data.kong.active;
    document.getElementById('tel-kong-reqs').textContent = data.kong.total.toLocaleString();

    document.getElementById('tel-mysql-conn').textContent = data.mysql.connections;
    document.getElementById('tel-mysql-queries').textContent = data.mysql.queries.toLocaleString();
    
    const uptimeHours = (data.mysql.uptime / 3600).toFixed(1);
    document.getElementById('tel-mysql-uptime').textContent = `${uptimeHours} hours`;

    document.getElementById('tel-redis-clients').textContent = data.redis.clients;
    document.getElementById('tel-redis-memory').textContent = `${(data.redis.memory / 1024 / 1024).toFixed(1)} MB`;
    document.getElementById('tel-redis-hitrate').textContent = `${data.redis.hitRate}%`;

    // Store and render Kong API stats
    _kongTopApis = data.kong.topApis || [];
    _kongSlowApis = data.kong.slowApis || [];
    renderKongTable();

    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    telemetryHistory.timestamps.push(now);
    telemetryHistory.mysql.push(data.mysql.connections);
    telemetryHistory.redis.push(data.redis.clients);
    telemetryHistory.kong.push(data.kong.total);

    if (telemetryHistory.timestamps.length > 8640) {
      telemetryHistory.timestamps.shift();
      telemetryHistory.mysql.shift();
      telemetryHistory.redis.shift();
      telemetryHistory.kong.shift();
    }

    updateTelemetryChart();
  } catch (e) {
    console.error('Failed to fetch telemetry data:', e);
  }
}

function updateTelemetryChart() {
  const ctx = document.getElementById('telemetry-chart').getContext('2d');
  
  if (telemetryChart) {
    telemetryChart.update('none');
    return;
  }

  telemetryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: telemetryHistory.timestamps,
      datasets: [
        {
          label: 'MySQL Active Connections',
          data: telemetryHistory.mysql,
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          label: 'Redis Connected Clients',
          data: telemetryHistory.redis,
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          label: 'Kong Total Requests',
          data: telemetryHistory.kong,
          borderColor: '#a855f7',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      elements: {
        point: { radius: 0, hoverRadius: 4 }
      },
      plugins: {
        legend: {
          labels: { color: '#8892b0', font: { family: 'Inter' } }
        }
      },
      scales: {
        x: { ticks: { color: '#8892b0', font: { size: 9, family: 'monospace' } }, grid: { display: false } },
        y: { 
          type: 'linear',
          display: true,
          position: 'left',
          ticks: { color: '#8892b0', font: { size: 9, family: 'monospace' } }, 
          grid: { color: '#1e2340' },
          title: { display: true, text: 'Database Connections', color: '#10b981', font: { size: 10, weight: 'bold' } }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: { color: '#8892b0', font: { size: 9, family: 'monospace' } },
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Kong Total Requests', color: '#a855f7', font: { size: 10, weight: 'bold' } }
        }
      }
    }
  });
}

// ── Helpers & Diagnostics Extensions ──────────────────────────────────────────
let progressTrackers = {};
function startProgressBar(idKey, containerId, barId, pctId, estimatedSeconds) {
  if (progressTrackers[idKey]) {
    clearInterval(progressTrackers[idKey].interval);
  }
  const container = document.getElementById(containerId);
  const bar = document.getElementById(barId);
  const pct = document.getElementById(pctId);
  
  if (!container || !bar || !pct) return { finish: () => {}, fail: () => {} };
  
  container.style.display = 'flex';
  bar.style.width = '0%';
  bar.style.background = 'var(--green)';
  pct.textContent = '0%';
  pct.style.color = 'var(--green)';
  
  let progress = 0;
  const stepTimeMs = 200;
  const totalSteps = (estimatedSeconds * 1000) / stepTimeMs;
  let step = 0;
  
  const interval = setInterval(() => {
    step++;
    if (progress < 95) {
      const ratio = step / totalSteps;
      progress = Math.min(95, Math.floor(100 * (1 - Math.exp(-2.5 * ratio))));
      bar.style.width = `${progress}%`;
      pct.textContent = `${progress}%`;
    }
  }, stepTimeMs);
  
  progressTrackers[idKey] = {
    interval,
    finish: () => {
      clearInterval(interval);
      bar.style.width = '100%';
      pct.textContent = '100%';
      setTimeout(() => { container.style.display = 'none'; }, 2000);
      delete progressTrackers[idKey];
    },
    fail: () => {
      clearInterval(interval);
      bar.style.width = '100%';
      bar.style.background = 'var(--red)';
      pct.textContent = 'Failed';
      pct.style.color = 'var(--red)';
      setTimeout(() => {
        container.style.display = 'none';
        bar.style.background = 'var(--green)';
        pct.style.color = 'var(--green)';
      }, 3000);
      delete progressTrackers[idKey];
    }
  };
  return progressTrackers[idKey];
}

function getLogLineClass(text) {
  const lower = text.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('fail') || lower.includes('unable to find') || lower.includes('access denied') || lower.includes('exit code') || lower.includes('fatal') || lower.includes('failure') || lower.includes('critical') || lower.includes('high')) {
    return 'error';
  }
  if (lower.includes('warning') || lower.includes('warn')) {
    return 'warn';
  }
  return '';
}

function applyLogFilter() {
  const filterText = document.getElementById('log-filter-input').value.toLowerCase();
  currentLogLines.forEach(line => {
    if (!filterText || line.text.toLowerCase().includes(filterText)) {
      line.element.style.display = 'block';
    } else {
      line.element.style.display = 'none';
    }
  });
}

// ── Data Pipeline ─────────────────────────────────────────────────────────
const TASK_ORDER = ['bronze_ingest', 'silver_transform', 'gold_features', 'model_train'];
const TASK_STAGE_ID = { bronze_ingest: 'bronze', silver_transform: 'silver', gold_features: 'gold', model_train: 'model_train' };

let _pipelinePollerTimer = null;

function startPipelinePoller() {
  if (_pipelinePollerTimer) return;
  _pipelinePollerTimer = setInterval(async () => {
    const isPipelineActive = document.getElementById('view-pipeline') && document.getElementById('view-pipeline').classList.contains('active');
    if (!isPipelineActive) { stopPipelinePoller(); return; }
    await loadPipelineRuns();
    // Stop polling once no runs are in running state
    const rows = document.querySelectorAll('#pipeline-runs-table .run-state.running');
    if (rows.length === 0) stopPipelinePoller();
  }, 3000);
}

function stopPipelinePoller() {
  if (_pipelinePollerTimer) { clearInterval(_pipelinePollerTimer); _pipelinePollerTimer = null; }
}

function initPipelineView() {
  stopPipelinePoller();
  loadPipelineStatus();
  loadPipelineRuns().then(() => {
    const rows = document.querySelectorAll('#pipeline-runs-table .run-state.running');
    if (rows.length > 0) startPipelinePoller();
  });
  // Lineage stage boxes: click → data viewer (model_train has no Parquet data)
  ['bronze','silver','gold'].forEach(layer => {
    const el = document.getElementById('stage-' + layer);
    if (el) {
      el.style.cursor = 'pointer';
      el.title = 'Click to view data in this layer';
      el.addEventListener('click', () => openLayerModal(layer));
    }
  });
  const modelStage = document.getElementById('stage-model_train');
  if (modelStage) {
    modelStage.style.cursor = 'default';
    modelStage.title = 'Model artifacts (.pkl) stored in MinIO — no tabular preview';
  }
}

async function loadPipelineStatus() {
  try {
    const r = await fetch('/dashboard/api/pipeline/status');
    const data = await r.json();
    const el = document.getElementById('pipeline-dag-status');
    if (el) {
      const d = I18N[_currentLang] || I18N.en;
      el.textContent = data.is_paused === false ? `● ${d['pipeline.active']||'Active'}` : `⏸ ${d['pipeline.paused']||'Paused'}`;
      el.style.color = data.is_paused === false ? 'var(--success)' : 'var(--text-secondary)';
    }
  } catch {}
}

let _pipelineSelectedRunId = null;

async function loadPipelineRuns() {
  const container = document.getElementById('pipeline-runs-table');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;text-align:center;padding:24px;">Loading...</div>';

  try {
    const r = await fetch('/dashboard/api/pipeline/runs?limit=15');
    const data = await r.json();
    const runs = data.dag_runs || [];

    if (!runs.length) {
      container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;text-align:center;padding:24px;">No runs yet. Click ▶ Run Pipeline to start.</div>';
      resetLineageBadges();
      return;
    }

    renderRunHistory(runs);

    // Auto-select most recent run
    const targetId = _pipelineSelectedRunId || runs[0].dag_run_id;
    selectRun(targetId, runs);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--error,#f85149);font-size:13px;text-align:center;padding:24px;">Airflow unavailable — start airflow-webserver container</div>`;
  }
}

function renderRunHistory(runs) {
  const container = document.getElementById('pipeline-runs-table');
  const rows = runs.map(run => {
    const state = run.state || 'unknown';
    const start = run.start_date ? new Date(run.start_date).toLocaleString() : '—';
    const end   = run.end_date   ? new Date(run.end_date).toLocaleString()   : '—';
    const dur   = (run.start_date && run.end_date)
      ? fmtDuration(new Date(run.end_date) - new Date(run.start_date)) : '—';
    const isSelected = run.dag_run_id === _pipelineSelectedRunId;
    return `<tr class="run-history-row${isSelected ? ' selected' : ''}"
        onclick="selectRun('${run.dag_run_id}')"
        style="cursor:pointer;${isSelected ? 'background:rgba(99,102,241,.15);' : ''}">
      <td><span class="run-state ${state}">${state}</span></td>
      <td style="font-family:var(--font-mono,monospace);font-size:11px;">${run.dag_run_id}</td>
      <td>${start}</td>
      <td>${end}</td>
      <td style="font-weight:600;">${dur}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `<table class="pipeline-table">
    <thead><tr><th data-i18n="col.state">State</th><th data-i18n="col.runId">Run ID</th><th data-i18n="col.started">Started</th><th data-i18n="col.ended">Ended</th><th data-i18n="col.duration">Total Duration</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  applyLang();
}

async function selectRun(runId, runs) {
  _pipelineSelectedRunId = runId;
  // Highlight selected row
  document.querySelectorAll('.run-history-row').forEach(r => {
    const isMe = r.querySelector('td:nth-child(2)')?.textContent.trim() === runId;
    r.style.background = isMe ? 'rgba(99,102,241,.15)' : '';
  });
  await fetchTaskInstances(runId);
}

function resetLineageBadges() {
  TASK_ORDER.forEach(t => {
    const sid = TASK_STAGE_ID[t];
    const badge = document.getElementById('badge-' + sid);
    const stage = document.getElementById('stage-' + sid);
    if (badge) { badge.textContent = '—'; badge.className = 'stage-badge'; badge.title = ''; }
    if (stage) stage.className = 'pipeline-stage';
  });
}

async function fetchTaskInstances(runId) {
  const detail = document.getElementById('pipeline-task-detail');
  const table  = document.getElementById('pipeline-task-table');
  if (!detail || !table) return;

  resetLineageBadges();
  detail.style.display = 'block';
  table.innerHTML = '<tr><td colspan="5" style="color:var(--text-secondary);text-align:center;padding:16px;">Loading...</td></tr>';

  try {
    const r = await fetch(`/dashboard/api/pipeline/runs/${encodeURIComponent(runId)}/tasks`);
    const data = await r.json();
    const tasks = (data.task_instances || []).sort((a, b) =>
      TASK_ORDER.indexOf(a.task_id) - TASK_ORDER.indexOf(b.task_id));

    // Update Lineage badges with state + duration
    tasks.forEach(t => {
      const sid = TASK_STAGE_ID[t.task_id];
      if (!sid) return;
      const badge = document.getElementById('badge-' + sid);
      const stage = document.getElementById('stage-' + sid);
      const state = t.state || 'none';
      const dur   = (t.start_date && t.end_date)
        ? fmtDuration(new Date(t.end_date) - new Date(t.start_date)) : null;
      if (badge) {
        badge.textContent = dur ? `${state} · ${dur}` : state;
        badge.title = dur ? `Duration: ${dur}` : state;
        badge.className = 'stage-badge ' + (
          state === 'success'  ? 'success'  :
          state === 'running'  ? 'running'  :
          state === 'failed'   ? 'failed'   :
          (state === 'queued' || state === 'scheduled') ? 'queued' : 'skipped');
      }
      if (stage) stage.className = 'pipeline-stage ' + (
        state === 'success' ? 'success' : state === 'running' ? 'running' : state === 'failed' ? 'failed' : '');
    });

    if (!tasks.length) {
      table.innerHTML = '<tr><td colspan="5" style="color:var(--text-secondary);text-align:center;padding:16px;">No task instances yet for this run.</td></tr>';
      return;
    }

    // Render task detail table with timing between stages
    let prevEnd = null;
    const rows = tasks.map((t, i) => {
      const state = t.state || '—';
      const dur   = (t.start_date && t.end_date)
        ? fmtDuration(new Date(t.end_date) - new Date(t.start_date)) : '—';
      const start = t.start_date ? new Date(t.start_date).toLocaleString() : '—';
      const wait  = (prevEnd && t.start_date)
        ? fmtDuration(new Date(t.start_date) - new Date(prevEnd)) : '—';
      if (t.end_date) prevEnd = t.end_date;

      const waitCell = i === 0 ? '' :
        `<span style="color:var(--text-muted);font-size:10px;margin-left:6px;">(+${wait} wait)</span>`;

      return `<tr class="task-row" onclick="showTaskLog('${runId}','${t.task_id}',${t.try_number||1})"
          style="cursor:pointer;" title="Click to view logs">
        <td style="font-weight:600;">${t.task_id}</td>
        <td><span class="run-state ${state}">${state}</span></td>
        <td style="font-size:12px;">${start}</td>
        <td style="font-weight:600;">${dur}${waitCell}</td>
        <td style="color:var(--text-secondary);font-size:11px;">${t.try_number || 0} tries</td>
      </tr>`;
    }).join('');

    table.innerHTML = `<table class="pipeline-table">
      <thead><tr><th data-i18n="col.task">Task</th><th data-i18n="col.state">State</th><th data-i18n="col.started">Started</th><th data-i18n="col.duration">Duration (+ wait from prev)</th><th data-i18n="col.retries">Retries</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  applyLang();
    // hover effect
    table.querySelectorAll('.task-row').forEach(r => {
      r.addEventListener('mouseenter', () => r.style.background = 'rgba(255,255,255,.05)');
      r.addEventListener('mouseleave', () => r.style.background = '');
    });
  } catch (e) {
    table.innerHTML = `<tr><td colspan="5" style="color:var(--error,#f85149);text-align:center;padding:16px;">Load failed: ${e.message}</td></tr>`;
  }
}

function fmtDuration(ms) {
  if (ms < 0) ms = 0;
  if (ms < 1000) return ms + 'ms';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60), rem = s % 60;
  return m + 'm ' + (rem > 0 ? rem + 's' : '');
}

async function triggerPipeline() {
  try {
    const r = await fetch('/dashboard/api/pipeline/trigger', { method: 'POST' });
    const data = await r.json();
    if (r.ok) {
      showToast('Pipeline triggered: ' + (data.dag_run_id || ''), 'success');
      setTimeout(() => { loadPipelineRuns(); startPipelinePoller(); }, 1500);
    } else {
      showToast('Trigger failed: ' + (data.detail || data.title || JSON.stringify(data)), 'error');
    }
  } catch (e) {
    showToast('Airflow unavailable', 'error');
  }
}

// ── Task Log Viewer ───────────────────────────────────────────────────────────
async function showTaskLog(runId, taskId, tryNumber) {
  const overlay = document.getElementById('task-log-overlay');
  const body    = document.getElementById('task-log-body');
  const title   = document.getElementById('task-log-title');
  const meta    = document.getElementById('task-log-meta');

  overlay.style.display = 'flex';
  title.textContent = taskId;
  meta.textContent  = `try #${tryNumber}`;
  body.innerHTML    = '<span style="color:var(--text-muted);">Loading…</span>';

  try {
    const r = await fetch(
      `/dashboard/api/pipeline/task-logs?runId=${encodeURIComponent(runId)}&taskId=${encodeURIComponent(taskId)}&try=${tryNumber}`
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || data.error);

    const lines = data.logs || [];
    if (!lines.length) {
      body.innerHTML = '<span style="color:var(--text-muted);">No log entries found.</span>';
      return;
    }

    body.innerHTML = lines.map(l => {
      const ts  = l.ts  ? `<span style="color:var(--text-muted);user-select:none;">${l.ts}</span> ` : '';
      const lvl = l.level === 'ERROR'   ? `<span style="color:#f87171;font-weight:600;">[${l.level}]</span> ` :
                  l.level === 'WARNING' ? `<span style="color:#fbbf24;">[${l.level}]</span> ` :
                  l.level === 'INFO'    ? `<span style="color:#60a5fa;">[${l.level}]</span> ` :
                                         `<span style="color:var(--text-muted);">[${l.level}]</span> `;
      const msg = escapeHtml(l.msg);
      return `<div style="padding:1px 0;border-bottom:1px solid rgba(255,255,255,.03);">${ts}${lvl}${msg}</div>`;
    }).join('');

    // Scroll to bottom (most recent)
    body.scrollTop = body.scrollHeight;
  } catch (e) {
    body.innerHTML = `<span style="color:#f87171;">Error: ${escapeHtml(e.message)}</span>`;
  }
}

function closeTaskLog() {
  document.getElementById('task-log-overlay').style.display = 'none';
}

document.getElementById('task-log-overlay')?.addEventListener('click', function(e) {
  if (e.target === this) closeTaskLog();
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Layer Data Viewer ─────────────────────────────────────────────────────────
const LAYER_LABELS = {
  bronze: 'Bronze Layer',
  silver: 'Silver Layer',
  gold: 'Gold Layer',
  model_train: 'Model Layer',
};

async function openLayerModal(layer) {
  const overlay = document.getElementById('layer-modal-overlay');
  overlay.style.display = 'flex';
  document.getElementById('layer-modal-title').textContent = LAYER_LABELS[layer] || layer;
  document.getElementById('layer-modal-bucket').textContent = '';
  document.getElementById('layer-file-list').innerHTML = '<div style="color:var(--text-muted);padding:8px;">Loading…</div>';
  setLayerDataState('empty');

  try {
    const r = await fetch(`/dashboard/api/pipeline/layer/${layer}/files`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || data.error);
    document.getElementById('layer-modal-bucket').textContent = data.bucket || '';
    renderLayerFileList(layer, data.files || []);
  } catch (e) {
    document.getElementById('layer-file-list').innerHTML =
      `<div style="color:#f87171;padding:8px;font-size:12px;">${e.message}</div>`;
  }
}

function closeLayerModal() {
  document.getElementById('layer-modal-overlay').style.display = 'none';
}

function setLayerDataState(state, msg) {
  document.getElementById('layer-data-empty').style.display   = state === 'empty'   ? '' : 'none';
  document.getElementById('layer-data-loading').style.display = state === 'loading' ? '' : 'none';
  document.getElementById('layer-data-content').style.display = state === 'data'    ? '' : 'none';
  document.getElementById('layer-data-error').style.display   = state === 'error'   ? '' : 'none';
  if (state === 'error' && msg) document.getElementById('layer-data-error').textContent = msg;
}

function renderLayerFileList(layer, files) {
  const el = document.getElementById('layer-file-list');
  if (!files.length) {
    el.innerHTML = '<div style="color:var(--text-muted);padding:8px;font-size:12px;">No files found.<br>Run the pipeline first.</div>';
    return;
  }
  el.innerHTML = files.map(f => {
    const name = f.name;
    const kb = f.size ? (f.size / 1024).toFixed(1) + ' KB' : '';
    const shortName = name.length > 28 ? '…' + name.slice(-25) : name;
    return `<div class="layer-file-item" onclick="loadLayerData('${layer}','${name}')"
      title="${name}" style="padding:6px 8px;border-radius:6px;cursor:pointer;margin-bottom:2px;
      transition:background .15s;font-family:var(--font-mono,monospace);">
      <div style="color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${shortName}</div>
      <div style="color:var(--text-muted);font-size:10px;">${kb}</div>
    </div>`;
  }).join('');
  // hover style via JS
  el.querySelectorAll('.layer-file-item').forEach(item => {
    item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-hover,rgba(255,255,255,.06))');
    item.addEventListener('mouseleave', () => item.style.background = '');
    item.addEventListener('click', () => {
      el.querySelectorAll('.layer-file-item').forEach(i => i.style.background = '');
      item.style.background = 'var(--accent-muted,rgba(99,102,241,.2))';
    });
  });
}

async function loadLayerData(layer, file) {
  setLayerDataState('loading');
  try {
    const r = await fetch(`/dashboard/api/pipeline/layer/${layer}/data?file=${encodeURIComponent(file)}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || data.error);
    renderLayerDataTable(data.schema || [], data.rows || []);
  } catch (e) {
    setLayerDataState('error', 'Failed to load: ' + e.message);
  }
}

function renderLayerDataTable(schema, rows) {
  const cols = schema.length ? schema : (rows[0] ? Object.keys(rows[0]) : []);
  document.getElementById('layer-row-count').textContent = rows.length;
  const thead = '<thead><tr>' + cols.map(c =>
    `<th style="padding:6px 10px;white-space:nowrap;background:var(--bg-secondary,#1e1e2e);
     position:sticky;top:0;z-index:1;text-align:left;font-size:11px;color:var(--text-muted);">${c}</th>`
  ).join('') + '</tr></thead>';
  const tbody = '<tbody>' + rows.map((row, i) =>
    '<tr style="background:' + (i % 2 ? 'rgba(255,255,255,.02)' : 'transparent') + ';">' +
    cols.map(c => {
      let v = row[c];
      if (v === null || v === undefined) v = '<span style="color:var(--text-muted)">null</span>';
      else if (typeof v === 'object') v = JSON.stringify(v);
      else v = String(v);
      return `<td style="padding:4px 10px;border-bottom:1px solid var(--border);max-width:200px;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-mono,monospace);
        font-size:11px;">${v}</td>`;
    }).join('') + '</tr>'
  ).join('') + '</tbody>';
  document.getElementById('layer-data-table').innerHTML = thead + tbody;
  setLayerDataState('data');
}

// Close modal on overlay click
document.getElementById('layer-modal-overlay')?.addEventListener('click', function(e) {
  if (e.target === this) closeLayerModal();
});

// ── i18n ──────────────────────────────────────────────────────────────────
const I18N = {
  en: {
    // Nav
    'nav.dashboard': 'Dashboard', 'nav.containers': 'Container List',
    'nav.logs': 'Log Viewer', 'nav.topology': 'Topology',
    'nav.db': 'DB Viewer', 'nav.api': 'API Specifications',
    'nav.keycloak': 'Access Management', 'nav.model': 'Model Performance',
    'nav.ci': 'Local CI Pipelines', 'nav.tests': 'E2E Test Runner',
    'nav.pipeline': 'Data Pipeline', 'nav.vulnerability': 'Security Scanning',
    'nav.mockten': 'Mockten', 'nav.backdoor': 'Mockten(Backdoor)',
    // Header
    'header.autoRefresh': 'AUTO REFRESH', 'header.systemRestart': 'System Restart',
    // Page titles
    'title.dashboard': 'Dashboard', 'title.containers': 'Container List',
    'title.logs': 'Log Viewer', 'title.topology': 'Service Topology',
    'title.db': 'DB Viewer', 'title.api': 'API Specifications',
    'title.keycloak': 'Access Management', 'title.model': 'Model Performance',
    'title.ci': 'Local CI Pipelines', 'title.tests': 'E2E Test Runner',
    'title.vulnerability': 'Security Scanning', 'title.pipeline': 'Data Pipeline',
    // Container list
    'col.status': 'Status', 'col.containerName': 'Container Name', 'col.image': 'Image',
    'col.cpu': 'CPU', 'col.memory': 'Memory', 'col.uptime': 'Uptime', 'col.actions': 'Actions',
    // Model Performance
    'model.title': 'Recommendation Model', 'model.status': 'Status',
    'model.trainedAt': 'Trained At', 'model.lossFunc': 'Loss Function',
    'model.embeddings': 'Embeddings', 'model.trainBtn': '↺ Train Model Now',
    'model.diagTitle': 'Recommendations Diagnostics',
    'col.rank': 'Rank', 'col.productId': 'Product ID', 'col.productName': 'Product Name',
    'col.category': 'Category', 'col.score': 'Score',
    'model.metricsTitle': 'Evaluation Metrics',
    // Buttons
    'btn.run': '▶ Run', 'btn.clear': 'Clear', 'btn.export': 'Export',
    'btn.refresh': 'Refresh', 'btn.search': 'Search',
    // Security Scanning
    'vuln.scanAll': 'Scan All', 'vuln.containerScan': 'Container Scan',
    'vuln.report': 'Report', 'vuln.rawLog': 'Raw Log',
    // Pipeline
    'pipeline.runHistory': 'Run History', 'pipeline.stageTiming': 'Stage Timing',
    'col.state': 'State', 'col.runId': 'Run ID', 'col.started': 'Started',
    'col.ended': 'Ended', 'col.duration': 'Total Duration',
    'col.task': 'Task', 'col.retries': 'Retries',
    // Dashboard cards
    'dash.running': 'Running', 'dash.stopped': 'Stopped / Exited', 'dash.totalContainers': 'Total Containers',
    'dash.totalCpu': 'Total CPU Usage', 'dash.totalMemory': 'Total Memory Usage',
    'dash.kong': 'API Gateway (Kong)', 'dash.mysql': 'MySQL Database',
    'dash.redis': 'Redis Cache', 'dash.mongo': 'MongoDB Document DB',
    'dash.activeConn': 'Active Conn', 'dash.totalRequests': 'Total Requests',
    'dash.totalQueries': 'Total Queries', 'dash.clientsConn': 'Clients Connected',
    'dash.memUsed': 'Memory Used', 'dash.keyspaceHit': 'Keyspace Hit Rate',
    'dash.connCurrent': 'Connections Current', 'dash.opCount': 'Operation Count',
    'dash.sysLoad': 'System Load & API Gateway Telemetry',
    'dash.topApis': 'Top Requested API Gateway Endpoints', 'dash.slowApis': 'Slowest API Endpoints (Avg Latency)',
    'dash.method': 'Method', 'dash.apiPath': 'API Endpoint Path', 'dash.reqCount': 'Request Count (Last 5k)',
    'dash.avgLatency': 'Avg Latency', 'dash.samples': 'Samples',
    'dash.topRequestsBtn': 'Top Requests', 'dash.slowApisBtn': 'Slowest APIs',
    // Log Viewer
    'log.selectSource': 'Select a source...', 'log.last50': 'Last 50 lines', 'log.last100': 'Last 100 lines',
    'log.last200': 'Last 200 lines', 'log.last500': 'Last 500 lines',
    'log.copy': 'Copy', 'log.idle': 'Idle', 'log.selectContainer': 'Select a container to view its logs',
    // DB Viewer
    'db.tables': 'Tables', 'db.selectTable': 'Select a table',
    'db.keyBrowser': 'Key Browser', 'db.keys': 'Keys', 'db.selectKey': 'Select a key',
    'db.collections': 'Collections', 'db.selectCollection': 'Select a collection',
    'db.query': 'Query', 'db.addRow': 'Add Row', 'db.import': 'Import', 'db.addDoc': 'Add Document',
    // Modals
    'modal.cancel': 'Cancel', 'modal.save': 'Save', 'modal.optional': 'optional',
    'modal.insertMySQL': 'Insert into MySQL', 'modal.editMySQL': 'Edit Row in MySQL',
    'modal.insertMongo': 'Insert into MongoDB', 'modal.editMongo': 'Edit Document in MongoDB',
    // Topology
    'topo.title': 'Service Topology', 'topo.gateway': 'Gateway', 'topo.frontend': 'Frontend',
    'topo.data': 'Data', 'topo.pipeline': 'Pipeline', 'dash.stopped2': 'Stopped',
    // API Spec
    'api.kongRoutes': 'Kong Routes', 'api.backendUrl': 'Backend Target URL',
    'api.description': 'Description', 'api.expectedParams': 'Expected Parameters / Input Schema',
    'api.parameter': 'Parameter', 'api.location': 'Location', 'api.type': 'Type', 'api.mandatory': 'Mandatory', 'api.field': 'Field',
    'api.testBackdoor': 'Test Request Backdoor', 'api.sendRequest': 'Send Request',
    'api.responseLog': 'Response Log', 'api.responsePlaceholder': 'Response will appear here...', 'api.responseSchema': 'Response Schema',
    // Access Management
    'kc.realmUsers': 'Realm Users', 'kc.oauthClients': 'OAuth Clients', 'kc.rolesGroups': 'Roles & Groups',
    'kc.realmUsersSummary': 'Realm Users Summary', 'kc.searchUsers': 'Search users...',
    'kc.username': 'Username', 'kc.email': 'Email', 'kc.enabled': 'Enabled',
    'kc.roles': 'Roles', 'kc.groups': 'Groups', 'kc.details': 'Details', 'kc.viewJson': 'View JSON',
    'kc.registeredClients': 'Registered Clients', 'kc.clientId': 'Client ID',
    'kc.protocol': 'Protocol', 'kc.public': 'Public', 'kc.redirectUris': 'Redirect URIs',
    'kc.realmRoles': 'Realm Roles', 'kc.roleName': 'Role Name',
    'kc.userGroups': 'User Groups', 'kc.groupName': 'Group Name',
    // Pipeline
    'pipeline.title': 'Data Pipeline', 'pipeline.subtitle': 'Airflow — Bronze / Silver / Gold Lakehouse',
    'pipeline.runBtn': 'Run Pipeline', 'pipeline.lineage': 'Pipeline Lineage',
    'pipeline.columnMapping': 'Column Mapping',
    'pipeline.bronze': 'Bronze', 'pipeline.bronzeDesc': 'Raw MySQL dump',
    'pipeline.silver': 'Silver', 'pipeline.silverDesc': 'Clean & join',
    'pipeline.gold': 'Gold', 'pipeline.goldDesc': 'ML features',
    'pipeline.modelTrain': 'Model Train', 'pipeline.modelTrainDesc': 'LightFM → MinIO',
    'pipeline.bronzeToSilver': 'Bronze → Silver', 'pipeline.silverToGold': 'Silver → Gold',
    'pipeline.goldToModel': 'Gold → Model', 'pipeline.active': 'Active', 'pipeline.paused': 'Paused',
    // CI Pipeline & E2E
    'ci.allJobs': 'All Jobs', 'ci.allSpecs': 'All Specs',
    'ci.runPipeline': 'Run CI Pipeline', 'ci.runAllSpecs': 'Run All Specs',
    'ci.noRuns': 'No runs yet', 'ci.selectJob': 'Select a job to view details',
    'ci.selectSpec': 'Select a spec to view details',
    'ci.rawOutput': 'Raw Output', 'ci.expand': 'expand',
    'col.edit': 'Edit', 'col.delete': 'Delete', 'col.login': 'Login', 'col.logs': 'Logs',
  },
  ja: {
    'nav.dashboard': 'ダッシュボード', 'nav.containers': 'コンテナ一覧',
    'nav.logs': 'ログビューア', 'nav.topology': 'トポロジー',
    'nav.db': 'DBビューア', 'nav.api': 'API仕様',
    'nav.keycloak': 'アクセス管理', 'nav.model': 'モデル性能',
    'nav.ci': 'ローカルCIパイプライン', 'nav.tests': 'E2Eテスト',
    'nav.pipeline': 'データパイプライン', 'nav.vulnerability': 'セキュリティスキャン',
    'nav.mockten': 'Mockten', 'nav.backdoor': 'Mockten(裏口)',
    'header.autoRefresh': '自動更新', 'header.systemRestart': 'システム再起動',
    'title.dashboard': 'ダッシュボード', 'title.containers': 'コンテナ一覧',
    'title.logs': 'ログビューア', 'title.topology': 'サービストポロジー',
    'title.db': 'DBビューア', 'title.api': 'API仕様',
    'title.keycloak': 'アクセス管理', 'title.model': 'モデル性能',
    'title.ci': 'ローカルCIパイプライン', 'title.tests': 'E2Eテストランナー',
    'title.vulnerability': 'セキュリティスキャン', 'title.pipeline': 'データパイプライン',
    'col.status': 'ステータス', 'col.containerName': 'コンテナ名', 'col.image': 'イメージ',
    'col.cpu': 'CPU', 'col.memory': 'メモリ', 'col.uptime': '稼働時間', 'col.actions': '操作',
    'model.title': 'レコメンドモデル', 'model.status': 'ステータス',
    'model.trainedAt': '学習日時', 'model.lossFunc': '損失関数',
    'model.embeddings': '埋め込み次元', 'model.trainBtn': '↺ 今すぐ学習',
    'model.diagTitle': 'レコメンド診断',
    'col.rank': '順位', 'col.productId': '商品ID', 'col.productName': '商品名',
    'col.category': 'カテゴリ', 'col.score': 'スコア',
    'model.metricsTitle': '評価指標',
    'btn.run': '▶ 実行', 'btn.clear': 'クリア', 'btn.export': 'エクスポート',
    'btn.refresh': '更新', 'btn.search': '検索',
    'vuln.scanAll': '全スキャン', 'vuln.containerScan': 'コンテナスキャン',
    'vuln.report': 'レポート', 'vuln.rawLog': '生ログ',
    'pipeline.runHistory': '実行履歴', 'pipeline.stageTiming': 'ステージタイミング',
    'col.state': '状態', 'col.runId': '実行ID', 'col.started': '開始', 'col.ended': '終了',
    'col.duration': '所要時間', 'col.task': 'タスク', 'col.retries': 'リトライ',
    'dash.running': '実行中', 'dash.stopped': '停止 / 終了', 'dash.totalContainers': 'コンテナ合計',
    'dash.totalCpu': 'CPU使用率合計', 'dash.totalMemory': 'メモリ使用量合計',
    'dash.kong': 'APIゲートウェイ (Kong)', 'dash.mysql': 'MySQLデータベース',
    'dash.redis': 'Redisキャッシュ', 'dash.mongo': 'MongoDBドキュメントDB',
    'dash.activeConn': 'アクティブ接続', 'dash.totalRequests': '総リクエスト数',
    'dash.totalQueries': '総クエリ数', 'dash.clientsConn': '接続クライアント数',
    'dash.memUsed': 'メモリ使用量', 'dash.keyspaceHit': 'キャッシュヒット率',
    'dash.connCurrent': '現在の接続数', 'dash.opCount': '操作数',
    'dash.sysLoad': 'システム負荷 & APIゲートウェイテレメトリ',
    'dash.topApis': '上位リクエストAPIエンドポイント', 'dash.slowApis': '最も遅いAPIエンドポイント (平均レイテンシ)',
    'dash.method': 'メソッド', 'dash.apiPath': 'APIエンドポイント', 'dash.reqCount': 'リクエスト数 (直近5k)',
    'dash.avgLatency': '平均レイテンシ', 'dash.samples': 'サンプル数',
    'dash.topRequestsBtn': 'Top Requests', 'dash.slowApisBtn': '最も遅いAPI',
    'log.selectSource': 'ソースを選択...', 'log.last50': '直近50行', 'log.last100': '直近100行',
    'log.last200': '直近200行', 'log.last500': '直近500行',
    'log.copy': 'コピー', 'log.idle': '待機中', 'log.selectContainer': 'コンテナを選択してログを表示',
    'db.tables': 'テーブル', 'db.selectTable': 'テーブルを選択',
    'db.keyBrowser': 'キーブラウザ', 'db.keys': 'キー', 'db.selectKey': 'キーを選択',
    'db.collections': 'コレクション', 'db.selectCollection': 'コレクションを選択',
    'db.query': 'クエリ', 'db.addRow': '行を追加', 'db.import': 'インポート', 'db.addDoc': 'ドキュメントを追加',
    'modal.cancel': 'キャンセル', 'modal.save': '保存', 'modal.optional': '省略可',
    'modal.insertMySQL': 'MySQLに追加', 'modal.editMySQL': 'MySQLの行を編集',
    'modal.insertMongo': 'MongoDBに追加', 'modal.editMongo': 'MongoDBドキュメントを編集',
    'topo.title': 'サービストポロジー', 'topo.gateway': 'ゲートウェイ', 'topo.frontend': 'フロントエンド',
    'topo.data': 'データ', 'topo.pipeline': 'パイプライン', 'dash.stopped2': '停止',
    'api.kongRoutes': 'Kongルート', 'api.backendUrl': 'バックエンドURL',
    'api.description': '説明', 'api.expectedParams': '期待されるパラメータ / 入力スキーマ',
    'api.parameter': 'パラメータ', 'api.location': '場所', 'api.type': '型', 'api.mandatory': '必須', 'api.field': 'フィールド',
    'api.testBackdoor': 'テストリクエスト', 'api.sendRequest': 'リクエスト送信',
    'api.responseLog': 'レスポンスログ', 'api.responsePlaceholder': 'レスポンスがここに表示されます...', 'api.responseSchema': 'レスポンススキーマ',
    'kc.realmUsers': 'レルムユーザー', 'kc.oauthClients': 'OAuthクライアント', 'kc.rolesGroups': 'ロール＆グループ',
    'kc.realmUsersSummary': 'レルムユーザー一覧', 'kc.searchUsers': 'ユーザーを検索...',
    'kc.username': 'ユーザー名', 'kc.email': 'メール', 'kc.enabled': '有効',
    'kc.roles': 'ロール', 'kc.groups': 'グループ', 'kc.details': '詳細', 'kc.viewJson': 'JSON表示',
    'kc.registeredClients': '登録済みクライアント', 'kc.clientId': 'クライアントID',
    'kc.protocol': 'プロトコル', 'kc.public': 'パブリック', 'kc.redirectUris': 'リダイレクトURI',
    'kc.realmRoles': 'レルムロール', 'kc.roleName': 'ロール名',
    'kc.userGroups': 'ユーザーグループ', 'kc.groupName': 'グループ名',
    'pipeline.title': 'データパイプライン', 'pipeline.subtitle': 'Airflow — ブロンズ / シルバー / ゴールド',
    'pipeline.runBtn': 'パイプライン実行', 'pipeline.lineage': 'パイプライン系譜',
    'pipeline.columnMapping': 'カラムマッピング',
    'pipeline.bronze': 'ブロンズ', 'pipeline.bronzeDesc': 'MySQL生データ',
    'pipeline.silver': 'シルバー', 'pipeline.silverDesc': 'クリーン＆結合',
    'pipeline.gold': 'ゴールド', 'pipeline.goldDesc': 'ML特徴量',
    'pipeline.modelTrain': 'モデル学習', 'pipeline.modelTrainDesc': 'LightFM → MinIO',
    'pipeline.bronzeToSilver': 'ブロンズ → シルバー', 'pipeline.silverToGold': 'シルバー → ゴールド',
    'pipeline.goldToModel': 'ゴールド → モデル', 'pipeline.active': 'アクティブ', 'pipeline.paused': '一時停止',
    'ci.allJobs': '全ジョブ', 'ci.allSpecs': '全スペック',
    'ci.runPipeline': 'CIパイプライン実行', 'ci.runAllSpecs': '全スペック実行',
    'ci.noRuns': '実行履歴なし', 'ci.selectJob': 'ジョブを選択して詳細を表示',
    'ci.selectSpec': 'スペックを選択して詳細を表示',
    'ci.rawOutput': '生ログ出力', 'ci.expand': '展開',
    'col.edit': '編集', 'col.delete': '削除', 'col.login': 'ログイン', 'col.logs': 'ログ',
  },
  zh: {
    'nav.dashboard': '仪表盘', 'nav.containers': '容器列表',
    'nav.logs': '日志查看', 'nav.topology': '拓扑图',
    'nav.db': '数据库查看', 'nav.api': 'API规范',
    'nav.keycloak': '访问管理', 'nav.model': '模型性能',
    'nav.ci': '本地CI流水线', 'nav.tests': 'E2E测试',
    'nav.pipeline': '数据管道', 'nav.vulnerability': '安全扫描',
    'nav.mockten': 'Mockten', 'nav.backdoor': 'Mockten(后门)',
    'header.autoRefresh': '自动刷新', 'header.systemRestart': '重启系统',
    'title.dashboard': '仪表盘', 'title.containers': '容器列表',
    'title.logs': '日志查看器', 'title.topology': '服务拓扑',
    'title.db': '数据库查看器', 'title.api': 'API规范',
    'title.keycloak': '访问管理', 'title.model': '模型性能',
    'title.ci': '本地CI流水线', 'title.tests': 'E2E测试运行器',
    'title.vulnerability': '安全扫描', 'title.pipeline': '数据管道',
    'col.status': '状态', 'col.containerName': '容器名称', 'col.image': '镜像',
    'col.cpu': 'CPU', 'col.memory': '内存', 'col.uptime': '运行时间', 'col.actions': '操作',
    'model.title': '推荐模型', 'model.status': '状态',
    'model.trainedAt': '训练时间', 'model.lossFunc': '损失函数',
    'model.embeddings': '嵌入维度', 'model.trainBtn': '↺ 立即训练',
    'model.diagTitle': '推荐诊断',
    'col.rank': '排名', 'col.productId': '商品ID', 'col.productName': '商品名称',
    'col.category': '类别', 'col.score': '得分',
    'model.metricsTitle': '评估指标',
    'btn.run': '▶ 运行', 'btn.clear': '清除', 'btn.export': '导出',
    'btn.refresh': '刷新', 'btn.search': '搜索',
    'vuln.scanAll': '全部扫描', 'vuln.containerScan': '容器扫描',
    'vuln.report': '报告', 'vuln.rawLog': '原始日志',
    'pipeline.runHistory': '运行历史', 'pipeline.stageTiming': '阶段耗时',
    'col.state': '状态', 'col.runId': '运行ID', 'col.started': '开始时间', 'col.ended': '结束时间',
    'col.duration': '总耗时', 'col.task': '任务', 'col.retries': '重试次数',
    'dash.running': '运行中', 'dash.stopped': '已停止 / 已退出', 'dash.totalContainers': '容器总数',
    'dash.totalCpu': 'CPU总使用率', 'dash.totalMemory': '内存总使用量',
    'dash.kong': 'API网关 (Kong)', 'dash.mysql': 'MySQL数据库',
    'dash.redis': 'Redis缓存', 'dash.mongo': 'MongoDB文档数据库',
    'dash.activeConn': '活跃连接数', 'dash.totalRequests': '总请求数',
    'dash.totalQueries': '总查询数', 'dash.clientsConn': '已连接客户端',
    'dash.memUsed': '内存使用量', 'dash.keyspaceHit': '缓存命中率',
    'dash.connCurrent': '当前连接数', 'dash.opCount': '操作次数',
    'dash.sysLoad': '系统负载 & API网关遥测',
    'dash.topApis': '最常请求的API端点', 'dash.slowApis': '最慢的API端点（平均延迟）',
    'dash.method': '方法', 'dash.apiPath': 'API端点路径', 'dash.reqCount': '请求数 (最近5k)',
    'dash.avgLatency': '平均延迟', 'dash.samples': '样本数',
    'dash.topRequestsBtn': '热门请求', 'dash.slowApisBtn': '最慢API',
    'log.selectSource': '选择来源...', 'log.last50': '最近50行', 'log.last100': '最近100行',
    'log.last200': '最近200行', 'log.last500': '最近500行',
    'log.copy': '复制', 'log.idle': '空闲', 'log.selectContainer': '选择容器以查看日志',
    'db.tables': '表', 'db.selectTable': '选择表',
    'db.keyBrowser': '键浏览器', 'db.keys': '键', 'db.selectKey': '选择键',
    'db.collections': '集合', 'db.selectCollection': '选择集合',
    'db.query': '查询', 'db.addRow': '添加行', 'db.import': '导入', 'db.addDoc': '添加文档',
    'modal.cancel': '取消', 'modal.save': '保存', 'modal.optional': '可选',
    'modal.insertMySQL': '插入MySQL', 'modal.editMySQL': '编辑MySQL行',
    'modal.insertMongo': '插入MongoDB', 'modal.editMongo': '编辑MongoDB文档',
    'topo.title': '服务拓扑', 'topo.gateway': '网关', 'topo.frontend': '前端',
    'topo.data': '数据', 'topo.pipeline': '管道', 'dash.stopped2': '已停止',
    'api.kongRoutes': 'Kong路由', 'api.backendUrl': '后端目标URL',
    'api.description': '描述', 'api.expectedParams': '预期参数 / 输入架构',
    'api.parameter': '参数', 'api.location': '位置', 'api.type': '类型', 'api.mandatory': '必填', 'api.field': '字段',
    'api.testBackdoor': '测试请求', 'api.sendRequest': '发送请求',
    'api.responseLog': '响应日志', 'api.responsePlaceholder': '响应将在此处显示...', 'api.responseSchema': '响应架构',
    'kc.realmUsers': '域用户', 'kc.oauthClients': 'OAuth客户端', 'kc.rolesGroups': '角色和组',
    'kc.realmUsersSummary': '域用户列表', 'kc.searchUsers': '搜索用户...',
    'kc.username': '用户名', 'kc.email': '邮箱', 'kc.enabled': '启用',
    'kc.roles': '角色', 'kc.groups': '组', 'kc.details': '详情', 'kc.viewJson': '查看JSON',
    'kc.registeredClients': '已注册客户端', 'kc.clientId': '客户端ID',
    'kc.protocol': '协议', 'kc.public': '公开', 'kc.redirectUris': '重定向URI',
    'kc.realmRoles': '域角色', 'kc.roleName': '角色名',
    'kc.userGroups': '用户组', 'kc.groupName': '组名',
    'pipeline.title': '数据管道', 'pipeline.subtitle': 'Airflow — 青铜 / 白银 / 黄金',
    'pipeline.runBtn': '运行管道', 'pipeline.lineage': '管道血缘',
    'pipeline.columnMapping': '列映射',
    'pipeline.bronze': '青铜', 'pipeline.bronzeDesc': 'MySQL原始数据',
    'pipeline.silver': '白银', 'pipeline.silverDesc': '清洗与合并',
    'pipeline.gold': '黄金', 'pipeline.goldDesc': 'ML特征',
    'pipeline.modelTrain': '模型训练', 'pipeline.modelTrainDesc': 'LightFM → MinIO',
    'pipeline.bronzeToSilver': '青铜 → 白银', 'pipeline.silverToGold': '白银 → 黄金',
    'pipeline.goldToModel': '黄金 → 模型', 'pipeline.active': '活跃', 'pipeline.paused': '已暂停',
    'ci.allJobs': '所有任务', 'ci.allSpecs': '所有测试',
    'ci.runPipeline': '运行CI流水线', 'ci.runAllSpecs': '运行所有测试',
    'ci.noRuns': '暂无运行记录', 'ci.selectJob': '选择任务查看详情',
    'ci.selectSpec': '选择测试查看详情',
    'ci.rawOutput': '原始日志', 'ci.expand': '展开',
    'col.edit': '编辑', 'col.delete': '删除', 'col.login': '登录', 'col.logs': '日志',
  },
};
// ── First product ID cache ────────────────────────────────────────────────────
let _firstProductIdCache = null;
let _firstProductNameCache = null;
async function _fetchFirstProduct() {
  if (_firstProductIdCache) return;
  try {
    const r = await fetch('/api/search');
    const d = await r.json();
    const item = d.items?.[0];
    if (item) {
      _firstProductIdCache = item.product_id || '';
      _firstProductNameCache = item.product_name || '';
    }
  } catch {}
}
async function _getFirstProductId() {
  await _fetchFirstProduct();
  return _firstProductIdCache || '';
}
async function _getFirstProductName() {
  await _fetchFirstProduct();
  return _firstProductNameCache || '';
}

// ── Superadmin email cache ────────────────────────────────────────────────────
let _superadminEmailCache = null;
async function _fetchSuperadminEmail() {
  if (_superadminEmailCache) return;
  try {
    const tr = await fetch('/dashboard/api/superadmin-token');
    if (!tr.ok) return;
    const td = await tr.json();
    const r = await fetch('/api/uam/userinfo', { headers: { Authorization: `Bearer ${td.token}` } });
    if (!r.ok) return;
    const d = await r.json();
    _superadminEmailCache = d.email || d.preferred_username || '';
  } catch {}
}

// ── First geo ID cache ────────────────────────────────────────────────────────
let _firstGeoIdCache = null;
async function _fetchFirstGeoId() {
  if (_firstGeoIdCache) return;
  await _fetchSuperadminEmail();
  if (!_superadminEmailCache) return;
  try {
    const tr = await fetch('/dashboard/api/superadmin-token');
    if (!tr.ok) return;
    const td = await tr.json();
    const r = await fetch(`/api/geo?user_id=${encodeURIComponent(_superadminEmailCache)}`, {
      headers: { Authorization: `Bearer ${td.token}` }
    });
    if (!r.ok) return;
    const d = await r.json();
    const first = Array.isArray(d) ? d[0] : null;
    if (first) _firstGeoIdCache = first.geo_id || '';
  } catch {}
}

// ── Kong API stats ───────────────────────────────────────────────────────────
let _kongTopApis = [];
let _kongSlowApis = [];
let _kongView = 'top'; // 'top' | 'slow'

function _methodBadge(method) {
  const styles = {
    GET: 'background:var(--blue-bg); color:var(--blue);',
    POST: 'background:var(--green-bg); color:var(--green);',
    PUT: 'background:rgba(217,119,6,0.15); color:#d97706;',
    DELETE: 'background:var(--red-bg); color:var(--red);',
  };
  return `<span class="badge" style="padding:2px 8px; font-size:10px; ${styles[method] || 'background:var(--bg-elevated);color:var(--text-muted);'}">${method}</span>`;
}

function renderKongTable() {
  const tbody = document.getElementById('kong-top-apis-tbody');
  const thead = document.getElementById('kong-table-head');
  const title = document.getElementById('kong-table-title');
  if (!tbody) return;
  const dict = I18N[_currentLang] || I18N.en;

  if (_kongView === 'top') {
    if (title) { title.textContent = dict['dash.topApis'] || 'Top Requested API Gateway Endpoints'; title.removeAttribute('data-i18n'); }
    if (thead) thead.innerHTML = `<tr>
      <th style="width:120px;">${dict['dash.method'] || 'Method'}</th>
      <th>${dict['dash.apiPath'] || 'API Endpoint Path'}</th>
      <th style="width:220px;">${dict['dash.reqCount'] || 'Request Count (Last 5k)'}</th>
    </tr>`;
    if (_kongTopApis.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px;">No requests recorded yet.</td></tr>`;
    } else {
      tbody.innerHTML = _kongTopApis.slice(0, 10).map(api => `
        <tr>
          <td>${_methodBadge(api.method)}</td>
          <td><code style="font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--text-secondary);">${api.path}</code></td>
          <td><strong>${api.count.toLocaleString()}</strong> requests</td>
        </tr>`).join('');
    }
  } else {
    if (title) { title.textContent = dict['dash.slowApis'] || 'Slowest API Endpoints (Avg Latency)'; title.removeAttribute('data-i18n'); }
    if (thead) thead.innerHTML = `<tr>
      <th style="width:120px;">${dict['dash.method'] || 'Method'}</th>
      <th>${dict['dash.apiPath'] || 'API Endpoint Path'}</th>
      <th style="width:160px;">${dict['dash.avgLatency'] || 'Avg Latency'}</th>
      <th style="width:100px;">${dict['dash.samples'] || 'Samples'}</th>
    </tr>`;
    if (_kongSlowApis.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">No latency data yet (requires ≥3 requests per endpoint).</td></tr>`;
    } else {
      tbody.innerHTML = _kongSlowApis.slice(0, 10).map(api => `
        <tr>
          <td>${_methodBadge(api.method)}</td>
          <td><code style="font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--text-secondary);">${api.path}</code></td>
          <td><strong style="color:${api.avgMs > 500 ? 'var(--red)' : api.avgMs > 200 ? '#d97706' : 'var(--green)'}">${api.avgMs} ms</strong></td>
          <td style="color:var(--text-muted);">${api.sampleCount}</td>
        </tr>`).join('');
    }
  }

  // Update toggle button styles
  const btnTop = document.getElementById('btn-top-requests');
  const btnSlow = document.getElementById('btn-slow-apis');
  if (btnTop) btnTop.className = _kongView === 'top' ? 'btn-modal-confirm' : 'btn-modal-cancel';
  if (btnSlow) btnSlow.className = _kongView === 'slow' ? 'btn-modal-confirm' : 'btn-modal-cancel';
  if (btnTop) btnTop.style.cssText = 'padding:4px 12px; font-size:11px;';
  if (btnSlow) btnSlow.style.cssText = 'padding:4px 12px; font-size:11px;';
}

function switchKongView(view) {
  _kongView = view;
  renderKongTable();
}

let _currentLang = localStorage.getItem('ui_lang') || 'en';

function setLang(lang) {
  _currentLang = lang;
  localStorage.setItem('ui_lang', lang);
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`lang-${lang}`);
  if (btn) btn.classList.add('active');
  applyLang();
}

function applyLang() {
  const dict = I18N[_currentLang] || I18N.en;
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  // Re-render metric cards if visible (picks up translated desc)
  const grid = document.getElementById('model-metrics-grid');
  if (grid && grid.children.length > 0) fetchModelMetrics();

  // Re-render API description if a route is selected
  if (_currentApiRoute) {
    const descText = document.getElementById('api-description-text');
    const descContainer = document.getElementById('api-description-container');
    if (descText && descContainer) {
      const desc = findApiDescription(_currentApiRoute.method, _currentApiRoute.path);
      if (desc) { descText.innerHTML = desc; descContainer.style.display = 'block'; }
      else { descContainer.style.display = 'none'; }
    }
  }

  // Re-render container table immediately so Login/Logs buttons update
  if (allContainers.length > 0) renderTable(allContainers);

  // Re-render Kong API table with translated headers/title
  renderKongTable();

  // Re-render API spec panel with current language
  if (selectedSIdx !== null && selectedRIdx !== null) {
    selectApiRoute(selectedSIdx, selectedRIdx);
  }
}

// ── Sidebar: drag-to-reorder + pin ────────────────────────────────────────
let _dragSrc = null;
let _navPins = new Set(JSON.parse(localStorage.getItem('nav_pins') || '[]'));
let _navOrder = JSON.parse(localStorage.getItem('nav_order') || 'null');

function initSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  // Restore order
  if (_navOrder && _navOrder.length) {
    const items = [...nav.querySelectorAll('.nav-item[data-key]')];
    const map = Object.fromEntries(items.map(el => [el.dataset.key, el]));
    _navOrder.forEach(key => { if (map[key]) nav.appendChild(map[key]); });
  }

  // Restore pins (visual + reorder pinned to top)
  _applyPins();

  // Drag events
  nav.querySelectorAll('.nav-item[draggable]').forEach(item => {
    item.addEventListener('dragstart', e => {
      _dragSrc = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      nav.querySelectorAll('.nav-item').forEach(i => i.classList.remove('drag-over'));
      _saveNavOrder();
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (item !== _dragSrc) item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (_dragSrc && _dragSrc !== item) {
        const items = [...nav.querySelectorAll('.nav-item[data-key]')];
        const fromIdx = items.indexOf(_dragSrc);
        const toIdx = items.indexOf(item);
        if (fromIdx < toIdx) nav.insertBefore(_dragSrc, item.nextSibling);
        else nav.insertBefore(_dragSrc, item);
        _applyPins();
      }
    });
  });
}

function _saveNavOrder() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  const order = [...nav.querySelectorAll('.nav-item[data-key]')].map(el => el.dataset.key);
  localStorage.setItem('nav_order', JSON.stringify(order));
  _navOrder = order;
}

function _applyPins() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  // Remove existing divider
  nav.querySelectorAll('.nav-pin-divider').forEach(d => d.remove());
  // Update pin star styles
  nav.querySelectorAll('.nav-item[data-key]').forEach(el => {
    const key = el.dataset.key;
    const pinEl = el.querySelector('.nav-pin');
    if (_navPins.has(key)) {
      el.classList.add('pinned');
      if (pinEl) pinEl.textContent = '★';
    } else {
      el.classList.remove('pinned');
      if (pinEl) pinEl.textContent = '☆';
    }
  });
  // Move pinned items to top
  const items = [...nav.querySelectorAll('.nav-item[data-key]')];
  const pinned = items.filter(el => _navPins.has(el.dataset.key));
  const unpinned = items.filter(el => !_navPins.has(el.dataset.key));
  pinned.forEach(el => nav.insertBefore(el, nav.firstChild));
  // Insert divider after pinned if any
  if (pinned.length > 0 && unpinned.length > 0) {
    const div = document.createElement('div');
    div.className = 'nav-pin-divider';
    nav.insertBefore(div, unpinned[0]);
  }
}

function toggleNavPin(e, key) {
  e.preventDefault();
  e.stopPropagation();
  if (_navPins.has(key)) _navPins.delete(key);
  else _navPins.add(key);
  localStorage.setItem('nav_pins', JSON.stringify([..._navPins]));
  _applyPins();
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  setLang(_currentLang);
});
