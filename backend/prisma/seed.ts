import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: 'Demo Company',
      code: 'DEMO',
      isActive: true,
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create Warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'WH01',
      name: 'Main Warehouse',
      address: '123 Warehouse St, Lagos, Nigeria',
      isActive: true,
    },
  });

  console.log('✅ Created warehouse:', warehouse.name);

  // Create Zones
  const receivingZone = await prisma.zone.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'RECV-01' } },
    update: {},
    create: {
      warehouseId: warehouse.id,
      code: 'RECV-01',
      name: 'Receiving Dock A',
      zoneType: 'RECEIVING',
      isActive: true,
    },
  });

  const pickFaceZone = await prisma.zone.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'PICK-01' } },
    update: {},
    create: {
      warehouseId: warehouse.id,
      code: 'PICK-01',
      name: 'Pick Face Zone',
      zoneType: 'PICK_FACE',
      isActive: true,
    },
  });

  const reserveZone = await prisma.zone.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'RESV-01' } },
    update: {},
    create: {
      warehouseId: warehouse.id,
      code: 'RESV-01',
      name: 'Reserve Storage',
      zoneType: 'RESERVE',
      isActive: true,
    },
  });

  console.log('✅ Created zones');

  // Create Locations
  const receivingLocation = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'DOCK-A1' } },
    update: {},
    create: {
      warehouseId: warehouse.id,
      zoneId: receivingZone.id,
      code: 'DOCK-A1',
      locationType: 'DOCK',
      maxCapacity: 1000,
      status: 'ACTIVE',
    },
  });

  // Create pick face locations
  const pickLocations = [];
  for (let i = 1; i <= 10; i++) {
    const code = `PF-A${i.toString().padStart(2, '0')}`;
    const location = await prisma.location.upsert({
      where: { warehouseId_code: { warehouseId: warehouse.id, code } },
      update: {},
      create: {
        warehouseId: warehouse.id,
        zoneId: pickFaceZone.id,
        code,
        locationType: 'PICK_FACE',
        aisleNumber: 'A',
        rackNumber: '1',
        shelfNumber: i.toString(),
        heightLevel: 1,
        maxCapacity: 200,
        status: 'ACTIVE',
      },
    });
    pickLocations.push(location);
  }

  // Create reserve locations
  for (let i = 1; i <= 20; i++) {
    const code = `RSV-B${i.toString().padStart(2, '0')}`;
    await prisma.location.upsert({
      where: { warehouseId_code: { warehouseId: warehouse.id, code } },
      update: {},
      create: {
        warehouseId: warehouse.id,
        zoneId: reserveZone.id,
        code,
        locationType: 'RESERVE',
        aisleNumber: 'B',
        rackNumber: Math.ceil(i / 5).toString(),
        shelfNumber: ((i - 1) % 5 + 1).toString(),
        heightLevel: Math.ceil(i / 5),
        maxCapacity: 500,
        status: 'ACTIVE',
      },
    });
  }

  console.log('✅ Created locations');

  // Create Supplier
  const supplier = await prisma.supplier.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SUP001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'SUP001',
      name: 'Acme Suppliers Ltd',
      contactName: 'John Supplier',
      contactEmail: 'john@acmesuppliers.com',
      contactPhone: '+234-123-4567',
      address: '456 Supplier Ave, Lagos, Nigeria',
      isActive: true,
    },
  });

  console.log('✅ Created supplier:', supplier.name);

  // Create SKUs
  const skus = [];
  const skuData = [
    {
      code: 'SKU-001',
      name: 'Widget Pro Large',
      velocity: 'FAST',
      abcClassification: 'A',
      unitCost: 500,
    },
    {
      code: 'SKU-002',
      name: 'Widget Pro Medium',
      velocity: 'MEDIUM',
      abcClassification: 'B',
      unitCost: 350,
    },
    {
      code: 'SKU-003',
      name: 'Widget Pro Small',
      velocity: 'SLOW',
      abcClassification: 'C',
      unitCost: 200,
    },
    {
      code: 'SKU-BATCH-001',
      name: 'Batch-Tracked Item',
      velocity: 'MEDIUM',
      abcClassification: 'B',
      requiresBatchTracking: true,
      requiresExpiryTracking: true,
      isPerishable: true,
      unitCost: 450,
    },
    {
      code: 'SKU-TEMP-001',
      name: 'Temperature-Controlled Item',
      velocity: 'MEDIUM',
      abcClassification: 'B',
      temperatureControlled: true,
      temperatureMin: 2,
      temperatureMax: 8,
      unitCost: 750,
    },
  ];

  for (const skuInfo of skuData) {
    const sku = await prisma.sKU.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: skuInfo.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        code: skuInfo.code,
        name: skuInfo.name,
        category: 'General',
        uom: 'UNIT',
        requiresBatchTracking: skuInfo.requiresBatchTracking || false,
        requiresExpiryTracking: skuInfo.requiresExpiryTracking || false,
        isPerishable: skuInfo.isPerishable || false,
        temperatureControlled: skuInfo.temperatureControlled || false,
        temperatureMin: skuInfo.temperatureMin,
        temperatureMax: skuInfo.temperatureMax,
        velocity: skuInfo.velocity,
        abcClassification: skuInfo.abcClassification,
        unitCost: skuInfo.unitCost,
        weightKg: 1.5,
        volumeM3: 0.01,
        isActive: true,
      },
    });
    skus.push(sku);
  }

  console.log('✅ Created SKUs');

  // Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@genesis-wms.com' },
    update: {},
    create: {
      email: 'admin@genesis-wms.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'PLATFORM_ADMIN',
      tenantId: tenant.id,
      isActive: true,
    },
  });

  const receiverUser = await prisma.user.upsert({
    where: { email: 'receiver@genesis-wms.com' },
    update: {},
    create: {
      email: 'receiver@genesis-wms.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Receiver',
      role: 'WAREHOUSE_RECEIVER',
      tenantId: tenant.id,
      isActive: true,
    },
  });

  const supervisorUser = await prisma.user.upsert({
    where: { email: 'supervisor@genesis-wms.com' },
    update: {},
    create: {
      email: 'supervisor@genesis-wms.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Supervisor',
      role: 'RECEIVING_SUPERVISOR',
      tenantId: tenant.id,
      isActive: true,
    },
  });

  console.log('✅ Created users');
  console.log('\n📧 Login Credentials:');
  console.log('   Admin: admin@genesis-wms.com / password123');
  console.log('   Receiver: receiver@genesis-wms.com / password123');
  console.log('   Supervisor: supervisor@genesis-wms.com / password123');

  // Create sample ASN
  const sampleASN = await prisma.aSN.create({
    data: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      asnNumber: 'ASN-2026-0001',
      poNumber: 'PO-2026-001',
      supplierId: supplier.id,
      supplierName: supplier.name,
      carrier: 'DHL Express',
      trackingNumber: 'DHL123456789',
      expectedArrivalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      receivingZoneId: receivingZone.id,
      priority: 'STANDARD',
      shipmentStatus: 'IN_TRANSIT',
      totalExpectedLines: 3,
      totalExpectedUnits: 150,
      specialInstructions: 'Handle with care',
      createdById: adminUser.id,
      lines: {
        create: [
          {
            tenantId: tenant.id,
            lineNumber: 1,
            skuId: skus[0].id,
            skuCode: skus[0].code,
            productName: skus[0].name,
            expectedQuantity: 50,
            uom: 'UNIT',
            lineStatus: 'PENDING',
          },
          {
            tenantId: tenant.id,
            lineNumber: 2,
            skuId: skus[1].id,
            skuCode: skus[1].code,
            productName: skus[1].name,
            expectedQuantity: 75,
            uom: 'UNIT',
            lineStatus: 'PENDING',
          },
          {
            tenantId: tenant.id,
            lineNumber: 3,
            skuId: skus[3].id,
            skuCode: skus[3].code,
            productName: skus[3].name,
            expectedQuantity: 25,
            uom: 'UNIT',
            batchNumberExpected: 'BATCH-2026-001',
            expiryDateExpected: new Date('2026-12-31'),
            lineStatus: 'PENDING',
          },
        ],
      },
    },
  });

  console.log('✅ Created sample ASN:', sampleASN.asnNumber);

  console.log('\n✨ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
