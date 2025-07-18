import type { VercelRequest, VercelResponse } from '@vercel/node';
import { testConnection as testDB } from '../lib/database';
import { testConnection as testRedis } from '../lib/redis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test database connection
    const dbResult = await testDB();
    
    // Test Redis connection
    const redisResult = await testRedis();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      connections: {
        database: dbResult,
        redis: redisResult
      },
      environment: {
        hasDBUrl: !!process.env.DATABASE_URL,
        hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message
    });
  }
}