
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';

const cleanString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const cleaned = String(value).trim();
  return cleaned === '' ? null : cleaned;
};

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /api/asset-categories
export const getAssetCategories = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'ALL').toUpperCase();

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE') {
      where.isActive = false;
    } else if (status !== 'ALL') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category status filter.',
      });
    }

    const categories = await prisma.assetCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/asset-categories/:id
export const getAssetCategoryById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID.',
      });
    }

    const category = await prisma.assetCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Asset category not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/asset-categories
export const createAssetCategory = async (req, res, next) => {
  try {
    const name = cleanString(req.body.name);
    const description = cleanString(req.body.description);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
    }

    const category = await prisma.assetCategory.create({
      data: {
        name,
        description,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Asset category created successfully.',
      data: category,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({
        success: false,
        message: 'Category name already exists.',
      });
    }

    next(error);
  }
};

// PATCH /api/asset-categories/:id
export const updateAssetCategory = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID.',
      });
    }

    const data = {};

    if (req.body.name !== undefined) {
      const name = cleanString(req.body.name);

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Category name cannot be empty.',
        });
      }

      data.name = name;
    }

    if (req.body.description !== undefined) {
      data.description = cleanString(req.body.description);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.',
      });
    }

    const category = await prisma.assetCategory.update({
      where: { id },
      data,
    });

    return res.status(200).json({
      success: true,
      message: 'Asset category updated successfully.',
      data: category,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Asset category not found.',
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({
        success: false,
        message: 'Category name already exists.',
      });
    }

    next(error);
  }
};

// PATCH /api/asset-categories/:id/status
export const updateAssetCategoryStatus = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const isActive = req.body.isActive;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID.',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be true or false.',
      });
    }

    const category = await prisma.assetCategory.update({
      where: { id },
      data: { isActive },
    });

    return res.status(200).json({
      success: true,
      message: 'Asset category status updated successfully.',
      data: category,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Asset category not found.',
      });
    }

    next(error);
  }
};

// DELETE /api/asset-categories/:id
export const deleteAssetCategory = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID.',
      });
    }

    const category = await prisma.assetCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Asset category not found.',
      });
    }

    if (category._count.assets > 0) {
      return res.status(409).json({
        success: false,
        message: 'Category cannot be deleted because it is being used by assets.',
      });
    }

    await prisma.assetCategory.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Asset category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
