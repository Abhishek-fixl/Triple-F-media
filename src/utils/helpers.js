import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import jwt from 'jsonwebtoken';

import AuditLog from '../models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ApiError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const sendSuccess = (res, statusCode, data, message) =>
  res.status(statusCode).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });

export const signJwtToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' },
  );

export const signScopedJwtToken = (payload, options = {}) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRE || '7d',
  });

export const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
};

export const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
});

export const parseFollowerBucketToNumber = (bucket) => {
  switch (bucket) {
    case '5k-10k':
      return 7500;
    case '10k-50k':
      return 30000;
    case '50k-200k':
      return 100000;
    case '200k+':
      return 250000;
    default:
      return 0;
  }
};

export const detectCityTier = (city) => {
  const value = String(city || '').trim().toLowerCase();
  if (['mumbai', 'delhi', 'new delhi', 'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'pune', 'kolkata'].includes(value)) {
    return 'metro';
  }
  if (['ahmedabad', 'jaipur', 'lucknow', 'indore', 'kochi', 'chandigarh', 'surat', 'nagpur', 'bhopal'].includes(value)) {
    return 'tier_2';
  }
  return 'tier_3';
};

export const getGeneratedFilePath = (fileName) => {
  const generatedDirectory = path.join(__dirname, '..', 'storage', 'generated');
  if (!fs.existsSync(generatedDirectory)) {
    fs.mkdirSync(generatedDirectory, { recursive: true });
  }
  return path.join(generatedDirectory, fileName);
};

export const getPublicGeneratedUrl = (fileName) =>
  `${process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`}/generated/${fileName.replace(/\\/g, '/')}`;

export const generateSequentialReference = (prefix) => {
  const timestamp = new Date().toISOString().replace(/[^\d]/g, '').slice(0, 14);
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${suffix}`;
};

export const buildPagination = ({ page = 1, limit = 10, total = 0 }) => {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
};

export const pick = (source, allowedFields) =>
  allowedFields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      acc[field] = source[field];
    }
    return acc;
  }, {});

export const createAuditLog = async ({ req, user, action, module, recordId, details }) => {
  if (!user?._id) return null;

  return AuditLog.create({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    action,
    module,
    recordId,
    details,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
};
