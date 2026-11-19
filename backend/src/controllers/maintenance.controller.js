
import { randomBytes } from 'node:crypto';
import prisma from '../config/database.js';

const MAINTENANCE_TYPES = [
  'PREVENTIVE',
  'CORRECTIVE',
  'TROUBLESHOOTING',
  'HARDWARE_UPGRADE',
  'SOFTWARE_MAINTENANCE',
];

const MAINTENANCE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'COMPLETED',
  'CANCELLED',
];

const MAINTENANCE_RESULTS = [
  'NORMAL',
  'NEEDS_REPAIR',
  'WAITING_PARTS',
  'NOT_OPERATIONAL',
];

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a,
]);

const MAINTENANCE_INCLUDE = {
  asset: true,
  technician: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  },
  schedule: {
    select: {
      id: true,
      title: true,
      scheduledDate: true,
      repeatMonths: true,
      status: true,
    },
  },
  signatures: {
    include: {
      signer: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  },
};

function parseId(value) {
  const id = Number.parseInt(value, 10);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseDate(value) {
  if (value === null || value === '') return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function generateMaintenanceCode() {
  const date = new Date();

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');

  const randomPart = randomBytes(3).toString('hex').toUpperCase();

  return `MNT-${datePart}-${randomPart}`;
}

function addMonthsClamped(date, months) {
  const result = new Date(date);
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDay = new Date(
    Date.UTC(
      result.getUTCFullYear(),
      result.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDay));

  return result;
}

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Memvalidasi gambar tanda tangan PNG dalam format Data URL.
 * Ukuran maksimum gambar hasil decode adalah 2 MB.
 */
function validateSignatureImage(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createHttpError(
      400,
      `${fieldName} is required.`,
    );
  }

  const prefix = 'data:image/png;base64,';

  if (!value.startsWith(prefix)) {
    throw createHttpError(
      400,
      `${fieldName} must be a PNG image.`,
    );
  }

  const base64 = value.slice(prefix.length);

  if (
    !base64 ||
    base64.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)
  ) {
    throw createHttpError(
      400,
      `${fieldName} contains invalid Base64 data.`,
    );
  }

  const imageBuffer = Buffer.from(base64, 'base64');

  if (imageBuffer.length === 0) {
    throw createHttpError(
      400,
      `${fieldName} is empty.`,
    );
  }

  if (imageBuffer.length > MAX_SIGNATURE_SIZE) {
    throw createHttpError(
      400,
      `${fieldName} must not exceed 2 MB.`,
    );
  }

  if (
    imageBuffer.length < PNG_SIGNATURE.length ||
    !imageBuffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw createHttpError(
      400,
      `${fieldName} is not a valid PNG image.`,
    );
  }

  return value;
}

// ======================================================
// GET /api/maintenance
// ======================================================

