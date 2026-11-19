
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../config/database.js';
import { config } from '../config/env.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        username: username.trim(),
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const token = jwt.sign(
      {
        sub: String(user.id),
      },
      config.jwtSecret,
      {
        expiresIn: config.jwtExpiresIn,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        tokenType: 'Bearer',
        expiresIn: config.jwtExpiresIn,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

export const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logout successful. Remove the token from the client.',
  });
};
