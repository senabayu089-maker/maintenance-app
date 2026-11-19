
import 'dotenv/config';

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || 'System Administrator';
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || null;
  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error(
      'ADMIN_PASSWORD must be set and contain at least 8 characters.'
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      name,
      email,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name,
      username,
      email,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  });

  console.log('Admin account is ready:');
  console.log(admin);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
