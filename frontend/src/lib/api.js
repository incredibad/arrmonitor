const BASE = '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include', // always send cookies
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  getAuthStatus: () => request('/api/auth/status'),
  setup: (username, password) => request('/api/auth/setup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword, newPassword) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Instances
  getInstances: () => request('/api/instances'),
  createInstance: (body) => request('/api/instances', { method: 'POST', body: JSON.stringify(body) }),
  updateInstance: (id, body) => request(`/api/instances/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteInstance: (id) => request(`/api/instances/${id}`, { method: 'DELETE' }),

  // Arr proxy
  getStatus: (id) => request(`/api/arr/${id}/status`),
  getQueue: (id, page = 1, pageSize = 50) => request(`/api/arr/${id}/queue?page=${page}&pageSize=${pageSize}`),
  getHistory: (id, page = 1, pageSize = 30) => request(`/api/arr/${id}/history?page=${page}&pageSize=${pageSize}`),
  deleteQueueItem: (instanceId, itemId, opts = {}) => {
    const p = new URLSearchParams(opts).toString();
    return request(`/api/arr/${instanceId}/queue/${itemId}?${p}`, { method: 'DELETE' });
  },
  sendCommand: (instanceId, body) =>
    request(`/api/arr/${instanceId}/command`, { method: 'POST', body: JSON.stringify(body) }),
  getManualImportCandidates: (instanceId, downloadId) => {
    const p = new URLSearchParams({ filterExistingFiles: 'false' });
    if (downloadId) p.set('downloadId', downloadId);
    return request(`/api/arr/${instanceId}/manualimport?${p}`);
  },
  confirmManualImport: (instanceId, files, importMode = 'move') =>
    request(`/api/arr/${instanceId}/manualimport?importMode=${importMode}`, { method: 'POST', body: JSON.stringify(files) }),

  // External API proxies (avoids CORS on the client)
  getLsioImages: () => request('/api/arr/lsio/images'),
};
