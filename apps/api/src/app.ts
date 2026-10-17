import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/swagger';
import { dsaService } from './services/dsaService';

// Import Routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import binRoutes from './routes/bin.routes';
import observationRoutes from './routes/observation.routes';
import collectionRoutes from './routes/collection.routes';
import wardRoutes from './routes/ward.routes';
import complaintRoutes from './routes/complaint.routes';
import vehicleRoutes from './routes/vehicle.routes';
import dsaRoutes from './routes/dsa.routes';
import predictionRoutes from './routes/prediction.routes';
import importRoutes from './routes/import.routes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// System Health Endpoint
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  const cppHealth = await dsaService.getEngineHealth();
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Eco Collect REST API',
    database: 'connected',
    cppEngine: cppHealth.data || { status: 'unavailable', error: cppHealth.error },
  });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/bins', binRoutes);
app.use('/api/v1/observations', observationRoutes);
app.use('/api/v1/collections', collectionRoutes);
app.use('/api/v1/wards', wardRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1', dsaRoutes);
app.use('/api/v1/predictions', predictionRoutes);
app.use('/api/v1', importRoutes);

// Global 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

export default app;
