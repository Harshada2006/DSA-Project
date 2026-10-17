import {
  DashboardSummary,
  Bin,
  Ward,
  Complaint,
  Vehicle,
  PriorityTask,
  RouteOptimizationRequest,
  RouteOptimizationResponse,
  PredictionResult,
  MLModelMetadata,
  CollectionEvent,
} from '@eco-collect/shared';

const BASE_URL = '/api/v1';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('eco_token');
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

  const json = await response.json();
  if (!response.ok || json.success === false) {
    throw new Error(json.error || `Request failed with status ${response.status}`);
  }

  return (json.data !== undefined ? json.data : json) as T;
}

export const api = {
  // Health
  getHealth: () => fetchJson<any>('/health'),
  getCppHealth: () => fetchJson<any>('/dsa/health'),

  // Dashboard
  getSummary: (wardId?: string) =>
    fetchJson<DashboardSummary>(`/dashboard/summary${wardId ? `?wardId=${wardId}` : ''}`),

  // Wards
  getWards: () => fetchJson<Ward[]>('/wards'),

  // Bins
  getBins: (params: {
    wardId?: string;
    status?: string;
    urgency?: string;
    wasteType?: string;
    search?: string;
    provenance?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.wardId) query.set('wardId', params.wardId);
    if (params.status) query.set('status', params.status);
    if (params.urgency) query.set('urgency', params.urgency);
    if (params.wasteType) query.set('wasteType', params.wasteType);
    if (params.search) query.set('search', params.search);
    if (params.provenance) query.set('provenance', params.provenance);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return fetchJson<{ bins: Bin[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(
      `/bins?${query.toString()}`
    );
  },

  getBin: (id: string) => fetchJson<any>(`/bins/${id}`),

  createBin: (data: any) =>
    fetchJson<Bin>('/bins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBin: (id: string, data: any) =>
    fetchJson<Bin>(`/bins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archiveBin: (id: string) =>
    fetchJson<any>(`/bins/${id}`, {
      method: 'DELETE',
    }),

  // Observations & Collections
  recordObservation: (data: {
    binId: string;
    fillPercentage: number;
    observedAt?: string;
    observerType?: string;
    notes?: string;
    provenance?: string;
  }) =>
    fetchJson<any>('/observations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCollections: (limit = 50) =>
    fetchJson<CollectionEvent[]>(`/collections?limit=${limit}`),

  recordCollection: (data: {
    binId: string;
    vehicleId: string;
    driverName: string;
    fillBefore: number;
    fillAfter?: number;
    status?: string;
    notes?: string;
    provenance?: string;
  }) =>
    fetchJson<any>('/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Complaints
  getComplaints: (params: { wardId?: string; status?: string; severity?: string; category?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.wardId) query.set('wardId', params.wardId);
    if (params.status) query.set('status', params.status);
    if (params.severity) query.set('severity', params.severity);
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    return fetchJson<Complaint[]>(`/complaints?${query.toString()}`);
  },

  createComplaint: (data: any) =>
    fetchJson<Complaint>('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateComplaint: (id: string, data: any) =>
    fetchJson<Complaint>(`/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Vehicles & GPS
  getVehicles: () => fetchJson<Vehicle[]>('/vehicles'),

  updateVehicleLocation: (id: string, data: any) =>
    fetchJson<Vehicle>(`/vehicles/${id}/location`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  toggleSimulation: (start?: boolean) =>
    fetchJson<{ isRunning: boolean; message: string }>('/vehicles/simulation/toggle', {
      method: 'POST',
      body: JSON.stringify({ start }),
    }),

  getSimulationStatus: () =>
    fetchJson<{ isRunning: boolean }>('/vehicles/simulation/status'),

  // DSA - C++ Priority Queue & Routing
  getPrioritizedTasks: (params: { wardId?: string; urgency?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.wardId) query.set('wardId', params.wardId);
    if (params.urgency) query.set('urgency', params.urgency);
    if (params.limit) query.set('limit', params.limit.toString());
    return fetchJson<{
      tasks: PriorityTask[];
      executionTimeMs: number;
      algorithm: string;
      timeComplexity: string;
      cppResult: any;
    }>(`/prioritized?${query.toString()}`);
  },

  optimizeRoute: (req: RouteOptimizationRequest) =>
    fetchJson<RouteOptimizationResponse>('/optimize', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getRoutes: () => fetchJson<any[]>('/routes'),

  // ML & Predictions
  getPredictions: (binId?: string) =>
    fetchJson<PredictionResult[]>(`/predictions${binId ? `?binId=${binId}` : ''}`),

  getModels: () => fetchJson<MLModelMetadata[]>('/predictions/models'),

  trainModel: (params: { epochs: number; learningRate: number; trainTestSplitRatio: number; features: string[] }) =>
    fetchJson<MLModelMetadata>('/predictions/models/train', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  promoteModel: (id: string) =>
    fetchJson<MLModelMetadata>(`/predictions/models/${id}/promote`, {
      method: 'POST',
    }),

  // Data Sources & Imports
  getDataSources: () => fetchJson<any[]>('/data-sources'),

  importCsv: (formData: FormData) =>
    fetchJson<any>('/imports/csv', {
      method: 'POST',
      body: formData,
    }),
};
