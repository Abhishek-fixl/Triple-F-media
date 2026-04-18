import 'dotenv/config';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import adminRoutes from './routes/adminRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import authRoutes from './routes/authRoutes.js';
// import brandPortalRoutes from './routes/brandPortalRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
// import creatorPortalRoutes from './routes/creatorPortalRoutes.js';
import creatorRoutes from './routes/creatorRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import publicPaymentRoutes from './routes/publicPaymentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import errorHandler, { notFoundHandler } from './middleware/errorHandler.js';
import { morganStream } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);

const isDev = (process.env.NODE_ENV || 'development') === 'development';

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'https://fff-media.vercel.app',
  'https://superadmin-fff-media.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

// Add CORS preflight handling for all routes
app.options('*', cors());

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Check allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow localhost in development
      if (isDev && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      
      // Block other origins
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: morganStream }));

app.use('/generated', express.static(path.join(__dirname, 'storage', 'generated')));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/health', (_req, res) => {
  res.redirect(302, '/api/health');
});

app.use('/api/admin/campaigns', campaignRoutes);
app.use('/api/admin/payments', paymentRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/admin/leads', leadRoutes);
app.use('/api/admin/whatsapp', whatsappRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/payments', publicPaymentRoutes);
// app.use('/api/brand', brandPortalRoutes);
// app.use('/api/creator', creatorPortalRoutes);
app.use('/api', fileRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/webhooks', webhookRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
