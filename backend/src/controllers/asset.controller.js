
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';

const ASSET_STATUSES = [
  'ACTIVE',
  'MAINTENANCE',
  'BROKEN',
  'INACTIVE',
];

const DATE_FIELDS = ['purchaseDate', 'warrantyEnd'];

const STRING_FIELDS = [
  'assetCode',
  'name',
  'brand',
  'model',
  'serialNumber',
  'location',
  'department',
  'assignedTo',
  'notes',
];

const cleanString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const cleaned = String(value).trim();
  return cleaned === '' ? null : cleaned;
};

const parseDate = (value, fieldName) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} is not a valid date.`);
    error.status = 400;
    throw error;
  }

  return date;
};

const parseSpecifications = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return Prisma.JsonNull;

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      const error = new Error('Specifications must contain valid JSON.');
      error.status = 400;
      throw error;
    }
  }

  const error = new Error('Specifications must be an object or JSON.');
  error.status = 400;
  throw error;
};

const buildAssetData = (body, isUpdate = false) => {
  const data = {};

  for (const field of STRING_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = cleanString(body[field]);
    }
  }

  for (const field of DATE_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = parseDate(body[field], field);
    }
  }

  if (body.categoryId !== undefined) {
    const categoryId = Number(body.categoryId);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      const error = new Error('Invalid categoryId.');
      error.status = 400;
      throw error;
    }

    data.category = {
      connect: { id: categoryId },
    };
  }

  if (body.status !== undefined) {
    const status = cleanString(body.status)?.toUpperCase();

    if (!ASSET_STATUSES.includes(status)) {
      const error = new Error('Invalid asset status.');
      error.status = 400;
      throw error;
    }

    data.status = status;
  }

  if (body.specifications !== undefined) {
    data.specifications = parseSpecifications(body.specifications);
  }

  if (!isUpdate) {
    const requiredFields = [
      'assetCode',
      'name',
      'categoryId',
    ];

    for (const field of requiredFields) {
      if (
        field === 'categoryId'
          ? !data.category
          : !data[field]
      ) {
        const error = new Error(`${field} is required.`);
        error.status = 400;
        throw error;
      }
    }

    if (!data.status) {
      data.status = 'ACTIVE';
    }
  }

  return data;
};

const assetInclude = {
  category: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
};

// GET /api/assets
export const getAssets = async (req, res, next) => {
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
    const status = String(req.query.status || '').trim().toUpperCase();
    const categoryId = req.query.categoryId
      ? Number(req.query.categoryId)
      : null;

    const where = {};

    if (search) {
      where.OR = [
        { assetCode: { contains: search } },
        { name: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { serialNumber: { contains: search } },
        { location: { contains: search } },
        { department: { contains: search } },
        { assignedTo: { contains: search } },
        {
          category: {
            name: { contains: search },
          },
        },
      ];
    }

    if (status && status !== 'ALL') {
      if (!ASSET_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid asset status filter.',
        });
      }

      where.status = status;
    }

    if (categoryId !== null) {
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID filter.',
        });
      }

      where.categoryId = categoryId;
    }

    const [assets, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        include: assetInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: assets,
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

// GET /api/assets/:id
export const getAssetById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid asset ID.',
      });
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        ...assetInclude,
        maintenanceRecords: {
          orderBy: { maintenanceDate: 'desc' },
          take: 10,
          select: {
            id: true,
            maintenanceCode: true,
            maintenanceDate: true,
            maintenanceType: true,
            status: true,
            result: true,
          },
        },
      },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/assets
export const createAsset = async (req, res, next) => {
  try {
    const data = buildAssetData(req.body);

    const asset = await prisma.asset.create({
      data,
      include: assetInclude,
    });

    return res.status(201).json({
      success: true,
      message: 'Asset created successfully.',
      data: asset,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Asset code already exists.',
        });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          message: 'The selected category does not exist.',
        });
      }
    }

    next(error);
  }
};

// PATCH /api/assets/:id
export const updateAsset = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid asset ID.',
      });
    }

    const data = buildAssetData(req.body, true);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.',
      });
    }

    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found.',
      });
    }

    const asset = await prisma.asset.update({
      where: { id },
      data,
      include: assetInclude,
    });

    return res.status(200).json({
      success: true,
      message: 'Asset updated successfully.',
      data: asset,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Asset code already exists.',
        });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          message: 'The selected category does not exist.',
        });
      }
    }

    next(error);
  }
};

// DELETE /api/assets/:id
export const deleteAsset = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid asset ID.',
      });
    }

    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found.',
      });
    }

    await prisma.asset.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Asset deleted successfully.',
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return res.status(409).json({
        success: false,
        message: 'Asset cannot be deleted because it is referenced by maintenance records or schedules.',
      });
    }

    next(error);
  }
};
