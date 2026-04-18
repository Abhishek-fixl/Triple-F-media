import crypto from 'crypto';

import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import {
  ApiError,
  asyncHandler,
  clearAuthCookie,
  sanitizeUser,
  sendSuccess,
  setAuthCookie,
  signJwtToken,
} from '../utils/helpers.js';
import { USER_ROLES } from '../utils/constants.js';

const defaultSeedUsers = [
  {
    name: process.env.ADMIN_NAME || 'Triple F Super Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: USER_ROLES.SUPER_ADMIN,
  },
  {
    name: process.env.CAMPAIGN_MANAGER_NAME || 'Triple F Campaign Manager',
    email: process.env.CAMPAIGN_MANAGER_EMAIL || 'campaign.manager@triplef.com',
    password: process.env.CAMPAIGN_MANAGER_PASSWORD || 'Manager@123',
    role: USER_ROLES.CAMPAIGN_MANAGER,
  },
  {
    name: process.env.FINANCE_MANAGER_NAME || 'Triple F Finance Manager',
    email: process.env.FINANCE_MANAGER_EMAIL || 'finance.manager@triplef.com',
    password: process.env.FINANCE_MANAGER_PASSWORD || 'Finance@123',
    role: USER_ROLES.FINANCE_MANAGER,
  },
  {
    name: process.env.ONBOARDING_SPECIALIST_NAME || 'Triple F Onboarding Specialist',
    email: process.env.ONBOARDING_SPECIALIST_EMAIL || 'onboarding.specialist@triplef.com',
    password: process.env.ONBOARDING_SPECIALIST_PASSWORD || 'Onboard@123',
    role: USER_ROLES.ONBOARDING_SPECIALIST,
  },
];

const createSeedUserIfMissing = async ({ name, email, password, role }) => {
  if (!email || !password) {
    throw new Error(`Seed credentials missing for role: ${role}`);
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (existingUser) {
    return existingUser;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role,
    isActive: true,
  });
};

export const ensureDefaultAdminUsers = async () => Promise.all(defaultSeedUsers.map(createSeedUserIfMissing));

export const ensureDefaultAdminUser = async () => {
  const [superAdmin] = await ensureDefaultAdminUsers();
  return superAdmin;
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role || USER_ROLES.CAMPAIGN_MANAGER,
    isActive: true,
  });

  const token = signJwtToken(user);
  setAuthCookie(res, token);

  sendSuccess(
    res,
    201,
    {
      user: sanitizeUser(user),
      token,
    },
    'User registered successfully',
  );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();

  sendSuccess(
    res,
    200,
    { resetToken },
    'Password reset link sent. Use the resetToken to reset your password.',
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_TOKEN');
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  sendSuccess(res, 200, {}, 'Password reset successfully. Please login with your new password.');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, 'Server configuration error', 'JWT_SECRET_MISSING');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  user.lastLogin = new Date();
  await user.save();

  const token = signJwtToken(user);
  setAuthCookie(res, token);

  sendSuccess(
    res,
    200,
    {
      user: sanitizeUser(user),
      token,
    },
    'Login successful',
  );
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  sendSuccess(res, 200, {}, 'Logout successful');
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, { user: sanitizeUser(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  clearAuthCookie(res);
  sendSuccess(res, 200, {}, 'Password changed successfully. Please login again.');
});
