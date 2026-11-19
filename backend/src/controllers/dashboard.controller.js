
import prisma from '../config/database.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const now = new Date();

    const [
      totalAssets,
      activeAssets,
      maintenanceAssets,
      brokenAssets,
      inactiveAssets,

      pendingMaintenance,
      inProgressMaintenance,
      waitingPartsMaintenance,
      completedMaintenance,
      cancelledMaintenance,

      scheduledSchedules,
      overdueSchedules,

      upcomingSchedules,
      recentMaintenance,
    ] = await Promise.all([
      // ======================================
      // ASSETS
      // ======================================

      prisma.asset.count(),

      prisma.asset.count({
        where: { status: 'ACTIVE' },
      }),

      prisma.asset.count({
        where: { status: 'MAINTENANCE' },
      }),

      prisma.asset.count({
        where: { status: 'BROKEN' },
      }),

      prisma.asset.count({
        where: { status: 'INACTIVE' },
      }),

      // ======================================
      // MAINTENANCE RECORDS
      // ======================================

      prisma.maintenanceRecord.count({
        where: { status: 'PENDING' },
      }),

      prisma.maintenanceRecord.count({
        where: { status: 'IN_PROGRESS' },
      }),

      prisma.maintenanceRecord.count({
        where: { status: 'WAITING_PARTS' },
      }),

      prisma.maintenanceRecord.count({
        where: { status: 'COMPLETED' },
      }),

      prisma.maintenanceRecord.count({
        where: { status: 'CANCELLED' },
      }),

      // ======================================
      // MAINTENANCE SCHEDULES
      // ======================================

      prisma.maintenanceSchedule.count({
        where: { status: 'SCHEDULED' },
      }),

      prisma.maintenanceSchedule.count({
        where: {
          OR: [
            { status: 'OVERDUE' },
            {
              status: 'SCHEDULED',
              scheduledDate: { lt: now },
            },
          ],
        },
      }),

      // ======================================
      // UPCOMING SCHEDULES
      // ======================================

      prisma.maintenanceSchedule.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledDate: { gte: now },
        },
        orderBy: {
          scheduledDate: 'asc',
        },
        take: 5,
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              name: true,
              location: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      // ======================================
      // RECENT MAINTENANCE
      // ======================================

      prisma.maintenanceRecord.findMany({
        orderBy: {
          maintenanceDate: 'desc',
        },
        take: 5,
        include: {
          asset: {
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
          },
          technician: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully.',
      data: {
        assets: {
          total: totalAssets,
          active: activeAssets,
          maintenance: maintenanceAssets,
          broken: brokenAssets,
          inactive: inactiveAssets,
        },

        maintenance: {
          pending: pendingMaintenance,
          inProgress: inProgressMaintenance,
          waitingParts: waitingPartsMaintenance,
          completed: completedMaintenance,
          cancelled: cancelledMaintenance,
        },

        schedules: {
          scheduled: scheduledSchedules,
          overdue: overdueSchedules,
          upcoming: upcomingSchedules,
        },

        recentMaintenance,
      },
    });
  } catch (error) {
    next(error);
  }
};
