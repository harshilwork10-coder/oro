const { NextRequest } = require('next/server');
const { POST: TransactionPOST } = require('../src/app/api/pos/transaction/route');
const { POST: ShiftPOST } = require('../src/app/api/pos/shift/route');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log("Starting Batch 2 Certification Tests...");

  // Setup test context
  let franchisor = await prisma.franchisor.findFirst();
  if (!franchisor) franchisor = await prisma.franchisor.create({ data: { name: 'Test Franchisor' } });

  let franchise = await prisma.franchise.findFirst();
  if (!franchise) franchise = await prisma.franchise.create({ data: { name: 'Test Franchise', franchisorId: franchisor.id } });

  let location = await prisma.location.findFirst({ where: { franchiseId: franchise.id } });
  if (!location) location = await prisma.location.create({ data: { name: 'Test Location', type: 'SALON', franchiseId: franchise.id } });
  
  let user1 = await prisma.user.findFirst({ where: { email: 'emp1@test.com' }});
  if (!user1) user1 = await prisma.user.create({ data: { name: 'Employee 1', email: 'emp1@test.com', password: 'test', role: 'EMPLOYEE', franchiseId: franchise.id, locationId: location.id, isActive: true }});
  
  let user2 = await prisma.user.findFirst({ where: { email: 'emp2@test.com' }});
  if (!user2) user2 = await prisma.user.create({ data: { name: 'Employee 2', email: 'emp2@test.com', password: 'test', role: 'EMPLOYEE', franchiseId: franchise.id, locationId: location.id, isActive: true }});

  let manager = await prisma.user.findFirst({ where: { email: 'mgr@test.com' }});
  if (!manager) manager = await prisma.user.create({ data: { name: 'Manager', email: 'mgr@test.com', password: 'test', role: 'MANAGER', canManageShifts: true, franchiseId: franchise.id, locationId: location.id, isActive: true }});

  let otherLocation = await prisma.location.findFirst({ where: { name: 'Other Location' } });
  if (!otherLocation) otherLocation = await prisma.location.create({ data: { name: 'Other Location', type: 'SALON', franchiseId: franchise.id } });

  let managerOther = await prisma.user.findFirst({ where: { email: 'mgr2@test.com' }});
  if (!managerOther) managerOther = await prisma.user.create({ data: { name: 'Manager Other', email: 'mgr2@test.com', password: 'test', role: 'MANAGER', canManageShifts: true, franchiseId: franchise.id, locationId: otherLocation.id, isActive: true }});

  // Ensure config exists
  let config = await prisma.businessConfig.findUnique({ where: { franchisorId: franchisor.id }});
  if (!config) config = await prisma.businessConfig.create({ data: { franchisorId: franchisor.id, shiftRequirement: 'NONE' }});

  // Cleanup old state
  await prisma.cashDrawerSession.deleteMany({ where: { employeeId: { in: [user1.id, user2.id, manager.id] } } });
  await prisma.timeEntry.deleteMany({ where: { userId: { in: [user1.id, user2.id, manager.id] } } });

  async function setConfig(req) {
    await prisma.businessConfig.update({ where: { franchisorId: franchisor.id }, data: { shiftRequirement: req } });
  }

  async function mockReq(userId, body) {
    return new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Authorization': `Bearer ${userId}`, 'Content-Type': 'application/json' }
    });
  }

  console.log("\n=========================");
  console.log("1. POLICY MATRIX TESTS (Direct API Bypass)");
  console.log("=========================");

  let res, data;

  const validTx: any = {
    items: [{ id: '1', name: 'Test', price: 10, quantity: 1, type: 'PRODUCT' }],
    subtotal: 10, tax: 0, total: 10, totalCash: 10, totalCard: 0,
    paymentMethod: 'CASH', tip: 0
  };

  // --- NONE ---
  await setConfig('NONE');
  res = await TransactionPOST(await mockReq(user1.id, validTx));
  data = await res.json();
  console.log("Policy NONE - No Shift/Clock - Allowed? ", res.status !== 400 ? 'YES (Valid)' : `NO (${data.error})`);

  // --- CLOCK_IN_ONLY ---
  await setConfig('CLOCK_IN_ONLY');
  res = await TransactionPOST(await mockReq(user1.id, validTx));
  data = await res.json();
  console.log("Policy CLOCK_IN_ONLY - No Clock - Blocked? ", res.status === 400 ? `YES (${data.error})` : 'NO (Failed)');

  await prisma.timeEntry.create({ data: { userId: user1.id, locationId: location.id, clockIn: new Date(), status: 'OPEN' } });
  res = await TransactionPOST(await mockReq(user1.id, validTx));
  data = await res.json();
  console.log("Policy CLOCK_IN_ONLY - Clocked In - Allowed? ", res.status !== 400 ? 'YES' : `NO (${data.error})`);

  // --- CASH_COUNT_ONLY ---
  await setConfig('CASH_COUNT_ONLY');
  res = await TransactionPOST(await mockReq(user1.id, validTx));
  data = await res.json();
  console.log("Policy CASH_COUNT_ONLY - No Shift - Blocked? ", res.status === 400 ? `YES (${data.error})` : 'NO');

  const shift = await prisma.cashDrawerSession.create({ data: { locationId: location.id, employeeId: user1.id, startingCash: 100, status: 'OPEN' } });
  validTx.cashDrawerSessionId = shift.id;
  res = await TransactionPOST(await mockReq(user1.id, validTx));
  data = await res.json();
  console.log("Policy CASH_COUNT_ONLY - Shift Open - Allowed? ", res.status !== 400 ? 'YES' : `NO (${data.error})`);

  // --- BOTH ---
  await setConfig('BOTH');
  res = await TransactionPOST(await mockReq(user2.id, validTx)); // user2 has neither
  data = await res.json();
  console.log("Policy BOTH - Neither - Blocked? ", res.status === 400 ? `YES (${data.error})` : 'NO');

  const shift2 = await prisma.cashDrawerSession.create({ data: { locationId: location.id, employeeId: user2.id, startingCash: 100, status: 'OPEN' } });
  delete validTx.cashDrawerSessionId;
  res = await TransactionPOST(await mockReq(user2.id, { ...validTx, cashDrawerSessionId: shift2.id }));
  data = await res.json();
  console.log("Policy BOTH - Shift Only - Blocked? ", res.status === 400 ? `YES (${data.error})` : 'NO');

  await prisma.timeEntry.create({ data: { userId: user2.id, locationId: location.id, clockIn: new Date(), status: 'OPEN' } });
  res = await TransactionPOST(await mockReq(user2.id, { ...validTx, cashDrawerSessionId: shift2.id }));
  data = await res.json();
  console.log("Policy BOTH - Both - Allowed? ", res.status !== 400 ? 'YES' : `NO (${data.error})`);

  console.log("\n=========================");
  console.log("2. SHIFT CLOSE MATRIX");
  console.log("=========================");

  // Employee closes own
  res = await ShiftPOST(await mockReq(user1.id, { action: 'CLOSE', amount: 100 }));
  console.log("Employee close own - Allowed? ", res.status !== 403 && res.status !== 400 ? 'YES' : 'NO');

  // Employee closes another's (403)
  res = await ShiftPOST(await mockReq(user1.id, { action: 'CLOSE', sessionId: shift2.id, amount: 100 }));
  console.log("Employee close another - Blocked? ", res.status === 403 ? 'YES (403)' : 'NO');

  // Manager closes another's at same location
  res = await ShiftPOST(await mockReq(manager.id, { action: 'CLOSE', sessionId: shift2.id, amount: 100 }));
  console.log("Manager close another (same loc) - Allowed? ", res.status !== 403 && res.status !== 404 ? 'YES' : 'NO');

  // Manager tries cross-location
  const shift3 = await prisma.cashDrawerSession.create({ data: { locationId: location.id, employeeId: user1.id, startingCash: 100, status: 'OPEN' } });
  res = await ShiftPOST(await mockReq(managerOther.id, { action: 'CLOSE', sessionId: shift3.id, amount: 100 }));
  console.log("Manager cross-location - Blocked? ", res.status === 404 || res.status === 403 ? 'YES (Not Found)' : 'NO');

  console.log("\n=========================");
  console.log("3. API BYPASS OF PAYMENT METHODS");
  console.log("=========================");

  await setConfig('BOTH'); // require both
  // Try Cash
  res = await TransactionPOST(await mockReq(manager.id, { ...validTx, paymentMethod: 'CASH', tip: 0 }));
  console.log("CASH bypass blocked? ", res.status === 400 ? 'YES' : 'NO');
  
  // Try Card
  res = await TransactionPOST(await mockReq(manager.id, { ...validTx, paymentMethod: 'CREDIT_CARD', tip: 0 }));
  console.log("CREDIT_CARD bypass blocked? ", res.status === 400 ? 'YES' : 'NO');

  // Try Split
  res = await TransactionPOST(await mockReq(manager.id, { ...validTx, paymentMethod: 'SPLIT', tip: 0 }));
  console.log("SPLIT bypass blocked? ", res.status === 400 ? 'YES' : 'NO');

  await prisma.$disconnect();
}

runTests().catch(e => { console.error(e); prisma.$disconnect(); });
