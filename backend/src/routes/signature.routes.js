import { Router } from 'express';

import { createSignature } from '../controllers/signature.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Semua endpoint tanda tangan wajib login
router.use(requireAuth);

// POST /api/maintenance/:id/signatures
router.post('/:id/signatures', createSignature);

export default router;