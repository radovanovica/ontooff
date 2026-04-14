// eslint-disable-next-line @typescript-eslint/no-require-imports
// @ts-expect-error Prisma enums are available at runtime; tsconfig.seed.json uses moduleResolution:node which causes false TS errors
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('??  Starting seed�');

  const adminPassword = await bcrypt.hash(',14dmin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'radovanovica1993@gmail.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'radovanovica1993@gmail.com',
      password: adminPassword,
      emailVerified: new Date(),
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log('?  Super admin:', admin.email);

  console.log('\n??  Seed complete!');
  console.log('  Admin ?  radovanovica1993@gmail.com  /  ,14dmin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
