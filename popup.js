const api = (typeof browser !== 'undefined') ? browser : chrome;

const $ = (id) => document.getElementById(id);

// --- View management ---
function showView(name) {
  ['main', 'settings', 'loading'].forEach(v => {
    $(`view-${v}`).classList.toggle('hidden', v !== name);
  });
}

// --- Formatting helpers ---
function fmtHours(h, decimals = 1) {
  if (!isFinite(h)) return '—';
  return h.toFixed(decimals);
}

function fmtRelativeTime(ts) {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

// --- Main view rendering ---
function renderStats(stats) {
  $('goal-display').textContent = `${stats.monthlyGoal} h`;
  $('daily-target').textContent = `${fmtHours(stats.dailyTarget, 2)} h`;
  $('done').textContent = `${fmtHours(stats.doneHours)} h`;
  $('expected').textContent = `${fmtHours(stats.expectedHours)} h`;
  $('day-progress').textContent = `${stats.currentDay} / ${stats.daysInMonth}`;

  const delta = stats.delta;
  const deltaEl = $('delta');
  const signEl = $('delta-sign');
  const valEl = $('delta-value');
  const statusEl = $('status-label');

  deltaEl.classList.remove('positive', 'negative', 'zero');

  if (Math.abs(delta) < 0.05) {
    deltaEl.classList.add('zero');
    signEl.textContent = '·';
    valEl.textContent = '0.0';
    statusEl.textContent = 'pile à l\'heure';
  } else if (delta > 0) {
    deltaEl.classList.add('positive');
    signEl.textContent = '+';
    valEl.textContent = fmtHours(delta);
    statusEl.textContent = 'avance';
  } else {
    deltaEl.classList.add('negative');
    signEl.textContent = '−';
    valEl.textContent = fmtHours(Math.abs(delta));
    statusEl.textContent = 'retard';
  }

  $('last-sync').textContent = fmtRelativeTime(stats.fetchedAt);
}

function renderError(msg) {
  $('goal-display').textContent = '—';
  $('daily-target').textContent = '— h';
  $('done').textContent = '— h';
  $('expected').textContent = '— h';
  $('day-progress').textContent = '— / —';

  const deltaEl = $('delta');
  deltaEl.classList.remove('positive', 'negative', 'zero');
  $('delta-sign').textContent = '!';
  $('delta-value').textContent = 'err';
  $('status-label').textContent = msg.slice(0, 40);
  $('last-sync').textContent = 'échec';
}

// --- Load + display stats ---
async function loadStats() {
  showView('loading');
  try {
    const resp = await api.runtime.sendMessage({ type: 'GET_STATS' });
    if (!resp || !resp.ok) {
      // If creds missing, jump straight to settings
      if (resp && /Missing/i.test(resp.error || '')) {
        showView('settings');
        await populateSettings();
        $('settings-status').textContent = 'configure tes infos pour commencer';
        $('settings-status').className = 'settings-status';
        return;
      }
      showView('main');
      renderError(resp ? resp.error : 'no response');
      return;
    }
    showView('main');
    renderStats(resp.stats);
  } catch (e) {
    showView('main');
    renderError(e.message || String(e));
  }
}

// --- Settings ---
async function populateSettings() {
  const { login, uid, secret, monthlyGoal } = await api.storage.local.get([
    'login', 'uid', 'secret', 'monthlyGoal'
  ]);
  $('input-login').value = login || '';
  $('input-uid').value = uid || '';
  $('input-secret').value = secret || '';
  $('input-goal').value = monthlyGoal || '';
}

async function saveSettings() {
  const login = $('input-login').value.trim();
  const uid = $('input-uid').value.trim();
  const secret = $('input-secret').value.trim();
  const monthlyGoal = parseFloat($('input-goal').value);

  const status = $('settings-status');

  if (!login || !uid || !secret || !monthlyGoal || monthlyGoal <= 0) {
    status.textContent = 'tous les champs sont requis';
    status.className = 'settings-status err';
    return false;
  }

  await api.storage.local.set({ login, uid, secret, monthlyGoal });
  // Clear cached token in case creds changed
  await api.storage.local.remove('tokenCache');

  status.textContent = 'sauvegardé';
  status.className = 'settings-status ok';
  return true;
}

async function testCreds() {
  const status = $('settings-status');
  status.textContent = 'test en cours...';
  status.className = 'settings-status';

  // Save first (test uses stored creds)
  const ok = await saveSettings();
  if (!ok) return;

  const login = $('input-login').value.trim();
  try {
    const resp = await api.runtime.sendMessage({ type: 'TEST_CREDS', login });
    if (resp && resp.ok) {
      status.textContent = `ok — token + login '${login}' validés`;
      status.className = 'settings-status ok';
    } else {
      status.textContent = `échec: ${resp ? resp.error : 'no response'}`;
      status.className = 'settings-status err';
    }
  } catch (e) {
    status.textContent = `échec: ${e.message}`;
    status.className = 'settings-status err';
  }
}

// --- Event wiring ---
document.addEventListener('DOMContentLoaded', async () => {
  $('btn-settings').addEventListener('click', async () => {
    showView('settings');
    await populateSettings();
    $('settings-status').textContent = '';
    $('settings-status').className = 'settings-status';
  });

  $('btn-back').addEventListener('click', () => {
    loadStats();
  });

  $('btn-save').addEventListener('click', async () => {
    const ok = await saveSettings();
    if (ok) {
      // Brief delay so user sees the "saved" message, then load
      setTimeout(() => loadStats(), 400);
    }
  });

  $('btn-test').addEventListener('click', testCreds);

  $('btn-refresh').addEventListener('click', loadStats);

  await loadStats();
});
