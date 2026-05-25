const api = (typeof browser !== 'undefined') ? browser : chrome;

const $ = (id) => document.getElementById(id);

function fmtHours(h, decimals = 1) {
  if (!isFinite(h)) return '—';
  return h.toFixed(decimals);
}

function fmtRelativeTime(ts) {
  if (!ts) return '—';

  const diff = Math.floor((Date.now() - ts) / 1000);

  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;

  return `il y a ${Math.floor(diff / 3600)}h`;
}

function renderStats(stats) {
  $('goal-display').textContent = `${stats.monthlyGoal} h`;

  $('daily-target').textContent =
    `${fmtHours(stats.dailyTarget, 2)} h`;

  $('done').textContent =
    `${fmtHours(stats.doneHours)} h`;

  $('expected').textContent =
    `${fmtHours(stats.expectedHours)} h`;

  const delta = stats.delta;

  const deltaEl = $('delta');

  deltaEl.classList.remove(
    'positive',
    'negative',
    'zero'
  );

  if (Math.abs(delta) < 0.05) {
    deltaEl.classList.add('zero');

    $('delta-sign').textContent = '·';
    $('delta-value').textContent = '0.0';

    $('status-label').textContent =
      'pile à l’heure';

  } else if (delta > 0) {

    deltaEl.classList.add('positive');

    $('delta-sign').textContent = '+';
    $('delta-value').textContent =
      fmtHours(delta);

    $('status-label').textContent =
      'avance';

  } else {

    deltaEl.classList.add('negative');

    $('delta-sign').textContent = '−';
    $('delta-value').textContent =
      fmtHours(Math.abs(delta));

    $('status-label').textContent =
      'retard';
  }

  $('last-sync').textContent =
    fmtRelativeTime(stats.fetchedAt);
}

function renderError(msg) {
  $('delta-sign').textContent = '!';
  $('delta-value').textContent = 'err';

  $('status-label').textContent =
    msg || 'error';
}

async function loadStats() {

  try {

    const resp =
      await api.runtime.sendMessage({
        type: 'GET_STATS'
      });

    if (!resp || !resp.ok) {

      // Pas configuré → ouvrir settings
      if (
        resp?.error &&
        (
          resp.error.includes('Missing') ||
          resp.error.includes('credentials')
        )
      ) {

        api.runtime.openOptionsPage();

        $('status-label').textContent =
          'configuration requise';

        return;
      }

      renderError(resp?.error || 'error');
      return;
    }

    renderStats(resp.stats);

  } catch (e) {

    renderError(e.message);
  }
}

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    $('btn-refresh')
      .addEventListener('click', loadStats);

    $('btn-settings')
      .addEventListener('click', () => {
        api.runtime.openOptionsPage();
      });

    await loadStats();
  }
);