// Comprehensive cache invalidation for salon barb location
require('dotenv').config({ path: '.env.local' })

// Manually set env vars if dotenv doesn't find them (for testing)
if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.log('Loading .env...')
    require('dotenv').config()
}

const { Redis } = require('@upstash/redis')

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function invalidate() {
    const locationId = 'cmkj1vkq4000812c60yoc4q1d' // salon barb

    console.log('\n=== Redis Cache Invalidation ===\n')
    console.log('Redis URL configured:', !!process.env.UPSTASH_REDIS_REST_URL)

    // The EXACT cache keys used by the system
    const cacheKeys = [
        `menu:${locationId}`,
        `staff:${locationId}`,
        `settings:${locationId}`,
        `bootstrap:${locationId}`,
        `employees_login:${locationId}`,
    ]

    for (const key of cacheKeys) {
        console.log(`Deleting: ${key}`)
        try {
            const result = await redis.del(key)
            console.log(`  Result: ${result} (1=deleted, 0=not found)`)
        } catch (err) {
            console.log(`  Error: ${err.message}`)
        }
    }

    console.log('\n✅ Cache invalidated!')
    console.log('Next bootstrap request will fetch fresh data from database.')
    console.log('\nNow restart the Android app to test!')
}

invalidate().catch(console.error)