export async function getMaintenanceRecords(req, res, next) {
  try {
    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').toUpperCase();
    const type = String(req.query.type || '').toUpperCase();

    const assetId = req.query.assetId
      ? parseId(req.query.assetId)
      : null;

    if (status && !MAINTENANCE_STATUSES.includes(status)) {
      return sendError(res, 400, 'Invalid maintenance status.');
    }

    if (type && !MAINTENANCE_TYPES.includes(type)) {
      return sendError(res, 400, 'Invalid maintenance type.');
    }

    if (req.query.assetId && !assetId) {
      return sendError(res, 400, 'Invalid asset ID.');
    }

    const where = {};

    if (status) where.status = status;
    if (type) where.maintenanceType = type;
    if (assetId) where.assetId = assetId;

    if (search) {
      where.OR = [
        { maintenanceCode: { contains: search } },
        { description: { contains: search } },
        { actionTaken: { contains: search } },
        { findings: { contains: search } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.maintenanceRecord.findMany({
        where,
        include: MAINTENANCE_INCLUDE,
        orderBy: [
          { maintenanceDate: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.maintenanceRecord.count({ where }),
    ]);

    return res.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// GET /api/maintenance/:id
// ======================================================

export async function getMaintenanceById(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return sendError(res, 400, 'Invalid maintenance ID.');
    }

    const record = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        ...MAINTENANCE_INCLUDE,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!record) {
      return sendError(res, 404, 'Maintenance record not found.');
    }

    return res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// POST /api/maintenance
// ======================================================

export async function createMaintenance(req, res, next) {
  try {
    const assetId = parseId(req.body.assetId);

    const scheduleId =
      req.body.scheduleId === undefined ||
      req.body.scheduleId === null ||
      req.body.scheduleId === ''
        ? null
        : parseId(req.body.scheduleId);

    const maintenanceDate = parseDate(req.body.maintenanceDate);

    const nextMaintenanceDate = req.body.nextMaintenanceDate
      ? parseDate(req.body.nextMaintenanceDate)
      : null;

    const maintenanceType = String(
      req.body.maintenanceType || '',
    ).toUpperCase();

    const description = String(req.body.description || '').trim();

    if (!assetId) {
      return sendError(res, 400, 'A valid assetId is required.');
    }

    if (req.body.scheduleId && !scheduleId) {
      return sendError(res, 400, 'Invalid scheduleId.');
    }

    if (!maintenanceDate) {
      return sendError(res, 400, 'A valid maintenanceDate is required.');
    }

    if (
      req.body.nextMaintenanceDate &&
      nextMaintenanceDate === undefined
    ) {
      return sendError(res, 400, 'Invalid nextMaintenanceDate.');
    }

    if (!MAINTENANCE_TYPES.includes(maintenanceType)) {
      return sendError(res, 400, 'Invalid maintenanceType.');
    }

    if (!description) {
      return sendError(res, 400, 'Description is required.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
        select: {
          id: true,
          assetCode: true,
          name: true,
          categoryId: true,
        },
      });

      if (!asset) {
        throw createHttpError(404, 'Asset not found.');
      }

      if (scheduleId) {
        const schedule = await tx.maintenanceSchedule.findUnique({
          where: { id: scheduleId },
          include: {
            maintenanceRecord: {
              select: { id: true },
            },
          },
        });

        if (!schedule) {
          throw createHttpError(
            404,
            'Maintenance schedule not found.',
          );
        }

        if (schedule.assetId !== assetId) {
          throw createHttpError(
            400,
            'The selected schedule belongs to a different PC asset.',
          );
        }

        if (
          schedule.status === 'COMPLETED' ||
          schedule.status === 'CANCELLED'
        ) {
          throw createHttpError(
            409,
            'This schedule is already completed or cancelled.',
          );
        }

        if (schedule.maintenanceRecord) {
          throw createHttpError(
            409,
            'A maintenance record already exists for this schedule.',
          );
        }
      }

      const record = await tx.maintenanceRecord.create({
        data: {
          maintenanceCode: generateMaintenanceCode(),
          assetId,
          technicianId: req.user.id,
          scheduleId,
          maintenanceDate,
          maintenanceType,
          description,
          actionTaken: req.body.actionTaken
            ? String(req.body.actionTaken).trim()
            : null,
          findings: req.body.findings
            ? String(req.body.findings).trim()
            : null,
          nextMaintenanceDate,
        },
      });

      await tx.maintenanceHistory.create({
        data: {
          maintenanceId: record.id,
          changedBy: req.user.id,
          oldStatus: null,
          newStatus: record.status,
          remarks: scheduleId
            ? 'Catatan maintenance dibuat berdasarkan jadwal.'
            : 'Catatan maintenance dibuat secara manual.',
        },
      });

      return tx.maintenanceRecord.findUnique({
        where: { id: record.id },
        include: {
          ...MAINTENANCE_INCLUDE,
          history: true,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Maintenance record created successfully.',
      data: result,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return sendError(
        res,
        409,
        'This schedule already has a maintenance record, or the maintenance code already exists.',
      );
    }

    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }

    next(error);
  }
}

// ======================================================
// PATCH /api/maintenance/:id
// Mengedit maintenance tanpa menyelesaikannya.
// Status COMPLETED hanya boleh melalui endpoint complete.
// ======================================================

export async function updateMaintenance(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return sendError(res, 400, 'Invalid maintenance ID.');
    }

    const existing = await prisma.maintenanceRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return sendError(res, 404, 'Maintenance record not found.');
    }

    if (req.body.status !== undefined) {
      const requestedStatus = String(req.body.status).toUpperCase();

      if (requestedStatus === 'COMPLETED') {
        return sendError(
          res,
          400,
          'Use the completion endpoint to complete maintenance and submit signatures.',
        );
      }
    }

    const data = {};
    const remarks = [];

    if (req.body.maintenanceDate !== undefined) {
      const date = parseDate(req.body.maintenanceDate);

      if (!date) {
        return sendError(res, 400, 'Invalid maintenanceDate.');
      }

      data.maintenanceDate = date;
      remarks.push('Tanggal maintenance diperbarui.');
    }

    if (req.body.maintenanceType !== undefined) {
      const type = String(req.body.maintenanceType).toUpperCase();

      if (!MAINTENANCE_TYPES.includes(type)) {
        return sendError(res, 400, 'Invalid maintenanceType.');
      }

      data.maintenanceType = type;
      remarks.push('Jenis maintenance diperbarui.');
    }

    if (req.body.description !== undefined) {
      const description = String(req.body.description).trim();

      if (!description) {
        return sendError(res, 400, 'Description cannot be empty.');
      }

      data.description = description;
      remarks.push('Deskripsi pekerjaan diperbarui.');
    }

    if (req.body.actionTaken !== undefined) {
      data.actionTaken = req.body.actionTaken
        ? String(req.body.actionTaken).trim()
        : null;

      remarks.push('Tindakan yang dilakukan diperbarui.');
    }

    if (req.body.findings !== undefined) {
      data.findings = req.body.findings
        ? String(req.body.findings).trim()
        : null;

      remarks.push('Hasil pemeriksaan diperbarui.');
    }

    if (req.body.result !== undefined) {
      if (req.body.result === null || req.body.result === '') {
        data.result = null;
      } else {
        const result = String(req.body.result).toUpperCase();

        if (!MAINTENANCE_RESULTS.includes(result)) {
          return sendError(res, 400, 'Invalid maintenance result.');
        }

        data.result = result;
      }

      remarks.push('Hasil maintenance diperbarui.');
    }

    if (req.body.status !== undefined) {
      const status = String(req.body.status).toUpperCase();

      if (!MAINTENANCE_STATUSES.includes(status)) {
        return sendError(res, 400, 'Invalid maintenance status.');
      }

      if (existing.status === 'COMPLETED') {
        return sendError(
          res,
          409,
          'Completed maintenance records cannot be reopened or cancelled.',
        );
      }

      data.status = status;

      if (status !== existing.status) {
        remarks.push(
          `Status berubah dari ${existing.status} menjadi ${status}.`,
        );
      }
    }

    if (req.body.nextMaintenanceDate !== undefined) {
      if (
        req.body.nextMaintenanceDate === null ||
        req.body.nextMaintenanceDate === ''
      ) {
        data.nextMaintenanceDate = null;
      } else {
        const date = parseDate(req.body.nextMaintenanceDate);

        if (!date) {
          return sendError(res, 400, 'Invalid nextMaintenanceDate.');
        }

        data.nextMaintenanceDate = date;
      }

      remarks.push('Jadwal maintenance berikutnya diperbarui.');
    }

    if (Object.keys(data).length === 0) {
      return sendError(
        res,
        400,
        'No valid fields provided for update.',
      );
    }

    const newStatus = data.status ?? existing.status;

    const result = await prisma.$transaction(async (tx) => {
      await tx.maintenanceRecord.update({
        where: { id },
        data,
      });

      await tx.maintenanceHistory.create({
        data: {
          maintenanceId: id,
          changedBy: req.user.id,
          oldStatus: existing.status,
          newStatus,
          remarks: remarks.join(' ') || 'Data maintenance diperbarui.',
        },
      });

      return tx.maintenanceRecord.findUnique({
        where: { id },
        include: {
          ...MAINTENANCE_INCLUDE,
          history: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    return res.json({
      success: true,
      message: 'Maintenance record updated successfully.',
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }

    next(error);
  }
}

// ======================================================
// PATCH /api/maintenance/:id/complete
//
// Menyelesaikan maintenance dan menyimpan tanda tangan
// dalam satu transaksi database.
// ======================================================


export async function completeMaintenance(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return sendError(res, 400, 'Invalid maintenance ID.');
    }

    const userSignerName = String(
      req.body.userSignerName || '',
    ).trim();

    if (!userSignerName) {
      return sendError(
        res,
        400,
        'Nama penanggung jawab PC wajib diisi.',
      );
    }

    if (userSignerName.length > 150) {
      return sendError(
        res,
        400,
        'Nama penanggung jawab maksimal 150 karakter.',
      );
    }

    const userSignatureImage = validateSignatureImage(
      req.body.userSignatureImage,
      'userSignatureImage',
    );

    let technicianSignatureImage = null;

    if (
      req.body.technicianSignatureImage !== undefined &&
      req.body.technicianSignatureImage !== null &&
      req.body.technicianSignatureImage !== ''
    ) {
      technicianSignatureImage = validateSignatureImage(
        req.body.technicianSignatureImage,
        'technicianSignatureImage',
      );
    }

    if (!req.user?.id || !req.user?.name) {
      return sendError(
        res,
        401,
        'Authenticated technician information is unavailable.',
      );
    }

    // Validasi data hasil pekerjaan.
    const findings = req.body.findings !== undefined
      ? String(req.body.findings || '').trim()
      : undefined;

    const actionTaken = req.body.actionTaken !== undefined
      ? String(req.body.actionTaken || '').trim()
      : undefined;

    let maintenanceResult;

    if (req.body.result !== undefined) {
      if (req.body.result === null || req.body.result === '') {
        maintenanceResult = null;
      } else {
        maintenanceResult = String(req.body.result).toUpperCase();

        if (!MAINTENANCE_RESULTS.includes(maintenanceResult)) {
          return sendError(
            res,
            400,
            'Invalid maintenance result.',
          );
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.maintenanceRecord.findUnique({
        where: { id },
        include: {
          schedule: true,
        },
      });

      if (!existing) {
        throw createHttpError(
          404,
          'Maintenance record not found.',
        );
      }

      if (existing.status === 'COMPLETED') {
        throw createHttpError(
          409,
          'This maintenance record has already been completed.',
        );
      }

      if (existing.status === 'CANCELLED') {
        throw createHttpError(
          409,
          'Cancelled maintenance cannot be completed.',
        );
      }

      if (existing.scheduleId) {
        if (!existing.schedule) {
          throw createHttpError(
            404,
            'The linked maintenance schedule was not found.',
          );
        }

        if (
          existing.schedule.status === 'COMPLETED' ||
          existing.schedule.status === 'CANCELLED'
        ) {
          throw createHttpError(
            409,
            'The linked schedule is already completed or cancelled.',
          );
        }
      }

      // Simpan tanda tangan penanggung jawab PC.
      await tx.maintenanceSignature.create({
        data: {
          maintenanceId: id,
          signerId: null,
          signerName: userSignerName,
          signerRole: 'USER',
          signatureImage: userSignatureImage,
        },
      });

      // Simpan tanda tangan teknisi jika tersedia.
      if (technicianSignatureImage) {
        await tx.maintenanceSignature.create({
          data: {
            maintenanceId: id,
            signerId: req.user.id,
            signerName: req.user.name,
            signerRole: 'TECHNICIAN',
            signatureImage: technicianSignatureImage,
          },
        });
      }

      // Simpan hasil pekerjaan dan selesaikan maintenance.
      const updateData = {
        status: 'COMPLETED',
        completedAt: new Date(),
      };

      if (findings !== undefined) {
        updateData.findings = findings || null;
      }

      if (actionTaken !== undefined) {
        updateData.actionTaken = actionTaken || null;
      }

      if (maintenanceResult !== undefined) {
        updateData.result = maintenanceResult;
      }

      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: updateData,
      });

      await tx.maintenanceHistory.create({
        data: {
          maintenanceId: id,
          changedBy: req.user.id,
          oldStatus: existing.status,
          newStatus: 'COMPLETED',
          remarks: technicianSignatureImage
            ? 'Maintenance diselesaikan dengan tanda tangan penanggung jawab PC dan teknisi.'
            : 'Maintenance diselesaikan dengan tanda tangan penanggung jawab PC.',
        },
      });

      let completedSchedule = null;
      let nextSchedule = null;

      if (existing.scheduleId) {
        const schedule = existing.schedule;

        completedSchedule = await tx.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: {
            status: 'COMPLETED',
          },
        });

        if (schedule.repeatMonths && schedule.repeatMonths > 0) {
          const nextDate = addMonthsClamped(
            updated.maintenanceDate,
            schedule.repeatMonths,
          );

          nextSchedule = await tx.maintenanceSchedule.create({
            data: {
              assetId: schedule.assetId,
              createdById: schedule.createdById,
              title: schedule.title,
              description: schedule.description,
              scheduledDate: nextDate,
              repeatMonths: schedule.repeatMonths,
            },
          });
        }
      }

      const fullRecord = await tx.maintenanceRecord.findUnique({
        where: { id },
        include: {
          ...MAINTENANCE_INCLUDE,
          history: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return {
        record: fullRecord,
        completedSchedule,
        nextSchedule,
      };
    });

    return res.json({
      success: true,
      message: 'Maintenance completed successfully. Signatures have been saved.',
      data: result.record,
      completedSchedule: result.completedSchedule,
      nextSchedule: result.nextSchedule,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return sendError(
        res,
        409,
        'A signature already exists for this signer role on this maintenance record.',
      );
    }

    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }

    next(error);
  }
}

