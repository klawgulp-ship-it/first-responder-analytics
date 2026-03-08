import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import authRoutes from './api/routes/auth';
import dashboardRoutes from './api/routes/dashboard';
import incidentRoutes from './api/routes/incidents';
import unitRoutes from './api/routes/units';
import analyticsRoutes from './api/routes/analytics';
import aiRoutes from './api/routes/ai';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Trust proxy (Railway, Render, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for dashboard SPA
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : true,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// AI endpoints get a more generous limit
const aiLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: { success: false, error: 'AI query rate limit reached. Please wait.' },
});
app.use('/api/ai/', aiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Serve React dashboard in production
app.use(express.static(path.join(__dirname, '../dashboard/dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }
  res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   First Responder Analytics Platform v1.0.0      ║
║   Server running on port ${PORT}                    ║
║   Environment: ${process.env.NODE_ENV || 'development'}                  ║
╚══════════════════════════════════════════════════╝
  `);
});

export default app;
