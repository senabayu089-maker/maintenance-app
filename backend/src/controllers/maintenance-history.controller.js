
import prisma from '../config/database.js';

// GET /api/maintenance/:id/history
export async function getMaintenanceHistory(req, res, next) {
  try {
    const maintenanceId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(maintenanceId) || maintenanceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid maintenance ID.',
      });
    }

    const maintenance = await prisma.maintenanceRecord.findUnique({
      where: { id: maintenanceId },
      select: {
        id: true,
        maintenanceCode: true,
        status: true,
        asset: {
          select: {
            id: true,
            assetCode: true,
            pcName: true,
          },
        },
      },
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found.',
      });
    }

    const history = await prisma.maintenanceHistory.findMany({
      where: { maintenanceId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      success: true,
      data: {
        maintenance,
        history,
      },
    });
  } catch (error) {
    next(error);
  }
}
