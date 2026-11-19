
import { Router } from 'express';

import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
} from '../controllers/asset.controller.js';

import {
  requireAuth,
  allowRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

// Semua endpoint aset membutuhkan login.
router.use(requireAuth);

// Semua role boleh melihat daftar dan detail aset.
router.get('/', getAssets);
router.get('/:id', getAssetById);

// Hanya Admin dan Technician yang boleh mengelola aset.
router.post(
  '/',
  allowRoles('ADMIN', 'TECHNICIAN'),
  createAsset,
);

router.patch(
  '/:id',
  allowRoles('ADMIN', 'TECHNICIAN'),
  updateAsset,
);

export default router;
