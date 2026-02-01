// Force invalidate cache for a specific location
require('dotenv').config()
const { Redis } = require('@upstash/redis')

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function invalidate() {
    const locationId = 'cmkj1vkq4000812c60yoc4q1d' // salon barb
    const cacheKey = `bootstrap:location:${locationId}`

    console.log(`Deleting cache key: ${cacheKey}`)
    const result = await redis.del(cacheKey)
    console.log('Delete result:', result)
    console.log('Cache invalidated! The next bootstrap request will fetch fresh data.')
}

invalidate()
