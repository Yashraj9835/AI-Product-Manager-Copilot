import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
  createFeedbackSchema,
  updateFeedbackSchema,
  queryFeedbackSchema,
  analyzeSchema,
} from '../validators/feedback.validator';
import {
  createFeedback,
  getFeedbackList,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
} from '../controllers/feedback.controller';
import { getStats } from '../controllers/stats.controller';
import { analyzeFeedback } from '../controllers/analyze.controller';

const router = Router();

// ── Feedback CRUD (Protected: requires logged in user) ──
router.post('/feedback', authenticate, validate(createFeedbackSchema), createFeedback);
router.get('/feedback', authenticate, validate(queryFeedbackSchema), getFeedbackList);
router.get('/feedback/:id', authenticate, getFeedbackById);
router.put('/feedback/:id', authenticate, validate(updateFeedbackSchema), updateFeedback);

// ── Delete Feedback (Protected: requires admin role) ──
router.delete('/feedback/:id', authenticate, authorize('admin'), deleteFeedback);

// ── Dashboard stats (Protected: requires logged in user) ──
router.get('/stats', authenticate, getStats);

// ── Analysis proxy (Unprotected stub → Yash's FastAPI) ──
router.post('/analyze', validate(analyzeSchema), analyzeFeedback);

export default router;
