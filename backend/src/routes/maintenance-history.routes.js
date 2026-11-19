
import { Router } from 'express';
import {
  getMaintenanceHistory,
} from '../controllers/maintenance-history.controller.js';
import {
  requireAuth,
} from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/:id/history', getMaintenanceHistory);

export default router;
