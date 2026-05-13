// Cross-browser compatibility (Firefox uses `browser`, Chrome uses `chrome`)
const api = (typeof browser !== 'undefined') ? browser : chrome;

const API_BASE = 'https://api.intra.42.fr';
const TOKEN_URL = `${API_BASE}/oauth/token`;

/**
 * Get a valid access token. Re-uses cached token if still valid.
 * Tokens expire in 7200s; we treat them as expired 60s early.
 */
async function getAccessToken() {
  const { uid, secret, tokenCache } = await api.storage.local.get(['uid', 'secret', 'tokenCache']);

  if (!uid || !secret) {
    throw new Error('Missing credentials. Open settings.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expires_at > now + 60) {
    return tokenCache.access_token;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: uid,
    client_secret: secret,
    scope: 'public'
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OAuth failed (${res.status}): ${txt.slice(0, 100)}`);
  }

  const data = await res.json();
  const cache = {
    access_token: data.access_token,
    expires_at: data.created_at + data.expires_in
  };
  await api.storage.local.set({ tokenCache: cache });
  return data.access_token;
}

/**
 * Fetch raw locations_stats for a given month window.
 * Returns the dict { "YYYY-MM-DD": "HH:MM:SS.fraction" }
 */
async function fetchLocationsStats(login, beginAt, endAt) {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}/v2/users/${encodeURIComponent(login)}/locations_stats`);
  url.searchParams.set('begin_at', beginAt);
  url.searchParams.set('end_at', endAt);

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.status === 401) {
    // Token might have been revoked; clear cache and retry once
    await api.storage.local.remove('tokenCache');
    const token2 = await getAccessToken();
    const res2 = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    if (!res2.ok) throw new Error(`API error ${res2.status}`);
    return res2.json();
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API error ${res.status}: ${txt.slice(0, 100)}`);
  }

  return res.json();
}

/**
 * Parse a "HH:MM:SS.fraction" string into hours (float).
 */
function parseDuration(str) {
  if (!str || typeof str !== 'string') return 0;
  const [h, m, s] = str.split(':');
  return (parseInt(h, 10) || 0) + (parseInt(m, 10) || 0) / 60 + (parseFloat(s) || 0) / 3600;
}

/**
 * Compute logtime stats for the current calendar month.
 */
async function computeMonthStats() {
  const { login, monthlyGoal } = await api.storage.local.get(['login', 'monthlyGoal']);
  if (!login) throw new Error('Missing login. Open settings.');
  if (!monthlyGoal) throw new Error('Missing monthly goal.');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const currentDay = now.getDate();

  // ISO date range; locations_stats uses YYYY-MM-DD bounds
  const pad = (n) => String(n).padStart(2, '0');
  const beginAt = `${year}-${pad(month + 1)}-01`;
  const endAt = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

  const stats = await fetchLocationsStats(login, beginAt, endAt);

  // Sum hours done so far (only for days that have data this month).
  // locations_stats may return dates from before/after our window depending on API behavior;
  // filter strictly to current month.
  let doneHours = 0;
  for (const [date, duration] of Object.entries(stats)) {
    if (date >= beginAt && date <= endAt) {
      doneHours += parseDuration(duration);
    }
  }

  const dailyTarget = monthlyGoal / daysInMonth;
  // Expected hours by end of *today* (counting today as a full day to track).
  // Convention: by end of day N, you should have N * daily_target hours.
  const expectedHours = dailyTarget * currentDay;
  const delta = doneHours - expectedHours;

  return {
    monthlyGoal,
    daysInMonth,
    currentDay,
    dailyTarget,
    doneHours,
    expectedHours,
    delta,
    fetchedAt: Date.now()
  };
}

// Message router from popup
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'GET_STATS') {
        const stats = await computeMonthStats();
        sendResponse({ ok: true, stats });
      } else if (msg.type === 'TEST_CREDS') {
        // Force a fresh token fetch to test creds
        await api.storage.local.remove('tokenCache');
        await getAccessToken();
        // Also test that the login exists
        const token = await getAccessToken();
        const r = await fetch(`${API_BASE}/v2/users/${encodeURIComponent(msg.login)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!r.ok) throw new Error(`User '${msg.login}' not found (${r.status})`);
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: 'Unknown message type' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message || String(e) });
    }
  })();
  return true; // async response
});
