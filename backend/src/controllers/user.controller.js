
import bcrypt from 'bcryptjs';

import { prisma } from '../config/database.js';

const publicUserFields = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const validRoles = ['ADMIN', 'TECHNICIAN', 'USER'];

export const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: publicUserFields,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, username, email, password, role } = req.body;

    if (
      typeof name !== 'string' ||
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !username.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, username, and password are required. Password must contain at least 8 characters.',
      });
    }

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user role.',
      });
    }

    const normalizedEmail =
      typeof email === 'string' && email.trim()
        ? email.trim()
        : null;

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        username: username.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role || 'USER',
      },
      select: publicUserFields,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: user,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Username or email is already registered.',
      });
    }

    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const { name, email, role, isActive, password } = req.body;

    const data = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty.',
        });
      }

      data.name = name.trim();
    }

    if (email !== undefined) {
      if (email !== null && typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid email.',
        });
      }

      data.email = email?.trim() || null;
    }

    if (role !== undefined) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user role.',
        });
      }

      if (userId === req.user.id && role !== 'ADMIN') {
        return res.status(400).json({
          success: false,
          message: 'You cannot remove your own Admin role.',
        });
      }

      data.role = role;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean.',
        });
      }

      if (userId === req.user.id && !isActive) {
        return res.status(400).json({
          success: false,
          message: 'You cannot deactivate your own account.',
        });
      }

      data.isActive = isActive;
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least 8 characters.',
        });
      }

      data.password = await bcrypt.hash(password, 12);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields were provided for update.',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: publicUserFields,
    });

    return res.json({
      success: true,
      message: 'User updated successfully.',
      data: updatedUser,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    next(error);
  }
};
