
import { Router } from 'express';

import {
  getMaintenanceRecords,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  completeMaintenance,
} from '../controllers/maintenance.controller.js';

import {
  requireAuth,
  allowRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

// Melihat daftar dan detail maintenance.
router.get('/', getMaintenanceRecords);
router.get('/:id', getMaintenanceById);

// Membuat maintenance.
router.post(
  '/',
  allowRoles('ADMIN', 'TECHNICIAN'),
  createMaintenance,
);

// Endpoint khusus untuk menyelesaikan maintenance
// beserta tanda tangan kedua pihak.
router.patch(
  '/:id/complete',
  allowRoles('ADMIN', 'TECHNICIAN'),
  completeMaintenance,
);

// Mengedit maintenance biasa.
// Status COMPLETED ditolak oleh controller.
router.patch(
  '/:id',
  allowRoles('ADMIN', 'TECHNICIAN'),
  updateMaintenance,
);

export default router;
