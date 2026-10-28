const BASE_URL = '/api/v1';

async function fetchJson(url, options = {}) {
  const token = localStorage.getItem('econexus_token') || localStorage.getItem('eco_token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    throw new Error(json.error || `Request failed with status ${response.status}`);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // System Health
  getHealth: () => fetchJson('/health'),
  getCppHealth: () => fetchJson('/dsa/health'),

  // Authentication & Stakeholders
  citizenRegister: (data) =>
    fetchJson('/auth/citizen/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyCitizenEmail: (email, code) =>
    fetchJson('/auth/citizen/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resendCitizenCode: (email) =>
    fetchJson('/auth/citizen/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  citizenLogin: (email, password) =>
    fetchJson('/auth/citizen/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  requestCitizenOtp: (email, name) =>
    fetchJson('/auth/citizen/otp', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    }),

  verifyCitizenOtp: (email, otpCode, name) =>
    fetchJson('/auth/citizen/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode, name }),
    }),

  requestPasswordReset: (email) =>
    fetchJson('/auth/password/reset-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data) =>
    fetchJson('/auth/password/reset-confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  workerLogin: (workerIdOrEmail, password) =>
    fetchJson('/auth/worker/login', {
      method: 'POST',
      body: JSON.stringify({ workerId: workerIdOrEmail, email: workerIdOrEmail, password }),
    }),

  activateWorker: (data) =>
    fetchJson('/auth/worker/activate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  orgRegister: (data) =>
    fetchJson('/auth/organization/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  orgLogin: (email, password) =>
    fetchJson('/auth/organization/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Operational Issues & Roadblocks
  reportIssue: (data) =>
    fetchJson('/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getIssues: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.issueType) q.set('issueType', params.issueType);
    return fetchJson(`/issues?${q.toString()}`);
  },

  getActiveRoadblocks: () => fetchJson('/issues/roadblocks'),

  toggleRoadblock: (data) =>
    fetchJson('/issues/roadblocks/toggle', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateIssueStatus: (id, data) =>
    fetchJson(`/issues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getMe: () => fetchJson('/auth/me'),

  logout: () => {
    localStorage.removeItem('econexus_token');
    localStorage.removeItem('econexus_user');
    localStorage.removeItem('eco_token');
  },

  // Wards
  getWards: () => fetchJson('/wards'),

  // Bins
  getBins: (params = {}) => {
    const q = new URLSearchParams();
    if (params.wardId) q.set('wardId', params.wardId);
    if (params.status) q.set('status', params.status);
    if (params.urgency) q.set('urgency', params.urgency);
    if (params.wasteType) q.set('wasteType', params.wasteType);
    if (params.areaCategory) q.set('areaCategory', params.areaCategory);
    if (params.provenance) q.set('provenance', params.provenance);
    if (params.search) q.set('search', params.search);
    return fetchJson(`/bins?${q.toString()}`);
  },

  getBin: (id) => fetchJson(`/bins/${id}`),

  getBinHistory: (id, params = {}) => {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.date) q.set('date', params.date);
    if (params.limit) q.set('limit', params.limit);
    return fetchJson(`/bins/${id}/history?${q.toString()}`);
  },

  createBin: (data) =>
    fetchJson('/bins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBin: (id, data) =>
    fetchJson(`/bins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  recordObservation: (id, data) =>
    fetchJson(`/bins/${id}/observations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Tasks
  getTasks: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.priority) q.set('priority', params.priority);
    if (params.workerId) q.set('workerId', params.workerId);
    return fetchJson(`/tasks?${q.toString()}`);
  },

  createTask: (data) =>
    fetchJson('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  startTask: (id) =>
    fetchJson(`/tasks/${id}/start`, {
      method: 'POST',
    }),

  recordCollection: (id, data) =>
    fetchJson(`/tasks/${id}/collect`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reportMissedTask: (id, data) =>
    fetchJson(`/tasks/${id}/missed`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Vehicle Load & Dumping Facility
  getVehicleStatus: () => fetchJson('/tasks/vehicle/status'),

  unloadVehicle: (vehicleId) =>
    fetchJson('/tasks/vehicle/unload', {
      method: 'POST',
      body: JSON.stringify({ vehicleId }),
    }),

  getRouteToDumping: (params = {}) => {
    const q = new URLSearchParams();
    if (params.avoidBlocked !== undefined) q.set('avoidBlocked', params.avoidBlocked);
    if (params.sourceNodeId) q.set('sourceNodeId', params.sourceNodeId);
    return fetchJson(`/tasks/vehicle/route-to-dumping?${q.toString()}`);
  },

  getRouteToBin: (binId, params = {}) => {
    const q = new URLSearchParams();
    if (params.avoidBlocked !== undefined) q.set('avoidBlocked', params.avoidBlocked);
    if (params.sourceNodeId) q.set('sourceNodeId', params.sourceNodeId);
    return fetchJson(`/tasks/bin/${binId}/route?${q.toString()}`);
  },

  // Complaints
  submitComplaint: (data) =>
    fetchJson('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getComplaints: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.wardId) q.set('wardId', params.wardId);
    if (params.severity) q.set('severity', params.severity);
    if (params.search) q.set('search', params.search);
    return fetchJson(`/complaints?${q.toString()}`);
  },

  getComplaintDetails: (id) => fetchJson(`/complaints/${id}`),

  updateComplaintStatus: (id, data) =>
    fetchJson(`/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // E-Waste
  submitEWasteRequest: (data) =>
    fetchJson('/ewaste/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEWasteRequests: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    return fetchJson(`/ewaste/requests?${q.toString()}`);
  },

  assignEWasteWorker: (id, workerId) =>
    fetchJson(`/ewaste/requests/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ workerId }),
    }),

  recordEWasteCollection: (id, data) =>
    fetchJson(`/ewaste/requests/${id}/collect`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordEWasteHandover: (data) =>
    fetchJson('/ewaste/handover', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Facilities
  getFacilities: (params = {}) => {
    const q = new URLSearchParams();
    if (params.facilityType) q.set('facilityType', params.facilityType);
    if (params.verificationStatus) q.set('verificationStatus', params.verificationStatus);
    return fetchJson(`/facilities?${q.toString()}`);
  },

  createFacility: (data) =>
    fetchJson('/facilities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Schedules & Events
  getSchedules: (wardId) =>
    fetchJson(`/schedules${wardId ? `?wardId=${wardId}` : ''}`),

  createSchedule: (data) =>
    fetchJson('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEvents: () => fetchJson('/events'),

  createEvent: (data) =>
    fetchJson('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // C++ DSA
  getPrioritizedTasks: (payload = {}) =>
    fetchJson('/dsa/prioritize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getShortestPath: (sourceId, targetId, useTime = false) =>
    fetchJson('/dsa/shortest-path', {
      method: 'POST',
      body: JSON.stringify({ sourceId, targetId, useTime }),
    }),

  optimizeRoute: (payload) =>
    fetchJson('/dsa/optimize-route', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Predictions
  getPredictions: (wardId) =>
    fetchJson(`/predictions${wardId ? `?wardId=${wardId}` : ''}`),

  getBinPrediction: (binId) => fetchJson(`/predictions/${binId}`),

  // Analytics & Admin
  getDashboardSummary: () => fetchJson('/analytics/dashboard'),

  getExportUrl: (type) => `${BASE_URL}/analytics/export?type=${type}`,

  getWorkers: () => fetchJson('/admin/workers'),

  provisionWorker: (data) =>
    fetchJson('/admin/workers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRegistrationRequests: () => fetchJson('/admin/registration-requests'),

  reviewRegistrationRequest: (id, status, reviewNotes) =>
    fetchJson(`/admin/registration-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNotes }),
    }),

  getAuditLogs: () => fetchJson('/admin/audit-logs'),

  getDataSources: () => fetchJson('/admin/data-sources'),
};
