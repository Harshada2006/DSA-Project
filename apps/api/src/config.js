import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function resolveEnginePath() {
  if (process.env.CPP_ENGINE_PATH && fs.existsSync(process.env.CPP_ENGINE_PATH)) {
    return process.env.CPP_ENGINE_PATH;
  }
  const binaryName = process.platform === 'win32' ? 'eco_engine.exe' : 'eco_engine';
  const candidates = [
    path.resolve(__dirname, '../../engine/cpp/bin', binaryName),
    path.resolve(__dirname, '../../../engine/cpp/bin', binaryName),
    path.resolve(process.cwd(), 'engine/cpp/bin', binaryName),
    path.resolve(process.cwd(), '../../engine/cpp/bin', binaryName),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export const config = {
  appName: 'EcoNexus',
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./eco_collect.db',
  jwtSecret: process.env.JWT_SECRET || 'econexus_nashik_civic_tech_jwt_secret_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cppEnginePath: resolveEnginePath(),
  dataDir: path.resolve(__dirname, '../../../data'),
  // Development mode displays generated OTP in response for testing
  devAuthMode: process.env.DEV_AUTH_MODE !== 'false',
};
