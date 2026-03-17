const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');

export const API_BASE = normalizedApiUrl
  ? `${normalizedApiUrl}/api`
  : '/api';
