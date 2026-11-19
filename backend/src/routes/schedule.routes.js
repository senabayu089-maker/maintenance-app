
import { Router } from 'express';

import {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
} from '../controllers/schedule.controller.js';

import {
  requireAuth,
  allowRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

// Semua endpoint jadwal membutuhkan login.
router.use(requireAuth);

// Semua role yang sudah login dapat melihat jadwal.
router.get('/', getSchedules);
router.get('/:id', getScheduleById);

// Hanya ADMIN dan TECHNICIAN yang dapat mengelola jadwal.
router.post(
  '/',
  allowRoles('ADMIN', 'TECHNICIAN'),
  createSchedule,
);

router.patch(
  '/:id',
  allowRoles('ADMIN', 'TECHNICIAN'),
  updateSchedule,
);

export default router;
