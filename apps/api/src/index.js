import app from './app.js';
import { config } from './config.js';
import { dsaService } from './services/dsaService.js';

const PORT = config.port;

app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`  EcoNexus REST API Server online`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`);
  
  // Verify C++ Engine on startup
  try {
    const health = await dsaService.getEngineHealth();
    if (health.success) {
      console.log(`  C++17 Engine: Connected (${health.data?.engine || 'EcoEngine'})`);
    } else {
      console.warn(`  C++17 Engine Warning: ${health.error}`);
    }
  } catch (err) {
    console.warn(`  C++17 Engine check failed: ${err.message}`);
  }
  console.log(`====================================================`);
});
