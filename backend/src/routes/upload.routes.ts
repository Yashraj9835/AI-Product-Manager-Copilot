import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createUpload,
  getUploads,
  updateUpload,
} from '../controllers/upload.controller';

const router = Router();

router.post(
  '/uploads',
  authenticate,
  createUpload,
);

router.get(
  '/uploads',
  authenticate,
  getUploads,
);

router.patch(
  '/uploads/:id',
  authenticate,
  updateUpload,
);

export default router;