import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../database/client.js';

/**
 * Validates JWT token and loads active user profile
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        organization: true,
        workerProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists or session has expired.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status}. Please contact an administrator.`,
      });
    }

    // Attach verified user
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role, // "ORGANIZATION_ADMIN", "WORKER", "CITIZEN"
      organizationId: user.organizationId,
      organizationName: user.organization?.name,
      organizationCode: user.organization?.code,
      workerId: user.workerProfile?.workerId,
      assignedWard: user.workerProfile?.assignedWard,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Authentication token has expired. Please sign in again.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
    });
  }
}

/**
 * Role-Based Access Control Middleware
 * Exactly 3 allowed stakeholder roles:
 * 'ORGANIZATION_ADMIN' | 'WORKER' | 'CITIZEN'
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    // Exact role match check
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of the following permissions: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

/**
 * Audit log recording helper
 */
export async function logAuditEvent({ userId, action, resource, resourceId, details, req }) {
  try {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || 'local';
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        resource,
        resourceId: resourceId || null,
        details: typeof details === 'object' ? JSON.stringify(details) : details || null,
        ipAddress: String(ipAddress),
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}
