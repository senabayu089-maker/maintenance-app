
import prisma from '../config/database.js';

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

export const getMaintenanceReport = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      assetId,
      technicianId,
      maintenanceType,
      status,
      page = '1',
      limit = '20',
    } = req.query;

    const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);

    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 20),
    );

    const start = parseDate(startDate);
    const end = parseDate(endDate, true);

    if (startDate && !start) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startDate. Use YYYY-MM-DD format.',
      });
    }

    if (endDate && !end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid endDate. Use YYYY-MM-DD format.',
      });
    }

    if (start && end && start > end) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be later than endDate.',
      });
    }

    const where = {};

    if (start || end) {
      where.maintenanceDate = {};

      if (start) {
        where.maintenanceDate.gte = start;
      }

      if (end) {
        where.maintenanceDate.lte = end;
      }
    }

    if (assetId) {
      const id = Number(assetId);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assetId.',
        });
      }

      where.assetId = id;
    }

    if (technicianId) {
      const id = Number(technicianId);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid technicianId.',
        });
      }

      where.technicianId = id;
    }

    const allowedTypes = [
      'PREVENTIVE',
      'CORRECTIVE',
      'TROUBLESHOOTING',
      'HARDWARE_UPGRADE',
      'SOFTWARE_MAINTENANCE',
    ];

    const allowedStatuses = [
      'PENDING',
      'IN_PROGRESS',
      'WAITING_PARTS',
      'COMPLETED',
      'CANCELLED',
    ];

    if (maintenanceType) {
      if (!allowedTypes.includes(maintenanceType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid maintenanceType.',
        });
      }

      where.maintenanceType = maintenanceType;
    }

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status.',
        });
      }

      where.status = status;
    }

    const skip = (currentPage - 1) * pageSize;

    const [
      totalRecords,
      records,
      totalCompleted,
      totalPending,
      totalInProgress,
      totalWaitingParts,
      totalCancelled,
    ] = await Promise.all([
      prisma.maintenanceRecord.count({ where }),

      prisma.maintenanceRecord.findMany({
        where,
        orderBy: [
          { maintenanceDate: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: pageSize,
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              name: true,
              categoryId: true,
              brand: true,
              model: true,
              serialNumber: true,
              location: true,
              department: true,
              assignedTo: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          technician: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },

          signatures: {
            orderBy: {
              signedAt: 'asc',
            },
            select: {
              id: true,
              signerName: true,
              signerRole: true,
              signatureImage: true,
              signedAt: true,
            },
          },
        },
      }),

      prisma.maintenanceRecord.count({
        where: { ...where, status: 'COMPLETED' },
      }),

      prisma.maintenanceRecord.count({
        where: { ...where, status: 'PENDING' },
      }),

      prisma.maintenanceRecord.count({
        where: { ...where, status: 'IN_PROGRESS' },
      }),

      prisma.maintenanceRecord.count({
        where: { ...where, status: 'WAITING_PARTS' },
      }),

      prisma.maintenanceRecord.count({
        where: { ...where, status: 'CANCELLED' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Maintenance report retrieved successfully.',

      data: {
        summary: {
          total: totalRecords,
          completed: totalCompleted,
          pending: totalPending,
          inProgress: totalInProgress,
          waitingParts: totalWaitingParts,
          cancelled: totalCancelled,
        },

        pagination: {
          currentPage,
          pageSize,
          totalRecords,
          totalPages: Math.ceil(totalRecords / pageSize),
        },

        records,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REPORT FILTER OPTIONS
// ==========================================

export const getMaintenanceReportOptions = async (req, res, next) => {
  try {
    const [assets, technicians] = await Promise.all([
      prisma.asset.findMany({
        select: {
          id: true,
          assetCode: true,
          name: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          assetCode: 'asc',
        },
      }),

      prisma.user.findMany({
        where: {
          role: 'TECHNICIAN',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        assets,
        technicians,

        maintenanceTypes: [
          'PREVENTIVE',
          'CORRECTIVE',
          'TROUBLESHOOTING',
          'HARDWARE_UPGRADE',
          'SOFTWARE_MAINTENANCE',
        ],

        statuses: [
          'PENDING',
          'IN_PROGRESS',
          'WAITING_PARTS',
          'COMPLETED',
          'CANCELLED',
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};
