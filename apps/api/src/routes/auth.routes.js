import { Router } from 'express';
import { authService } from '../services/authService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// -------------------------------------------------------------
// 1. CITIZEN AUTHENTICATION (PASSWORD LOGIN, SIGNUP & VERIFY)
// -------------------------------------------------------------

// Citizen registration with password
router.post('/citizen/register', authRateLimiter, async (req, res) => {
  try {
    const result = await authService.citizenRegister(req.body, req);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Citizen email verification
router.post('/citizen/verify-email', authRateLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyCitizenEmail(email, code, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Resend verification code
router.post('/citizen/resend-code', otpRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.resendCitizenVerification(email);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Citizen password login
router.post('/citizen/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.citizenLogin(email, password, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Backwards compatibility OTP endpoints
router.post('/citizen/otp', otpRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.resendCitizenVerification(email);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/citizen/verify', authRateLimiter, async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const result = await authService.verifyCitizenEmail(email, otpCode, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2. PASSWORD RESET (Citizen & Worker)
// -------------------------------------------------------------

router.post('/password/reset-request', otpRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/password/reset-confirm', authRateLimiter, async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. WORKER AUTHENTICATION & ACTIVATION
// -------------------------------------------------------------

// Worker login with Worker ID or work email + Password
router.post('/worker/login', authRateLimiter, async (req, res) => {
  try {
    const { workerId, email, password } = req.body;
    const identifier = workerId || email;
    const result = await authService.workerLogin(identifier, password, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Worker account activation (sets password via admin-issued token)
router.post('/worker/activate', authRateLimiter, async (req, res) => {
  try {
    const result = await authService.activateWorkerAccount(req.body, req);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4. ORGANIZATION ADMIN AUTHENTICATION
// -------------------------------------------------------------

// Request organization access (pending administrative review)
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
// 5. SESSION / CURRENT USER
// -------------------------------------------------------------

router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, data: req.user });
});

router.post('/logout', authenticate, async (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
