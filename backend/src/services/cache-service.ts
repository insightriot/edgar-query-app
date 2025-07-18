import Redis from 'ioredis';
import { createError } from '../middleware/error-handler';

export class CacheService {
  private client: Redis;
  private keyPrefix: string;
  private defaultTTL: number;

  constructor() {
    this.keyPrefix = 'edgar:';
    this.defaultTTL = 3600; // 1 hour

    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: this.keyPrefix,
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value) {
        console.log(`Cache hit for key: ${key}`);
        return JSON.parse(value);
      }
      console.log(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      console.log(`Cache set for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      throw createError(`Failed to set cache for key ${key}`, 500);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
      console.log(`Cache deleted for key: ${key}`);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        console.log(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
      }
    } catch (error) {
      console.error(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    let value = await this.get<T>(key);
    
    if (value === null) {
      value = await fetcher();
      await this.set(key, value, ttl);
    }
    
    return value;
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      return {
        memory: info,
        keyspace: keyspace
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.client.flushdb();
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}

export const CacheKeys = {
  // Company data cache keys
  companyProfile: (cik: string) => `company:profile:${cik}`,
  companyFilings: (cik: string, formType?: string) => `company:filings:${cik}:${formType || 'all'}`,
  companyFacts: (cik: string) => `company:facts:${cik}`,
  
  // Financial data cache keys
  financialData: (cik: string, concept: string, period?: string) => 
    `financial:${cik}:${concept}:${period || 'all'}`,
  
  // Query result cache keys
  queryResult: (queryHash: string) => `query:result:${queryHash}`,
  
  // Search result cache keys
  searchResults: (searchHash: string) => `search:results:${searchHash}`,
  
  // SEC API response cache keys
  secApiResponse: (endpoint: string) => `sec:api:${endpoint.replace(/\//g, ':')}`,
};

export const CacheTTL = {
  // Real-time data (minimal caching)
  RECENT_FILINGS: 300,        // 5 minutes
  QUERY_RESULTS: 600,         // 10 minutes
  
  // Semi-static data (moderate caching)
  COMPANY_PROFILES: 3600,     // 1 hour
  FINANCIAL_DATA: 1800,       // 30 minutes
  
  // Static data (long-term caching)
  HISTORICAL_DATA: 86400,     // 24 hours
  COMPANY_FACTS: 43200,       // 12 hours
  SEARCH_INDEXES: 7200,       // 2 hours
};