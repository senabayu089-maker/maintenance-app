import dotenv from 'dotenv';

dotenv.config();

export const config = {
  appName: process.env.APP_NAME || 'PC Maintenance Monitoring',
  environment: process.env.NODE_ENV || 'development',

  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT) || 8000,
  serverIp: process.env.SERVER_IP || 'localhost',

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  maxFileSize: Number(process.env.MAX_FILE_SIZE) || 5242880,
};