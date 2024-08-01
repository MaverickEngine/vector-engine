import IORedis from 'ioredis'

const redis = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: 0,
});

export function set(key, val, ttl = 60 * 60 * 24) {
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

export function del(key) {
    return redis.del(key);
}