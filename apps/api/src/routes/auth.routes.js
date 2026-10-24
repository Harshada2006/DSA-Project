import { Router } from 'express';
import { authService } from '../services/authService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// -------------------------------------------------------------
// CITIZEN AUTHENTICATION
// -------------------------------------------------------------

// Request email OTP / verification code
router.post('/citizen/otp', otpRateLimiter, async (req, res) => {
  try {
    const { email, name } = req.body;
    const result = await authService.requestCitizenOtp(email, name);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verify OTP & sign in / register
router.post('/citizen/verify', authRateLimiter, async (req, res) => {
  try {
    const { email, otpCode, name } = req.body;
    const result = await authService.verifyCitizenOtp(email, otpCode, name, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// WORKER AUTHENTICATION & ACTIVATION
// -------------------------------------------------------------

// Worker login with Worker ID, Org Code, and Password
router.post('/worker/login', authRateLimiter, async (req, res) => {
  try {
    const { workerId, orgCode, password } = req.body;
    const result = await authService.workerLogin(workerId, orgCode, password, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Worker account activation (set password)
router.post('/worker/activate', authRateLimiter, async (req, res) => {
  try {
    const { workerId, activationToken, newPassword } = req.body;
    const result = await authService.activateWorkerAccount(workerId, activationToken, newPassword, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// ORGANIZATION ADMIN AUTHENTICATION
// -------------------------------------------------------------

// Request organization registration (pending approval)
router.post('/organization/register', authRateLimiter, async (req, res) => {
  try {
    const result = await authService.requestOrganizationRegistration(req.body, req);
    res.status(202).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Organization Admin Login
router.post('/organization/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.organizationAdminLogin(email, password, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// SESSION / CURRENT USER
// -------------------------------------------------------------

router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, data: req.user });
});

router.post('/logout', authenticate, async (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
