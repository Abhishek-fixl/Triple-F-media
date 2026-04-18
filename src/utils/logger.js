import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDirectory = path.join(__dirname, '..', 'storage', 'logs');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const redact = winston.format((info) => {
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'authorization', 'cookie', 'jwt'];

  const scrub = (value) => {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(scrub);
    }

    return Object.entries(value).reduce((acc, [key, currentValue]) => {
      acc[key] = sensitiveKeys.includes(key.toLowerCase()) ? '[REDACTED]' : scrub(currentValue);
      return acc;
    }, {});
  };

  return scrub(info);
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    redact(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDirectory, 'combined.log') }),
    new winston.transports.File({ filename: path.join(logDirectory, 'error.log'), level: 'error' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  );
}

export const morganStream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;
