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

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export class AuthService {
  // -------------------------------------------------------------
  // 1. CITIZEN AUTHENTICATION (PASSWORD LOGIN, SIGNUP & VERIFICATION)
  // -------------------------------------------------------------

  /**
   * Citizen Signup / Registration with email & password
   */
  async citizenRegister(data, req) {
    const { name, email, password, confirmPassword, agreeTerms } = data;

    if (!name || !name.trim()) {
      throw new Error('Full name is required.');
    }
    if (!email || !isValidEmail(email)) {
      throw new Error('A valid email address is required.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new Error('Password confirmation does not match.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in or reset your password.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in unverified state
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: 'CITIZEN',
        status: 'active',
        isEmailVerified: false,
      },
    });

    // Generate single-use verification token / OTP
    const otpCode = generateOtpCode();
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes expiry

    await prisma.emailVerificationToken.create({
      data: {
        email: cleanEmail,
        otpCode,
        token,
        purpose: 'citizen_signup',
        expiresAt,
      },
    });

    await logAuditEvent({
      userId: newUser.id,
      action: 'CITIZEN_REGISTERED',
      resource: 'User',
      resourceId: newUser.id,
      details: { email: cleanEmail },
      req,
    });

    return {
      success: true,
      message: 'Registration successful! Please verify your email with the verification code.',
      email: cleanEmail,
      requiresVerification: true,
      devOtpCode: config.devAuthMode ? otpCode : undefined,
      devVerificationToken: config.devAuthMode ? token : undefined,
    };
  }

  /**
   * Verify Citizen Email via OTP or Token
   */
  async verifyCitizenEmail(email, otpOrToken, req) {
    if (!email || !otpOrToken) {
      throw new Error('Email address and verification code are required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const code = String(otpOrToken).trim();

    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        email: cleanEmail,
        isUsed: false,
        expiresAt: { gt: new Date() },
        OR: [{ otpCode: code }, { token: code }],
      },
    });

    if (!record) {
      throw new Error('Invalid or expired verification code. Please request a new verification code.');
    }

    // Mark token as used
    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { isUsed: true },
    });

    // Mark citizen email verified
    const user = await prisma.user.update({
      where: { email: cleanEmail },
      data: { isEmailVerified: true },
    });

    await logAuditEvent({
      userId: user.id,
      action: 'CITIZEN_EMAIL_VERIFIED',
      resource: 'User',
      resourceId: user.id,
      details: { email: cleanEmail },
      req,
    });

    return {
      success: true,
      message: 'Email address verified successfully. You may now sign in with your password.',
      email: user.email,
    };
  }

  /**
   * Resend Citizen Verification Code
   */
  async resendCitizenVerification(email) {
    if (!email || !isValidEmail(email)) {
      throw new Error('A valid email address is required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      // Avoid account enumeration
      return {
        success: true,
        message: 'If this email is registered and unverified, a verification code has been dispatched.',
      };
    }

    if (user.isEmailVerified) {
      return {
        success: true,
        message: 'This email is already verified. You can sign in immediately.',
        alreadyVerified: true,
      };
    }

    // Invalidate previous tokens
    await prisma.emailVerificationToken.updateMany({
      where: { email: cleanEmail, isUsed: false, purpose: 'citizen_signup' },
      data: { isUsed: true },
    });

    const otpCode = generateOtpCode();
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        email: cleanEmail,
        otpCode,
        token,
        purpose: 'citizen_signup',
        expiresAt,
      },
    });

    return {
      success: true,
      message: 'New verification code generated.',
      email: cleanEmail,
      devOtpCode: config.devAuthMode ? otpCode : undefined,
    };
  }

  /**
   * Citizen Login with registered email and password
   */
  async citizenLogin(email, password, req) {
    if (!email || !password) {
      throw new Error('Email address and password are required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || user.role !== 'CITIZEN') {
      throw new Error('Invalid email or password.');
    }

    if (!user.password) {
      throw new Error('No password set for this account. Please use password reset to establish a password.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    if (!user.isEmailVerified) {
      throw new Error('Your email address has not been verified. Please verify your email before signing in.');
    }

    if (user.status !== 'active') {
      throw new Error('Your citizen account is currently disabled. Please contact municipal support.');
    }

    await logAuditEvent({
      userId: user.id,
      action: 'CITIZEN_LOGIN',
      resource: 'User',
      resourceId: user.id,
      details: { email: cleanEmail },
      req,
    });

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
  // 2. PASSWORD RESET (Secure single-use token, no enumeration)
  // -------------------------------------------------------------

  /**
   * Request password reset code
   */
  async requestPasswordReset(email, req) {
    if (!email || !isValidEmail(email)) {
      throw new Error('A valid email address is required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    let devOtpCode = undefined;

    if (user && user.status === 'active') {
      // Invalidate previous reset tokens
      await prisma.emailVerificationToken.updateMany({
        where: { email: cleanEmail, isUsed: false, purpose: 'password_reset' },
        data: { isUsed: true },
      });

      const otpCode = generateOtpCode();
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      await prisma.emailVerificationToken.create({
        data: {
          email: cleanEmail,
          otpCode,
          token,
          purpose: 'password_reset',
          expiresAt,
        },
      });

      if (config.devAuthMode) {
        devOtpCode = otpCode;
      }

      await logAuditEvent({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'User',
        resourceId: user.id,
        details: { email: cleanEmail },
        req,
      });
    }

    // Generic safe response to prevent email enumeration
    return {
      success: true,
      message: 'If this email address is registered, password reset instructions have been sent.',
      email: cleanEmail,
      devOtpCode,
    };
  }

  /**
   * Reset Password with valid token/code
   */
  async resetPassword(data, req) {
    const { email, code, newPassword, confirmPassword } = data;

    if (!email || !code || !newPassword) {
      throw new Error('Email, verification code, and new password are required.');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      throw new Error('Password confirmation does not match.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        email: cleanEmail,
        purpose: 'password_reset',
        isUsed: false,
        expiresAt: { gt: new Date() },
        OR: [{ otpCode: cleanCode }, { token: cleanCode }],
      },
    });

    if (!record) {
      throw new Error('Invalid or expired reset code. Please request a new password reset.');
    }

    // Invalidate token
    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { isUsed: true },
    });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        password: hashedPassword,
        isEmailVerified: true, // Resetting proves access to email
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'User',
      resourceId: user.id,
      details: { email: cleanEmail },
      req,
    });

    return {
      success: true,
      message: 'Password has been successfully updated. You may now sign in with your new password.',
    };
  }

  // -------------------------------------------------------------
  // 3. WORKER AUTHENTICATION & ACTIVATION
  // -------------------------------------------------------------

  /**
   * Worker Login with Worker ID or registered work email + Password
   */
  async workerLogin(workerIdOrEmail, password, req) {
    if (!workerIdOrEmail || !password) {
      throw new Error('Worker ID or registered work email and password are required.');
    }

    const cleanIdentifier = workerIdOrEmail.trim();

    // Find worker profile by workerId or user email
    const workerProfile = await prisma.workerProfile.findFirst({
      where: {
        OR: [
          { workerId: cleanIdentifier.toUpperCase() },
          { user: { email: cleanIdentifier.toLowerCase() } },
        ],
      },
      include: {
        user: true,
        organization: true,
      },
    });

    if (!workerProfile) {
      throw new Error('Invalid worker credentials.');
    }

    if (workerProfile.status !== 'active' || workerProfile.user.status !== 'active') {
      throw new Error('Worker account is inactive or revoked. Please contact your supervisor.');
    }

    if (!workerProfile.isActivated || !workerProfile.user.password) {
      throw new Error('Worker account has not been activated. Please use the activation screen to set your password.');
    }

    const isMatch = await bcrypt.compare(password, workerProfile.user.password);
    if (!isMatch) {
      throw new Error('Invalid worker credentials.');
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
  async activateWorkerAccount(data, req) {
    const { workerId, activationToken, newPassword, confirmPassword } = data;

    if (!workerId || !activationToken || !newPassword) {
      throw new Error('Worker ID, activation token, and new password are required.');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      throw new Error('Password confirmation does not match.');
    }

    const cleanWorkerId = workerId.trim().toUpperCase();
    const cleanToken = activationToken.trim();

    const workerProfile = await prisma.workerProfile.findFirst({
      where: {
        workerId: cleanWorkerId,
        activationToken: cleanToken,
        activationTokenExpiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!workerProfile) {
      throw new Error('Invalid, already-used, or expired worker activation token.');
    }

    if (workerProfile.isActivated) {
      throw new Error('Worker account is already activated. Please use the Worker Sign In screen.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and mark worker profile as activated
    await prisma.$transaction([
      prisma.user.update({
        where: { id: workerProfile.userId },
        data: {
          password: hashedPassword,
          isEmailVerified: true,
        },
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
      success: true,
      message: 'Worker account successfully activated! You may now sign in with your Worker ID and password.',
      workerId: workerProfile.workerId,
    };
  }

  // -------------------------------------------------------------
  // 4. ORGANIZATION ADMIN AUTHENTICATION & ACCESS REQUEST
  // -------------------------------------------------------------

  /**
   * Request Organization Access (Stays pending for municipal review)
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

    if (!isValidEmail(officialWorkEmail)) {
      throw new Error('A valid official work email address is required.');
    }

    const cleanEmail = officialWorkEmail.trim().toLowerCase();
    const cleanOrgName = organizationName.trim();

    // Check if organization already exists
    const existingOrg = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: cleanOrgName },
          { officialEmail: cleanEmail },
        ],
      },
    });

    if (existingOrg) {
      throw new Error('An organization with this name or official work email already exists.');
    }

    const regRequest = await prisma.organizationRegistrationRequest.create({
      data: {
        organizationName: cleanOrgName,
        organizationType: organizationType || 'authorized_contractor',
        officialWorkEmail: cleanEmail,
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
      details: { organizationName: cleanOrgName, officialWorkEmail: cleanEmail },
      req,
    });

    return {
      success: true,
      message: 'Organization access request submitted. Your application is pending review by authorized administrators.',
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

    if (!user || user.role !== 'ORGANIZATION_ADMIN') {
      throw new Error('Invalid administrative credentials.');
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
  // 5. WORKER PROVISIONING (Admin Only)
  // -------------------------------------------------------------

  /**
   * Provision worker and issue activation token
   */
  async provisionWorker(adminUser, workerData, req) {
    const { name, email, phone, assignedWard, vehicleType } = workerData;

    if (!name || !email) {
      throw new Error('Worker name and work email are required.');
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new Error('A user account with this email already exists.');
    }

    const orgId = adminUser.organizationId || (await prisma.organization.findFirst())?.id;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });

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
        isEmailVerified: true,
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
      message: 'Worker provisioned successfully. Send the activation token to the worker.',
      worker: {
        id: newUser.id,
        workerId: newUser.workerProfile.workerId,
        name: newUser.name,
        email: newUser.email,
        orgCode: newUser.workerProfile.orgCode,
        assignedWard: newUser.workerProfile.assignedWard,
        activationToken,
        activationExpiry: tokenExpiry,
      },
    };
  }

  async listWorkers(orgId) {
    const where = orgId ? { organizationId: orgId } : {};
    return await prisma.workerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, status: true, isEmailVerified: true } },
        organization: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const authService = new AuthService();
