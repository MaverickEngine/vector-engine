import IORedis from 'ioredis'

// Create Redis client
const redis = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: 0,
});

// Function to quit Redis connection (used in tests)
export function closeRedisConnection() {
    return redis.quit();
}

export function set(key, val, ttl = 60 * 60) {
    let json_val = JSON.stringify(val);
    return redis.set(key, json_val, 'EX', ttl);
}

export async function get(key) {
    const json_val = await redis.get(key);
    try {
        return JSON.parse(json_val);
    } catch (e) {
        return null;
    }
}

export async function clear_keys(prefix) {
    const keys = await redis.keys(`${prefix}*`);
    for (const key of keys) {
        await redis.del(key);
    }
}

export function del(key) {
    return redis.del(key);
}