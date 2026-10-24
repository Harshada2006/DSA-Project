import { Router } from 'express';
import { prisma } from '../database/client.js';
import { authService } from '../services/authService.js';
import { authenticate, authorize, logAuditEvent } from '../middleware/auth.js';

const router = Router();

// Organization Admin Only Protection
router.use(authenticate, authorize('ORGANIZATION_ADMIN'));

// List all workers in organization
router.get('/workers', async (req, res) => {
  try {
    const workers = await authService.listWorkers(req.user.organizationId);
    res.json({ success: true, count: workers.length, data: workers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Provision a new worker
router.post('/workers', async (req, res) => {
  try {
    const result = await authService.provisionWorker(req.user, req.body, req);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List pending/reviewed organization registration requests
router.get('/registration-requests', async (_req, res) => {
  try {
    const requests = await prisma.organizationRegistrationRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Approve or reject organization registration request
router.patch('/registration-requests/:id', async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    const request = await prisma.organizationRegistrationRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Registration request not found.' });
    }

    const updated = await prisma.organizationRegistrationRequest.update({
      where: { id: req.params.id },
      data: {
        status: status || request.status,
        reviewNotes: reviewNotes || null,
        reviewedBy: req.user.name,
      },
    });

    await logAuditEvent({
      userId: req.user.id,
      action: 'ORG_REGISTRATION_REVIEWED',
      resource: 'OrganizationRegistrationRequest',
      resourceId: request.id,
      details: { status, organizationName: request.organizationName },
      req,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// View system audit logs
router.get('/audit-logs', async (_req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    });
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// View data sources provenance
router.get('/data-sources', async (_req, res) => {
  try {
    const sources = await prisma.dataSource.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, count: sources.length, data: sources });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
