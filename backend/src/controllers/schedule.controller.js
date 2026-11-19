
import { prisma } from '../config/database.js';

const scheduleInclude = {
  asset: {
    select: {
      id: true,
      assetCode: true,
      name: true,
      categoryId: true,
      brand: true,
      model: true,
      location: true,
      department: true,
      assignedTo: true,
      status: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  },
  maintenanceRecord: {
    select: {
      id: true,
      maintenanceCode: true,
      maintenanceDate: true,
      status: true,
    },
  },
};

const allowedUpdateStatuses = ['SCHEDULED', 'CANCELLED'];

const validStatuses = [
  'SCHEDULED',
  'COMPLETED',
  'OVERDUE',
  'CANCELLED',
];

function parseId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function parseRepeatMonths(value) {
  if (value === null || value === '' || value === undefined) {
    return null;
  }

  const months = Number(value);

  if (!Number.isInteger(months) || months < 1 || months > 60) {
    return undefined;
  }

  return months;
}

// GET /api/schedules
export const getSchedules = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10),
    );

    const skip = (page - 1) * limit;

    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim().toUpperCase();

    const assetId = req.query.assetId
      ? parseId(req.query.assetId)
      : null;

    if (req.query.assetId && !assetId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assetId.',
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule status.',
      });
    }

    // Tandai jadwal yang sudah melewati tanggal pelaksanaan.
    // Jadwal selesai atau dibatalkan tidak akan diubah.
    await prisma.maintenanceSchedule.updateMany({
      where: {
        status: 'SCHEDULED',
        scheduledDate: {
          lt: new Date(),
        },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    const where = {
      ...(status ? { status } : {}),
      ...(assetId ? { assetId } : {}),
    };

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
          },
        },
        {
          description: {
            contains: search,
          },
        },
        {
          asset: {
            is: {
              assetCode: {
                contains: search,
              },
            },
          },
        },
        {
          asset: {
            is: {
              name: {
                contains: search,
              },
            },
          },
        },
        {
          asset: {
            is: {
              brand: {
                contains: search,
              },
            },
          },
        },
        {
          asset: {
            is: {
              model: {
                contains: search,
              },
            },
          },
        },
      ];
    }

    const [schedules, total] = await Promise.all([
      prisma.maintenanceSchedule.findMany({
        where,
        include: scheduleInclude,
        orderBy: [
          { scheduledDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),

      prisma.maintenanceSchedule.count({
        where,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: schedules,
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
};

// GET /api/schedules/:id
export const getScheduleById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule ID.',
      });
    }

    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: scheduleInclude,
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance schedule not found.',
      });
    }

    if (
      schedule.status === 'SCHEDULED' &&
      schedule.scheduledDate < new Date()
    ) {
      await prisma.maintenanceSchedule.update({
        where: { id },
        data: {
          status: 'OVERDUE',
        },
      });

      schedule.status = 'OVERDUE';
    }

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/schedules
export const createSchedule = async (req, res, next) => {
  try {
    const {
      assetId,
      title,
      description,
      scheduledDate,
      repeatMonths,
    } = req.body;

    const parsedAssetId = parseId(assetId);
    const parsedDate = parseDate(scheduledDate);
    const parsedRepeatMonths = parseRepeatMonths(repeatMonths);

    if (!parsedAssetId) {
      return res.status(400).json({
        success: false,
        message: 'Valid assetId is required.',
      });
    }

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Schedule title is required.',
      });
    }

    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: 'Valid scheduledDate is required.',
      });
    }

    if (parsedRepeatMonths === undefined) {
      return res.status(400).json({
        success: false,
        message: 'repeatMonths must be between 1 and 60, or null.',
      });
    }

    // Pastikan aset tersedia.
    const asset = await prisma.asset.findUnique({
      where: {
        id: parsedAssetId,
      },
      select: {
        id: true,
        assetCode: true,
        name: true,
        categoryId: true,
      },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found.',
      });
    }

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId: parsedAssetId,
        createdById: req.user.id,
        title: title.trim(),
        description:
          typeof description === 'string'
            ? description.trim() || null
            : null,
        scheduledDate: parsedDate,
        repeatMonths: parsedRepeatMonths,
      },
      include: scheduleInclude,
    });

    return res.status(201).json({
      success: true,
      message: 'Maintenance schedule created successfully.',
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/schedules/:id
export const updateSchedule = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule ID.',
      });
    }

    const existing = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        maintenanceRecord: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance schedule not found.',
      });
    }

    if (
      existing.status === 'COMPLETED' ||
      existing.status === 'CANCELLED'
    ) {
      return res.status(409).json({
        success: false,
        message: 'Completed or cancelled schedules cannot be modified.',
      });
    }

    const {
      assetId,
      title,
      description,
      scheduledDate,
      repeatMonths,
      status,
    } = req.body;

    const data = {};

    if (assetId !== undefined) {
      const parsedAssetId = parseId(assetId);

      if (!parsedAssetId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assetId.',
        });
      }

      const asset = await prisma.asset.findUnique({
        where: {
          id: parsedAssetId,
        },
        select: {
          id: true,
          assetCode: true,
          name: true,
          categoryId: true,
        },
      });

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Asset not found.',
        });
      }

      // Jangan mengubah aset jika jadwal sudah memiliki catatan maintenance.
      if (
        existing.maintenanceRecord &&
        parsedAssetId !== existing.assetId
      ) {
        return res.status(409).json({
          success: false,
          message: 'The asset cannot be changed because a maintenance record is already linked.',
        });
      }

      data.assetId = parsedAssetId;
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Schedule title cannot be empty.',
        });
      }

      data.title = title.trim();
    }

    if (description !== undefined) {
      if (
        description !== null &&
        typeof description !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid description.',
        });
      }

      data.description =
        typeof description === 'string'
          ? description.trim() || null
          : null;
    }

    if (scheduledDate !== undefined) {
      const parsedDate = parseDate(scheduledDate);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message: 'Invalid scheduledDate.',
        });
      }

      data.scheduledDate = parsedDate;
    }

    if (repeatMonths !== undefined) {
      const parsedMonths = parseRepeatMonths(repeatMonths);

      if (parsedMonths === undefined) {
        return res.status(400).json({
          success: false,
          message: 'repeatMonths must be between 1 and 60, or null.',
        });
      }

      data.repeatMonths = parsedMonths;
    }

    if (status !== undefined) {
      const normalizedStatus = String(status).toUpperCase();

      if (!allowedUpdateStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: 'A schedule can only be cancelled through this endpoint. To complete it, complete its maintenance record.',
        });
      }

      if (
        normalizedStatus === 'CANCELLED' &&
        existing.maintenanceRecord
      ) {
        return res.status(409).json({
          success: false,
          message: 'This schedule already has a maintenance record. Update the maintenance record instead.',
        });
      }

      data.status = normalizedStatus;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.',
      });
    }

    const updated = await prisma.maintenanceSchedule.update({
      where: { id },
      data,
      include: scheduleInclude,
    });

    return res.status(200).json({
      success: true,
      message:
        updated.status === 'CANCELLED'
          ? 'Maintenance schedule cancelled successfully.'
          : 'Maintenance schedule updated successfully.',
      data: updated,
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'The selected asset or user is invalid.',
      });
    }

    next(error);
  }
};
