const BASE = '/api';

const handleResponse = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
};

/* ── Workout History ── */
export const getHistory = () =>
  fetch(`${BASE}/history`).then(handleResponse);

export const saveHistoryEntry = (entry) =>
  fetch(`${BASE}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).then(handleResponse);

/* ── Workout Splits ── */
export const getSplits = () =>
  fetch(`${BASE}/splits`).then(handleResponse);

export const createSplit = (payload) =>
  fetch(`${BASE}/splits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const updateSplit = (id, payload) =>
  fetch(`${BASE}/splits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const deleteSplit = (id) =>
  fetch(`${BASE}/splits/${id}`, { method: 'DELETE' }).then(handleResponse);

export const activateSplit = (id) =>
  fetch(`${BASE}/splits/${id}/activate`, { method: 'PUT' }).then(handleResponse);
