export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Eco Collect — Smart Waste Management & Route Optimization API',
    version: '1.0.0',
    description:
      'Backend REST API for Eco Collect: municipal solid waste management, C++ Max-Heap task prioritization, C++ Dijkstra & Greedy Multi-Stop route optimization, and TensorFlow.js regression predictions for Nashik, Maharashtra, India.',
    contact: {
      name: 'Eco Collect Engineering Team',
      url: 'https://github.com/eco-collect/eco-collect',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Local Development Server',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Check API and C++ Engine Health',
        responses: { '200': { description: 'System is healthy' } },
      },
    },
    '/dashboard/summary': {
      get: {
        summary: 'Get Overview Dashboard Metrics and Trends',
        responses: { '200': { description: 'Dashboard metrics returned' } },
      },
    },
    '/bins': {
      get: {
        summary: 'List Registered Bins with Filtering and Pagination',
        responses: { '200': { description: 'List of bins' } },
      },
      post: {
        summary: 'Register a New Bin',
        responses: { '201': { description: 'Bin created successfully' } },
      },
    },
    '/tasks/prioritized': {
      get: {
        summary: 'Get Prioritized Collection Tasks Ranked by C++ Max-Heap Engine',
        responses: { '200': { description: 'Ranked tasks with formula score breakdown' } },
      },
    },
    '/routes/optimize': {
      post: {
        summary: 'Optimize Multi-Stop Collection Route using C++ Dijkstra & TSP Heuristic',
        responses: { '201': { description: 'Optimized route generated with path geometry' } },
      },
    },
    '/predictions': {
      get: {
        summary: 'Get Fill Predictions & Time to Threshold for Bins',
        responses: { '200': { description: 'Bin fill predictions' } },
      },
    },
    '/models/train': {
      post: {
        summary: 'Train TensorFlow.js Regression Model with Chronological Split',
        responses: { '201': { description: 'Trained model metadata and evaluation metrics' } },
      },
    },
  },
};
