import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/client.js';
import { config } from '../config.js';
import { logAuditEvent } from '../middleware/auth.js';

// Helper to generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// Helper to generate 6-digit numeric OTP
function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class AuthService {
  // -------------------------------------------------------------
  // CITIZEN AUTHENTICATION (Passwordless OTP verification)
  // -------------------------------------------------------------

  /**
   * Send or create OTP for Citizen signup/login
   */
  async requestCitizenOtp(email, name = 'Nashik Resident') {
    if (!email || !email.includes('@')) {
      throw new Error('A valid email address is required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpCode = generateOtpCode();
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Invalidate prior unused tokens for this email
    await prisma.emailVerificationToken.updateMany({
      where: { email: cleanEmail, isUsed: false },
      data: { isUsed: true },
    });

    await prisma.emailVerificationToken.create({
      data: {
        email: cleanEmail,
        otpCode,
        token,
        purpose: 'citizen_auth',
        expiresAt,
      },
    });

    return {
      message: 'Verification code generated. Please enter the 6-digit code to continue.',
      email: cleanEmail,
      expiresInMinutes: 10,
      // For local development / academic evaluation, deliver OTP in payload if devAuthMode is enabled
      devOtpCode: config.devAuthMode ? otpCode : undefined,
    };
  }

  /**
   * Verify Citizen OTP and sign in / register
   */
  async verifyCitizenOtp(email, otpCode, name = 'Nashik Resident', req) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otpCode).trim();

    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        email: cleanEmail,
        otpCode: cleanOtp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new Error('Invalid or expired verification code. Please request a new code.');
    }

    // Mark token as used
    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { isUsed: true },
    });

    // Check if user exists or create new citizen
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: name.trim() || 'Nashik Resident',
          role: 'CITIZEN',
          status: 'active',
        },
      });

      await logAuditEvent({
        userId: user.id,
        action: 'CITIZEN_REGISTERED',
        resource: 'User',
        resourceId: user.id,
        details: { email: cleanEmail },
        req,
      });
    } else {
      // Ensure role is CITIZEN for this flow
      if (user.role !== 'CITIZEN') {
        throw new Error('This account is registered as a Worker or Admin. Please use the appropriate login portal.');
      }
    }

    const token = generateToken(user);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // -------------------------------------------------------------
  // WORKER AUTHENTICATION & ACTIVATION
  // -------------------------------------------------------------

  /**
   * Worker Login with Worker ID, Org Code, and Password
   */
  async workerLogin(workerIdOrEmail, orgCode, password, req) {
    if (!workerIdOrEmail || !password) {
      throw new Error('Worker ID or registered work email and password are required.');
    }

    // Find worker profile by workerId or user email
    let workerProfile = await prisma.workerProfile.findFirst({
      where: {
        OR: [
          { workerId: workerIdOrEmail.trim().toUpperCase() },
          { user: { email: workerIdOrEmail.trim().toLowerCase() } },
        ],
      },
      include: {
        user: true,
        organization: true,
      },
    });

    if (!workerProfile) {
      throw new Error('Invalid worker credentials or organization association.');
    }

    if (orgCode && workerProfile.orgCode !== orgCode.trim().toUpperCase()) {
      throw new Error('Organization code does not match registered worker credentials.');
    }

    if (workerProfile.status !== 'active' || workerProfile.user.status !== 'active') {
      throw new Error('Worker account is inactive or revoked. Please contact your supervisor.');
    }

    if (!workerProfile.isActivated || !workerProfile.user.password) {
      throw new Error('Worker account has not been activated. Please use the activation screen to set your password.');
    }

    const isMatch = await bcrypt.compare(password, workerProfile.user.password);
    if (!isMatch) {
      throw new Error('Invalid worker credentials or password.');
    }

    await logAuditEvent({
      userId: workerProfile.user.id,
      action: 'WORKER_LOGIN',
      resource: 'WorkerProfile',
      resourceId: workerProfile.id,
      req,
    });

    const token = generateToken(workerProfile.user);
    return {
      token,
      user: {
        id: workerProfile.user.id,
        email: workerProfile.user.email,
        name: workerProfile.user.name,
        role: 'WORKER',
        workerId: workerProfile.workerId,
        orgCode: workerProfile.orgCode,
        organizationName: workerProfile.organization.name,
        assignedWard: workerProfile.assignedWard,
        vehicleType: workerProfile.vehicleType,
      },
    };
  }

  /**
   * Worker Account Activation (Sets initial password via admin-issued token)
   */
  async activateWorkerAccount(workerId, activationToken, newPassword, req) {
    if (!workerId || !activationToken || !newPassword) {
      throw new Error('Worker ID, activation token, and new password are required.');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const workerProfile = await prisma.workerProfile.findFirst({
      where: {
        workerId: workerId.trim().toUpperCase(),
        activationToken: activationToken.trim(),
        activationTokenExpiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!workerProfile) {
      throw new Error('Invalid or expired worker activation token.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and mark worker profile as activated
    await prisma.$transaction([
      prisma.user.update({
        where: { id: workerProfile.userId },
        data: { password: hashedPassword },
      }),
      prisma.workerProfile.update({
        where: { id: workerProfile.id },
        data: {
          isActivated: true,
          activationToken: null,
          activationTokenExpiresAt: null,
        },
      }),
    ]);

    await logAuditEvent({
      userId: workerProfile.userId,
      action: 'WORKER_ACCOUNT_ACTIVATED',
      resource: 'WorkerProfile',
      resourceId: workerProfile.id,
      req,
    });

    return {
      message: 'Worker account successfully activated. You may now sign in with your credentials.',
      workerId: workerProfile.workerId,
    };
  }

  // -------------------------------------------------------------
  // ORGANIZATION ADMIN AUTHENTICATION & ONBOARDING
  // -------------------------------------------------------------

  /**
   * Request Organization Registration (Pending Admin Approval)
   */
  async requestOrganizationRegistration(data, req) {
    const {
      organizationName,
      organizationType,
      officialWorkEmail,
      adminName,
      contactPhone,
      verificationDetails,
      reasonForRequest,
    } = data;

    if (!organizationName || !officialWorkEmail || !adminName || !contactPhone || !reasonForRequest) {
      throw new Error('All required organization onboarding fields must be provided.');
    }

    // Check if organization already exists
    const existingOrg = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: organizationName.trim() },
          { officialEmail: officialWorkEmail.trim().toLowerCase() },
        ],
      },
    });

    if (existingOrg) {
      throw new Error('An organization with this name or official email already exists.');
    }

    const regRequest = await prisma.organizationRegistrationRequest.create({
      data: {
        organizationName: organizationName.trim(),
        organizationType: organizationType || 'authorized_contractor',
        officialWorkEmail: officialWorkEmail.trim().toLowerCase(),
        adminName: adminName.trim(),
        contactPhone: contactPhone.trim(),
        verificationDetails: verificationDetails || null,
        reasonForRequest: reasonForRequest.trim(),
        status: 'pending',
      },
    });

    await logAuditEvent({
      action: 'ORG_REGISTRATION_REQUESTED',
      resource: 'OrganizationRegistrationRequest',
      resourceId: regRequest.id,
      details: { organizationName, officialWorkEmail },
      req,
    });

    return {
      message: 'Organization registration request submitted for municipal verification. You will be notified upon review.',
      requestId: regRequest.id,
      status: 'pending',
    };
  }

  /**
   * Organization Admin Login
   */
  async organizationAdminLogin(email, password, req) {
    if (!email || !password) {
      throw new Error('Work email and password are required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { organization: true },
    });

    if (!user) {
      throw new Error('Invalid administrative credentials.');
    }

    if (user.role !== 'ORGANIZATION_ADMIN') {
      throw new Error('Access denied: This portal is reserved for authorized Organization Administrators.');
    }

    if (user.status !== 'active') {
      throw new Error('Administrator account is inactive or disabled.');
    }

    if (!user.password) {
      throw new Error('No password configured for this administrative account.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid administrative credentials.');
    }

    await logAuditEvent({
      userId: user.id,
      action: 'ADMIN_LOGIN',
      resource: 'User',
      resourceId: user.id,
      req,
    });

    const token = generateToken(user);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ORGANIZATION_ADMIN',
        organizationId: user.organizationId,
        organizationName: user.organization?.name || 'Nashik Municipal Corporation',
        organizationCode: user.organization?.code || 'NMC-SWM',
      },
    };
  }

  // -------------------------------------------------------------
  // WORKER PROVISIONING (Admin Only)
  // -------------------------------------------------------------

  /**
   * Provision a new worker record with Worker ID & Activation Token
   */
  async provisionWorker(adminUser, workerData, req) {
    const { name, email, phone, assignedWard, vehicleType } = workerData;

    if (!name || !email) {
      throw new Error('Worker name and work email are required.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new Error('A user account with this email already exists.');
    }

    // Determine organization ID
    const orgId = adminUser.organizationId || (await prisma.organization.findFirst())?.id;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    // Generate unique Worker ID: WRK-NSK-XXX
    const workerCount = await prisma.workerProfile.count();
    const workerId = `WRK-NSK-${101 + workerCount}`;
    const activationToken = crypto.randomBytes(16).toString('hex');
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: name.trim(),
        role: 'WORKER',
        status: 'active',
        organizationId: orgId,
        workerProfile: {
          create: {
            organizationId: orgId,
            workerId,
            orgCode: org?.code || 'NMC-SWM',
            phone: phone || null,
            assignedWard: assignedWard || 'Panchavati',
            vehicleType: vehicleType || 'compactor_truck',
            isActivated: false,
            activationToken,
            activationTokenExpiresAt: tokenExpiry,
            status: 'active',
          },
        },
      },
      include: { workerProfile: true },
    });

    await logAuditEvent({
      userId: adminUser.id,
      action: 'WORKER_PROVISIONED',
      resource: 'WorkerProfile',
      resourceId: newUser.workerProfile.id,
      details: { workerId, email: cleanEmail },
      req,
    });

    return {
      message: 'Worker provisioned successfully.',
      worker: {
        id: newUser.id,
        workerId: newUser.workerProfile.workerId,
        name: newUser.name,
        email: newUser.email,
        orgCode: newUser.workerProfile.orgCode,
        assignedWard: newUser.workerProfile.assignedWard,
        activationToken, // Provided to admin to convey to worker
        activationExpiry: tokenExpiry,
      },
    };
  }

  /**
   * List all provisioned workers in organization
   */
  async listWorkers(orgId) {
    const where = orgId ? { organizationId: orgId } : {};
    return await prisma.workerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        organization: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const authService = new AuthService();
