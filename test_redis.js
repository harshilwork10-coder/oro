const { createClient } = require('redis');

async function flushCache() {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  client.on('error', (err) => console.log('Redis Client Error', err));
  
  await client.connect();
  const keys = await client.keys('pos:bootstrap:*');
  console.log(`Found ${keys.length} cached bootstrap entries.`);
  if (keys.length > 0) {
      await client.del(keys);
      console.log('Deleted all cached pos:bootstrap:* entries.');
  }
  await client.quit();
}

flushCache().catch(console.error);
