import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import timesheetRoutes from './routes/timesheets.routes.js';
import editRequestRoutes from './routes/edit-requests.routes.js';
import projectRoutes from './routes/projects.routes.js';
import userRoutes from './routes/users.routes.js';
import departmentRoutes from './routes/departments.routes.js';
import reportRoutes from './routes/reports.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import teamRoutes from './routes/teams.routes.js';
import taskRoutes from './routes/tasks.routes.js';

import { startCronJobs } from './services/cron.service.js';

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 2000 : 200,
  message: { error: 'Too many requests, please try again later.' },
}));

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'YorkLog' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/edit-requests', editRequestRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🟢 YorkLog API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  startCronJobs();
});

export default app;



// restart


