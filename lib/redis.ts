import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis() {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Missing Upstash Redis environment variables');
    }
    
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export async function get(key: string) {
  try {
    const client = getRedis();
    return await client.get(key);
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function set(key: string, value: any, ttl?: number) {
  try {
    const client = getRedis();
    if (ttl) {
      return await client.setex(key, ttl, JSON.stringify(value));
    } else {
      return await client.set(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error('Redis set error:', error);
    return null;
  }
}

export async function del(key: string) {
  try {
    const client = getRedis();
    return await client.del(key);
  } catch (error) {
    console.error('Redis del error:', error);
    return null;
  }
}

export async function testConnection() {
  try {
    const client = getRedis();
    await client.ping();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Unknown error' };
  }
}