import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const isProduction = process.env.NODE_ENV === 'production';

const requiredPassword = (envName, devFallback) => {
  const value = process.env[envName] || (isProduction ? null : devFallback);
  if (!value) {
    throw new Error(
      `${envName} must be set when seeding a production database. `
      + 'Choose a strong password and keep it out of version control.'
    );
  }
  return value;
};

const adminEmail = (process.env.ADMIN_EMAIL || 'admin@zimcars.com').trim().toLowerCase();
const dealerOwnerEmail = (process.env.DEALER_OWNER_EMAIL || 'owner@zimcars.com').trim().toLowerCase();
const dealerSlug = (process.env.DEALER_SLUG || 'zim-cars').trim().toLowerCase();
const dealerName = process.env.DEALER_NAME || 'Zim Cars';
const commissionRate = Number(process.env.DEALER_COMMISSION_RATE || 3);

const shouldSeedSampleData = process.env.SEED_SAMPLE_DATA
  ? process.env.SEED_SAMPLE_DATA === 'true'
  : !isProduction;

async function main() {
  console.log('Seeding database...');

  if (!Number.isFinite(commissionRate) || commissionRate < 0) {
    throw new Error('DEALER_COMMISSION_RATE must be a positive number.');
  }

  const adminPassword = requiredPassword('ADMIN_PASSWORD', 'admin123');
  const dealerPassword = requiredPassword('DEALER_OWNER_PASSWORD', 'dealer123');

  const dealer = await prisma.dealer.upsert({
    where: { slug: dealerSlug },
    update: {},
    create: {
      name: dealerName,
      slug: dealerSlug,
      commissionRate,
      status: 'active',
    },
  });

  console.log('Created dealer:', dealer.name);

  // Existing users are left untouched so redeploying does not reset a password
  // that was changed in production.
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: process.env.ADMIN_NAME || 'Platform Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: 'admin',
    },
  });

  console.log('Created admin:', admin.email);

  const dealerOwner = await prisma.user.upsert({
    where: { email: dealerOwnerEmail },
    update: {},
    create: {
      name: process.env.DEALER_OWNER_NAME || 'Dealer Owner',
      email: dealerOwnerEmail,
      passwordHash: await bcrypt.hash(dealerPassword, 10),
      role: 'dealer_owner',
      dealerId: dealer.id,
    },
  });

  console.log('Created dealer owner:', dealerOwner.email);

  if (!shouldSeedSampleData) {
    console.log('Skipping sample vehicles (set SEED_SAMPLE_DATA=true to enable).');
  } else {
    const vehicleCount = await prisma.vehicle.count({ where: { dealerId: dealer.id } });

    if (vehicleCount > 0) {
      console.log(`Skipping sample vehicles; dealer already has ${vehicleCount} vehicle(s).`);
    } else {
      const vehicles = [
        {
          make: 'Toyota',
          model: 'Corolla',
          year: 2018,
          price: 8500,
          description: 'Clean, reliable sedan. Well maintained.',
        },
        {
          make: 'Honda',
          model: 'Civic',
          year: 2019,
          price: 9200,
          description: 'Sporty and efficient. Low mileage.',
        },
        {
          make: 'Nissan',
          model: 'X-Trail',
          year: 2017,
          price: 11500,
          description: 'Spacious SUV, perfect for family.',
        },
      ];

      for (const v of vehicles) {
        await prisma.vehicle.create({
          data: {
            dealerId: dealer.id,
            make: v.make,
            model: v.model,
            year: v.year,
            price: v.price,
            description: v.description,
            status: 'available',
          },
        });
      }

      console.log('Created sample vehicles');
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
