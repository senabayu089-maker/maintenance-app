
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import assetRoutes from './routes/asset.routes.js';
import assetCategoryRoutes from './routes/asset-category.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import maintenanceHistoryRoutes from './routes/maintenance-history.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportRoutes from './routes/report.routes.js';

import {
  notFoundHandler,
  errorHandler,
} from './middleware/error.middleware.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lokasi frontend hasil build
const frontendDistPath = path.resolve(
  __dirname,
  '../../frontend/dist'
);

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  config.frontendUrl,
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (config.environment === 'development') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ==========================================
// GENERAL MIDDLEWARE
// ==========================================

// Nonaktifkan upgrade-insecure-requests karena
// aplikasi LAN saat ini masih menggunakan HTTP.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: null,
      },
    },
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.environment === 'development') {
  app.use(morgan('dev'));
}

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PC Maintenance API is running.',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// API ROUTES
// ==========================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use('/api/assets', assetRoutes);
app.use('/api/asset-categories', assetCategoryRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/maintenance', maintenanceHistoryRoutes);

app.use('/api/schedules', scheduleRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: `${config.appName} API is working.`,
  });
});

// ==========================================
// API 404 HANDLER
// ==========================================

app.use('/api', notFoundHandler);

// ==========================================
// FRONTEND PRODUCTION FILES
// ==========================================

app.use(express.static(frontendDistPath));

// ==========================================
// VUE ROUTER FALLBACK
// ==========================================

app.get('*', (req, res, next) => {
  res.sendFile(
    path.join(frontendDistPath, 'index.html'),
    (error) => {
      if (error) {
        next(error);
      }
    }
  );
});

// ==========================================
// ERROR HANDLING
// ==========================================

app.use(errorHandler);

export default app;
