import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import feedbackRoutes from './routes/feedback.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ── CORS ──
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

// ── Body parsing ──
app.use(express.json({ limit: '10mb' })); // Large body for bulk imports
app.use(express.urlencoded({ extended: true }));

// ── Root info ──
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'AI Product Manager Copilot API',
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me',
      feedbackList: 'GET /api/feedback',
      feedbackSingle: 'GET /api/feedback/:id',
      stats: 'GET /api/stats',
      createFeedback: 'POST /api/feedback',
      updateFeedback: 'PUT /api/feedback/:id',
      deleteFeedback: 'DELETE /api/feedback/:id',
      analyze: 'POST /api/analyze',
    },
    documentation: 'See backend/README.md for full details',
  });
});

// ── Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'AI PM Copilot API is running' });
});

// ── Auth routes ──
app.use('/api/auth', authRoutes);

// ── API routes (Feedback, Stats, Analyze) ──
app.use('/api', feedbackRoutes);

// ── Global error handler (must be LAST) ──
app.use(errorHandler);

export default app;
