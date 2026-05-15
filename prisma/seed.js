// Plain JS seed — works on Heroku (no TypeScript required)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const adminPassword = await bcrypt.hash(',14dmin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'radovanovica1993@gmail.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'radovanovica1993@gmail.com',
      password: adminPassword,
      emailVerified: new Date(),
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('Super admin:', admin.email);

  console.log('\nSeed complete!');
  console.log('  Admin: radovanovica1993@gmail.com / ,14dmin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
