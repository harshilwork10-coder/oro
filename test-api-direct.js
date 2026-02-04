const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const p = new PrismaClient()

async function main() {
    // Get all stations and their tokens
    const stations = await p.station.findMany({
        include: { location: true }
    })

    console.log('=== ALL STATIONS ===')
    for (const s of stations) {
        console.log(`- ${s.name} @ ${s.location?.name}: token=${s.token ? 'SET' : 'MISSING'}, trusted=${s.isTrusted}`)

        // If no token, generate one
        if (!s.token && s.isTrusted) {
            const newToken = crypto.randomBytes(32).toString('hex')
            await p.station.update({
                where: { id: s.id },
                data: { token: newToken }
            })
            console.log(`  -> Generated new token for ${s.name}`)
        }
    }

    // Now get the first trusted station with token
    const station = await p.station.findFirst({
        where: { isTrusted: true, token: { not: null } },
        include: { location: true }
    })

    if (!station) {
        console.log('\nNo trusted station with token found!')
        return
    }

    console.log('\n=== TESTING API ===')
    console.log('Station:', station.name)
    console.log('Location:', station.location?.name)
    console.log('Token:', station.token?.substring(0, 10) + '...')

    // Now call the bootstrap API
    const response = await fetch('http://localhost:3000/api/pos/bootstrap?force=true', {
        headers: { 'X-Station-Token': station.token }
    })

    console.log('Response status:', response.status)
    const data = await response.json()

    console.log('\n=== BOOTSTRAP API RESPONSE ===')
    console.log('Success:', data.success)
    if (data.settings) {
        console.log('\n=== SETTINGS ===')
        console.log('dualPricingEnabled:', data.settings.dualPricingEnabled)
        console.log('cashDiscountPercent:', data.settings.cashDiscountPercent)
        console.log('locationName:', data.settings.locationName)
    } else {
        console.log('ERROR:', data.error || JSON.stringify(data))
    }
}

main().finally(() => p.$disconnect())
