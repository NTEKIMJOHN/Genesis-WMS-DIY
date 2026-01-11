import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: 'Demo Warehouse',
      code: 'DEMO',
      isActive: true,
    },
  });

  console.log('✓ Created tenant:', tenant.name);

  // Create Warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'WH-001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Lagos Main Warehouse',
      code: 'WH-001',
      address: {
        street: '123 Warehouse Street',
        city: 'Lagos',
        state: 'Lagos',
        postalCode: '100001',
        country: 'Nigeria',
      },
      isActive: true,
    },
  });

  console.log('✓ Created warehouse:', warehouse.name);

  // Create Zones
  const zone = await prisma.zone.upsert({
    where: {
      warehouseId_code: {
        warehouseId: warehouse.id,
        code: 'ZONE-A',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      name: 'Zone A - General Storage',
      code: 'ZONE-A',
      zoneType: 'AMBIENT',
    },
  });

  console.log('✓ Created zone:', zone.name);

  // Create Locations
  const locations = [];
  for (let aisle = 1; aisle <= 3; aisle++) {
    for (let rack = 1; rack <= 5; rack++) {
      for (let shelf = 1; shelf <= 3; shelf++) {
        const code = `A-${aisle.toString().padStart(2, '0')}-${rack}-${String.fromCharCode(64 + shelf)}`;
        const location = await prisma.location.create({
          data: {
            tenantId: tenant.id,
            warehouseId: warehouse.id,
            zoneId: zone.id,
            code,
            aisle: `A${aisle.toString().padStart(2, '0')}`,
            rack: rack.toString(),
            shelf: String.fromCharCode(64 + shelf),
            bin: '1',
            locationType: rack <= 2 ? 'PICK_FACE' : 'RESERVE',
            isPrimary: rack === 1,
            isActive: true,
          },
        });
        locations.push(location);
      }
    }
  }

  console.log(`✓ Created ${locations.length} locations`);

  // Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@warehouse.com' },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@warehouse.com',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'TENANT_ADMIN',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@warehouse.com' },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'manager@warehouse.com',
        passwordHash,
        firstName: 'Warehouse',
        lastName: 'Manager',
        role: 'WAREHOUSE_MANAGER',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'picker@warehouse.com' },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'picker@warehouse.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Picker',
        role: 'PICKER',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'packer@warehouse.com' },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'packer@warehouse.com',
        passwordHash,
        firstName: 'Jane',
        lastName: 'Packer',
        role: 'PACKER',
        isActive: true,
      },
    }),
  ]);

  console.log(`✓ Created ${users.length} users`);

  // Create Customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: 'CUST-001',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        code: 'CUST-001',
        name: 'Acme Corporation',
        email: 'orders@acme.com',
        phone: '+234-800-123-4567',
        isActive: true,
      },
    }),
    prisma.customer.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: 'CUST-002',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        code: 'CUST-002',
        name: 'Beta Industries',
        email: 'orders@beta.com',
        phone: '+234-800-234-5678',
        isActive: true,
      },
    }),
  ]);

  console.log(`✓ Created ${customers.length} customers`);

  // Create Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: {
        tenantId_sku: {
          tenantId: tenant.id,
          sku: 'WDG-PRO-001',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        sku: 'WDG-PRO-001',
        name: 'Widget Pro',
        description: 'Professional grade widget',
        barcode: '1234567890123',
        uom: 'Each',
        weight: 1.5,
        dimensions: { length: 10, width: 8, height: 5 },
        isBatchTracked: true,
        isSerialTracked: false,
        isTemperatureControlled: false,
        shelfLifeDays: 365,
        safetyBufferDays: 30,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: {
        tenantId_sku: {
          tenantId: tenant.id,
          sku: 'GDG-LTE-001',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        sku: 'GDG-LTE-001',
        name: 'Gadget Lite',
        description: 'Lightweight gadget',
        barcode: '1234567890124',
        uom: 'Each',
        weight: 0.5,
        dimensions: { length: 8, width: 6, height: 3 },
        isBatchTracked: false,
        isSerialTracked: false,
        isTemperatureControlled: false,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: {
        tenantId_sku: {
          tenantId: tenant.id,
          sku: 'DHK-MAX-001',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        sku: 'DHK-MAX-001',
        name: 'Doohickey Max',
        description: 'Maximum capacity doohickey',
        barcode: '1234567890125',
        uom: 'Each',
        weight: 2.0,
        dimensions: { length: 12, width: 10, height: 6 },
        isBatchTracked: true,
        isSerialTracked: false,
        isTemperatureControlled: false,
        shelfLifeDays: 180,
        safetyBufferDays: 15,
        isActive: true,
      },
    }),
  ]);

  console.log(`✓ Created ${products.length} products`);

  // Create Inventory
  const inventories = [];
  for (const product of products) {
    for (let i = 0; i < 10; i++) {
      const location = locations[Math.floor(Math.random() * locations.length)];
      const inventory = await prisma.inventory.create({
        data: {
          tenantId: tenant.id,
          warehouseId: warehouse.id,
          locationId: location.id,
          productId: product.id,
          batchNumber: product.isBatchTracked ? `B2025-${String(i + 1).padStart(3, '0')}` : null,
          expiryDate: product.shelfLifeDays
            ? new Date(Date.now() + product.shelfLifeDays * 24 * 60 * 60 * 1000)
            : null,
          receivedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          quantityOnHand: Math.floor(Math.random() * 100) + 50,
          quantityAvailable: Math.floor(Math.random() * 100) + 50,
          quantityAllocated: 0,
          status: 'AVAILABLE',
        },
      });
      inventories.push(inventory);
    }
  }

  console.log(`✓ Created ${inventories.length} inventory records`);

  console.log('\n✅ Database seed completed successfully!');
  console.log('\n📝 Login Credentials:');
  console.log('   Email: manager@warehouse.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
