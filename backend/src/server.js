
import app from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/database.js';

const startServer = async () => {
  try {
    await prisma.$connect();

    console.log('MySQL database connected successfully');

    const server = app.listen(config.port, config.host, () => {
      console.log(`Server: http://localhost:${config.port}`);
      console.log(`LAN: http://${config.serverIp}:${config.port}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('Failed to start application:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
