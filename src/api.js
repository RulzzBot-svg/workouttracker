const BASE = '/api';

const getToken = () => localStorage.getItem('wt_token');

const authHeaders = () => {
  const t = getToken();
  return t
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
    : { 'Content-Type': 'application/json' };
};

const handleResponse = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
};

/* ── Auth ── */
export const register = (payload) =>
  fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const login = (payload) =>
  fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const getMe = () =>
  fetch(`${BASE}/auth/me`, { headers: authHeaders() }).then(handleResponse);

/* ── Workout History ── */
export const getHistory = () =>
  fetch(`${BASE}/history`, { headers: authHeaders() }).then(handleResponse);

export const saveHistoryEntry = (entry) =>
  fetch(`${BASE}/history`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(entry),
  }).then(handleResponse);

/* ── Workout Splits ── */
export const getSplits = () =>
  fetch(`${BASE}/splits`, { headers: authHeaders() }).then(handleResponse);

export const createSplit = (payload) =>
  fetch(`${BASE}/splits`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const updateSplit = (id, payload) =>
  fetch(`${BASE}/splits/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const deleteSplit = (id) =>
  fetch(`${BASE}/splits/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handleResponse);

export const activateSplit = (id) =>
  fetch(`${BASE}/splits/${id}/activate`, {
    method: 'PUT',
    headers: authHeaders(),
  }).then(handleResponse);

