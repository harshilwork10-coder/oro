const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const prisma = new PrismaClient()

async function main() {
    console.log('Starting exact backfill for locationId & stationId on existing Transactions...')
    console.log('Obeying STRICT user priority rules (1. Station/Drawer, 2. Shift bounds, 3. Single Location, 4. Unresolved)')

    const unresolved = []
    let updatedCount = 0

    // Fetch transactions missing locationId
    const transactions = await prisma.transaction.findMany({
        where: { locationId: null },
        select: {
            id: true, franchiseId: true, employeeId: true, stationId: true, cashDrawerSessionId: true, createdAt: true
        }
    })

    console.log(`Found ${transactions.length} transactions missing locationId.`)

    for (const tx of transactions) {
        let locationId = null;
        let stationId = tx.stationId;

        // Rule 1: Station / Cash Drawer Session context
        if (stationId && !locationId) {
            const station = await prisma.station.findUnique({ where: { id: stationId }, select: { locationId: true } })
            if (station?.locationId) locationId = station.locationId
        }

        if (tx.cashDrawerSessionId && !locationId) {
            const session = await prisma.cashDrawerSession.findUnique({
                where: { id: tx.cashDrawerSessionId },
                select: { locationId: true, stationId: true, station: { select: { locationId: true } } }
            })
            if (session) {
                if (session.locationId) locationId = session.locationId;
                else if (session.station?.locationId) locationId = session.station.locationId;

                if (!stationId && session.stationId) stationId = session.stationId;
            }
        }

        // Rule 2: Employee Shift Context at Transaction Time
        if (!locationId && tx.employeeId) {
            const shift = await prisma.timeEntry.findFirst({
                where: {
                    userId: tx.employeeId,
                    clockIn: { lte: tx.createdAt },
                    OR: [
                        { clockOut: null },
                        { clockOut: { gte: tx.createdAt } }
                    ],
                    
                },
                select: { locationId: true }
            })
            if (shift?.locationId) locationId = shift.locationId;
        }

        // Rule 3: Single-Location Franchise Fallback
        if (!locationId && tx.franchiseId) {
            const locations = await prisma.location.findMany({
                where: { franchiseId: tx.franchiseId },
                select: { id: true },
                take: 2
            })
            if (locations.length === 1) {
                locationId = locations[0].id;
            }
        }

        // Apply or Unresolved
        if (locationId) {
            await prisma.transaction.update({
                where: { id: tx.id },
                data: { locationId, stationId }
            })
            updatedCount++
        } else {
            console.log(`[UNRESOLVED] Transaction ${tx.id} - Multiple candidate locations exist with missing context.`)
            unresolved.push(tx.id)
        }
    }

    console.log(`\n--- BACKFILL COMPLETE ---`)
    console.log(`Successfully mapped: ${updatedCount}`)
    console.log(`Unresolved overrides logged: ${unresolved.length}`)

    if (unresolved.length > 0) {
        fs.writeFileSync('unresolved_transactions.log', JSON.stringify(unresolved, null, 2))
        console.log('Saved unresolved layout to unresolved_transactions.log')
    }

}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(async () => { await prisma.$disconnect() })
