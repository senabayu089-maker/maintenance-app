import express from 'express';

import {
  getMaintenanceReport,
  getMaintenanceReportOptions,
} from '../controllers/report.controller.js';

import {
  exportMaintenanceExcel,
  exportMaintenancePdf,
} from '../controllers/reportExport.controller.js';

import {
  requireAuth,
  allowRoles,
} from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get(
  '/options',
  allowRoles('ADMIN', 'TECHNICIAN'),
  getMaintenanceReportOptions,
);

router.get(
  '/maintenance',
  allowRoles('ADMIN', 'TECHNICIAN'),
  getMaintenanceReport,
);

router.get(
  '/maintenance/export/excel',
  allowRoles('ADMIN', 'TECHNICIAN'),
  exportMaintenanceExcel,
);

router.get(
  '/maintenance/export/pdf',
  allowRoles('ADMIN', 'TECHNICIAN'),
  exportMaintenancePdf,
);

export default router;