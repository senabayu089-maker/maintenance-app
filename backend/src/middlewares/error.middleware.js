
import { config } from '../config/env.js';

export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Endpoint not found.',
  });
};

export const errorHandler = (error, req, res, next) => {
  console.error(error);

  const statusCode = error.status || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      config.environment === 'development'
        ? error.message
        : 'Internal server error.',
  });
};
