
import { Router } from 'express';

import {
  getUsers,
  createUser,
  updateUser,
} from '../controllers/user.controller.js';

import {
  requireAuth,
  allowRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(allowRoles('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);

export default router;
