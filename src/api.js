import { API_BASE } from './apiBase';

const BASE = API_BASE;

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

/* ── Exercise Catalog ── */
export const getExercises = (category) => {
  const url = category
    ? `${BASE}/exercises?category=${encodeURIComponent(category)}`
    : `${BASE}/exercises`;
  return fetch(url, { headers: authHeaders() }).then(handleResponse);
};

/* ── Workout Splits ── */
export const getSplits = () =>
  fetch(`${BASE}/splits`, { headers: authHeaders() }).then(handleResponse);

//3333232322


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

/* ── Profile ── */
export const getProfile = () =>
  fetch(`${BASE}/profile`, { headers: authHeaders() }).then(handleResponse);

export const updateProfile = (payload) =>
  fetch(`${BASE}/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const getStreak = () =>
  fetch(`${BASE}/streak`, { headers: authHeaders() }).then(handleResponse);

/* ── Friends ── */
export const searchUsers = (q) =>
  fetch(`${BASE}/users/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() }).then(handleResponse);

export const getFriends = () =>
  fetch(`${BASE}/friends`, { headers: authHeaders() }).then(handleResponse);

export const getFriendRequests = () =>
  fetch(`${BASE}/friends/requests`, { headers: authHeaders() }).then(handleResponse);

export const sendFriendRequest = (userId) =>
  fetch(`${BASE}/friends`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ user_id: userId }),
  }).then(handleResponse);

export const acceptFriendRequest = (friendshipId) =>
  fetch(`${BASE}/friends/${friendshipId}/accept`, {
    method: 'PUT',
    headers: authHeaders(),
  }).then(handleResponse);

export const declineFriendRequest = (friendshipId) =>
  fetch(`${BASE}/friends/${friendshipId}/decline`, {
    method: 'PUT',
    headers: authHeaders(),
  }).then(handleResponse);

export const removeFriend = (friendshipId) =>
  fetch(`${BASE}/friends/${friendshipId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handleResponse);

