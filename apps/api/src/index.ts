import app from './app';
import { config } from './config';
import { dsaService } from './services/dsaService';

const PORT = config.port || 4000;

app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`  🌱 Eco Collect API Server running on port ${PORT}`);
  console.log(`  📍 Environment: ${config.nodeEnv}`);
  console.log(`  📄 OpenAPI Docs: http://localhost:${PORT}/api/docs`);
  console.log(`=======================================================`);

  // Verify C++ Engine on startup
  try {
    const health = await dsaService.getEngineHealth();
    if (health.success && health.data) {
      console.log(`  ⚙️  C++ DSA Engine: CONNECTED (${health.data.compiler}, ${health.data.engine} v${health.data.version})`);
    } else {
      console.warn(`  ⚠️  C++ DSA Engine: ${health.error}`);
    }
  } catch (err: any) {
    console.warn(`  ⚠️  C++ DSA Engine check failed: ${err.message}`);
  }
  console.log(`=======================================================`);
});
