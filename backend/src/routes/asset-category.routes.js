
import { Router } from 'express';

import {
  getAssetCategories,
  getAssetCategoryById,
  createAssetCategory,
  updateAssetCategory,
  updateAssetCategoryStatus,
  deleteAssetCategory,
} from '../controllers/asset-category.controller.js';

import {
  requireAuth,
  allowRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

// Semua role boleh melihat kategori.
router.get('/', getAssetCategories);
router.get('/:id', getAssetCategoryById);

// Hanya Admin dan Technician yang boleh mengelola kategori.
router.post(
  '/',
  allowRoles('ADMIN', 'TECHNICIAN'),
  createAssetCategory,
);

router.patch(
  '/:id/status',
  allowRoles('ADMIN', 'TECHNICIAN'),
  updateAssetCategoryStatus,
);

router.patch(
  '/:id',
  allowRoles('ADMIN', 'TECHNICIAN'),
  updateAssetCategory,
);

router.delete(
  '/:id',
  allowRoles('ADMIN', 'TECHNICIAN'),
  deleteAssetCategory,
);

export default router;
