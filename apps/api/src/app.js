import express from 'express';
import cors from 'cors';
import { dsaService } from './services/dsaService.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import binRoutes from './routes/bin.routes.js';
import taskRoutes from './routes/task.routes.js';
import complaintRoutes from './routes/complaint.routes.js';
import ewasteRoutes from './routes/ewaste.routes.js';
import facilityRoutes from './routes/facility.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import dsaRoutes from './routes/dsa.routes.js';
import predictionRoutes from './routes/prediction.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import adminRoutes from './routes/admin.routes.js';
import wardRoutes from './routes/ward.routes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/v1/health', async (_req, res) => {
  const cppHealth = await dsaService.getEngineHealth();
  res.json({
    status: 'healthy',
    system: 'EcoNexus Civic Waste Management Platform',
    timestamp: new Date().toISOString(),
    database: 'connected',
    cppEngine: cppHealth.data || { status: 'offline', error: cppHealth.error },
  });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bins', binRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/ewaste', ewasteRoutes);
app.use('/api/v1/facilities', facilityRoutes);
app.use('/api/v1', scheduleRoutes);
app.use('/api/v1', dsaRoutes);
app.use('/api/v1/predictions', predictionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/wards', wardRoutes);

// Global 404 Handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

export default app;
