# Result Caching and Optimization Strategy

## Overview
A comprehensive caching and optimization strategy to minimize SEC EDGAR API calls, improve response times, and enhance user experience while maintaining data freshness and accuracy.

## Caching Architecture

### 1. Multi-Level Caching Strategy

#### Level 1: Browser Cache
- **Static Assets**: CSS, JS, images cached for 1 year
- **API Responses**: Short-term cache for immediate reuse
- **Query Results**: Cache successful queries for 5 minutes
- **User Preferences**: Cache user settings locally

#### Level 2: CDN Cache
- **Global Distribution**: CloudFront/CloudFlare for global users
- **Edge Caching**: Query results cached at edge locations
- **Cache Duration**: 1 hour for financial data, 24 hours for company profiles
- **Invalidation**: Automatic invalidation on data updates

#### Level 3: Application Cache (Redis)
- **Query Results**: Cache processed query results
- **API Responses**: Cache SEC EDGAR API responses
- **Company Data**: Cache company profiles and metadata
- **User Sessions**: Store user session data

#### Level 4: Database Cache
- **Query Result Cache**: PostgreSQL query result caching
- **Materialized Views**: Pre-computed aggregations
- **Connection Pooling**: Efficient database connections
- **Read Replicas**: Distribute read load

### 2. Cache Implementation

#### Redis Cache Service
```typescript
@Service()
class CacheService {
  constructor(
    private redisClient: Redis,
    private logger: Logger
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(value);
      }
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
      this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.info(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    let value = await this.get<T>(key);
    
    if (value === null) {
      value = await fetcher();
      await this.set(key, value, ttl);
    }
    
    return value;
  }
}
```

#### Cache Key Strategy
```typescript
class CacheKeyGenerator {
  // Company data cache keys
  static companyProfile(cik: string): string {
    return `company:profile:${cik}`;
  }

  static companyFilings(cik: string, formType?: string): string {
    return `company:filings:${cik}:${formType || 'all'}`;
  }

  // Financial data cache keys
  static financialData(cik: string, concept: string, period?: string): string {
    return `financial:${cik}:${concept}:${period || 'all'}`;
  }

  // Query result cache keys
  static queryResult(queryHash: string): string {
    return `query:result:${queryHash}`;
  }

  // Search result cache keys
  static searchResults(searchHash: string): string {
    return `search:results:${searchHash}`;
  }

  // Generate hash for complex queries
  static generateQueryHash(query: string, filters: any): string {
    const content = JSON.stringify({ query, filters });
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

## Cache TTL Strategy

### 1. Data Freshness Requirements
```typescript
enum CacheTTL {
  // Real-time data (minimal caching)
  STOCK_PRICES = 60,           // 1 minute
  RECENT_FILINGS = 300,        // 5 minutes
  
  // Semi-static data (moderate caching)
  COMPANY_PROFILES = 3600,     // 1 hour
  FINANCIAL_DATA = 1800,       // 30 minutes
  QUERY_RESULTS = 600,         // 10 minutes
  
  // Static data (long-term caching)
  HISTORICAL_DATA = 86400,     // 24 hours
  COMPANY_METADATA = 43200,    // 12 hours
  SEARCH_INDEXES = 7200,       // 2 hours
}

class CacheTTLManager {
  static getTTL(dataType: string, age: Date): number {
    const ageInDays = (Date.now() - age.getTime()) / (1000 * 60 * 60 * 24);
    
    switch (dataType) {
      case 'financial_data':
        // Recent data: shorter TTL, older data: longer TTL
        return ageInDays < 90 ? CacheTTL.FINANCIAL_DATA : CacheTTL.HISTORICAL_DATA;
        
      case 'filing_content':
        // Filings don't change, longer TTL
        return CacheTTL.HISTORICAL_DATA;
        
      case 'company_profile':
        // Company profiles change infrequently
        return CacheTTL.COMPANY_PROFILES;
        
      default:
        return CacheTTL.QUERY_RESULTS;
    }
  }
}
```

### 2. Cache Invalidation Strategy
```typescript
@Service()
class CacheInvalidationService {
  constructor(
    private cacheService: CacheService,
    private eventBus: EventBus
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Invalidate on new filing
    this.eventBus.on('filing.new', async (event: NewFilingEvent) => {
      await this.invalidateCompanyCache(event.cik);
      await this.invalidateSearchCache();
    });

    // Invalidate on data update
    this.eventBus.on('data.updated', async (event: DataUpdateEvent) => {
      await this.invalidateFinancialDataCache(event.cik, event.concept);
    });
  }

  async invalidateCompanyCache(cik: string): Promise<void> {
    await this.cacheService.invalidate(`company:*:${cik}`);
    await this.cacheService.invalidate(`financial:${cik}:*`);
  }

  async invalidateFinancialDataCache(cik: string, concept: string): Promise<void> {
    await this.cacheService.invalidate(`financial:${cik}:${concept}:*`);
  }

  async invalidateSearchCache(): Promise<void> {
    await this.cacheService.invalidate('search:*');
  }

  async invalidateQueryCache(queryPattern: string): Promise<void> {
    await this.cacheService.invalidate(`query:*:${queryPattern}`);
  }
}
```

## Performance Optimization

### 1. Query Optimization
```typescript
@Service()
class QueryOptimizer {
  constructor(
    private cacheService: CacheService,
    private dataSource: DataSource
  ) {}

  async getCompanyFinancialData(cik: string, concepts: string[]): Promise<FinancialDataMap> {
    const cacheKey = CacheKeyGenerator.financialData(cik, concepts.join(','));
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Batch query multiple concepts
        const query = `
          SELECT concept, value, period_end_date, unit
          FROM financial_data
          WHERE cik = $1 AND concept = ANY($2)
          ORDER BY period_end_date DESC
          LIMIT 100
        `;
        
        const result = await this.dataSource.query(query, [cik, concepts]);
        return this.groupByConcept(result);
      },
      CacheTTL.FINANCIAL_DATA
    );
  }

  async getCompanyFilingsWithPagination(
    cik: string,
    limit: number,
    offset: number
  ): Promise<PaginatedFilings> {
    const cacheKey = `company:filings:${cik}:${limit}:${offset}`;
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = `
          SELECT accession_number, form_type, filing_date, period_end_date
          FROM filings
          WHERE cik = $1
          ORDER BY filing_date DESC
          LIMIT $2 OFFSET $3
        `;
        
        const [filings, total] = await Promise.all([
          this.dataSource.query(query, [cik, limit, offset]),
          this.getFilingCount(cik)
        ]);
        
        return { filings, total, limit, offset };
      },
      CacheTTL.COMPANY_PROFILES
    );
  }
}
```

### 2. Database Optimization
```sql
-- Materialized views for common queries
CREATE MATERIALIZED VIEW company_financial_summary AS
SELECT 
    c.cik,
    c.name,
    c.ticker,
    MAX(CASE WHEN fd.concept = 'Revenues' THEN fd.value END) as latest_revenue,
    MAX(CASE WHEN fd.concept = 'Assets' THEN fd.value END) as latest_assets,
    MAX(fd.period_end_date) as latest_period
FROM companies c
LEFT JOIN financial_data fd ON c.cik = fd.cik
WHERE fd.period_end_date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY c.cik, c.name, c.ticker;

-- Refresh materialized views daily
CREATE OR REPLACE FUNCTION refresh_financial_summaries()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW company_financial_summary;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX idx_financial_data_cik_concept ON financial_data(cik, concept);
CREATE INDEX idx_financial_data_period ON financial_data(period_end_date);
CREATE INDEX idx_filings_cik_date ON filings(cik, filing_date);
CREATE INDEX idx_filings_form_type ON filings(form_type);

-- Partial indexes for common queries
CREATE INDEX idx_recent_filings ON filings(cik, filing_date) 
WHERE filing_date >= CURRENT_DATE - INTERVAL '2 years';
```

### 3. SEC API Rate Limiting Optimization
```typescript
@Service()
class SECAPIOptimizer {
  constructor(
    private cacheService: CacheService,
    private rateLimiter: RateLimiter,
    private batchProcessor: BatchProcessor
  ) {}

  async getCompanyData(cik: string): Promise<CompanyData> {
    const cacheKey = CacheKeyGenerator.companyProfile(cik);
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        await this.rateLimiter.wait();
        return await this.fetchFromSECAPI(cik);
      },
      CacheTTL.COMPANY_PROFILES
    );
  }

  async batchGetCompanyData(ciks: string[]): Promise<CompanyData[]> {
    // Check cache first
    const cachedData = await this.getCachedCompanyData(ciks);
    const uncachedCiks = ciks.filter(cik => !cachedData.has(cik));
    
    if (uncachedCiks.length === 0) {
      return Array.from(cachedData.values());
    }

    // Batch process uncached requests
    const batchedResults = await this.batchProcessor.process(
      uncachedCiks,
      this.fetchFromSECAPI.bind(this),
      { batchSize: 5, delay: 100 } // Respect rate limits
    );

    // Cache results
    await this.cacheResults(batchedResults);

    return [...cachedData.values(), ...batchedResults];
  }

  private async getCachedCompanyData(ciks: string[]): Promise<Map<string, CompanyData>> {
    const cached = new Map<string, CompanyData>();
    
    await Promise.all(
      ciks.map(async cik => {
        const data = await this.cacheService.get<CompanyData>(
          CacheKeyGenerator.companyProfile(cik)
        );
        if (data) {
          cached.set(cik, data);
        }
      })
    );

    return cached;
  }
}
```

## Memory Management

### 1. Memory-Efficient Data Structures
```typescript
class MemoryEfficientFilingData {
  private data: Map<string, CompressedFilingData> = new Map();
  private compressionRatio: number = 0.7;

  set(accessionNumber: string, filingData: FilingData): void {
    const compressed = this.compress(filingData);
    this.data.set(accessionNumber, compressed);
    
    // Implement LRU eviction if memory usage is high
    this.evictIfNecessary();
  }

  get(accessionNumber: string): FilingData | null {
    const compressed = this.data.get(accessionNumber);
    return compressed ? this.decompress(compressed) : null;
  }

  private compress(data: FilingData): CompressedFilingData {
    // Use compression algorithm (e.g., gzip, brotli)
    return {
      compressed: zlib.gzipSync(JSON.stringify(data)),
      originalSize: JSON.stringify(data).length,
      timestamp: Date.now()
    };
  }

  private decompress(compressed: CompressedFilingData): FilingData {
    const decompressed = zlib.gunzipSync(compressed.compressed);
    return JSON.parse(decompressed.toString());
  }

  private evictIfNecessary(): void {
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 500 * 1024 * 1024; // 500MB

    if (memoryUsage.heapUsed > memoryThreshold) {
      // Evict oldest 25% of entries
      const entries = Array.from(this.data.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const evictCount = Math.floor(entries.length * 0.25);
      for (let i = 0; i < evictCount; i++) {
        this.data.delete(entries[i][0]);
      }
    }
  }
}
```

### 2. Garbage Collection Optimization
```typescript
@Service()
class MemoryManager {
  private gcInterval: NodeJS.Timeout;
  private memoryThreshold = 80; // 80% of available memory

  constructor() {
    this.setupGCMonitoring();
  }

  private setupGCMonitoring(): void {
    this.gcInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      if (memoryPercentage > this.memoryThreshold) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Clear unnecessary caches
        this.clearTemporaryCaches();
      }
    }, 30000); // Check every 30 seconds
  }

  private clearTemporaryCaches(): void {
    // Clear temporary query result caches
    // Keep only essential long-term caches
  }

  destroy(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }
  }
}
```

## Background Data Processing

### 1. Preemptive Caching
```typescript
@Service()
class PreemptiveCachingService {
  constructor(
    private cacheService: CacheService,
    private edgarService: EDGARService,
    private popularityTracker: PopularityTracker
  ) {}

  async preloadPopularData(): Promise<void> {
    // Get most popular companies
    const popularCompanies = await this.popularityTracker.getTopCompanies(100);
    
    // Preload their data
    await Promise.all(
      popularCompanies.map(async company => {
        await this.preloadCompanyData(company.cik);
      })
    );
  }

  private async preloadCompanyData(cik: string): Promise<void> {
    const tasks = [
      this.preloadCompanyProfile(cik),
      this.preloadRecentFilings(cik),
      this.preloadFinancialData(cik)
    ];

    await Promise.allSettled(tasks);
  }

  private async preloadCompanyProfile(cik: string): Promise<void> {
    const cacheKey = CacheKeyGenerator.companyProfile(cik);
    const cached = await this.cacheService.get(cacheKey);
    
    if (!cached) {
      const profile = await this.edgarService.getCompanyProfile(cik);
      await this.cacheService.set(cacheKey, profile, CacheTTL.COMPANY_PROFILES);
    }
  }

  private async preloadRecentFilings(cik: string): Promise<void> {
    const cacheKey = CacheKeyGenerator.companyFilings(cik);
    const cached = await this.cacheService.get(cacheKey);
    
    if (!cached) {
      const filings = await this.edgarService.getCompanyFilings(cik, 10);
      await this.cacheService.set(cacheKey, filings, CacheTTL.COMPANY_PROFILES);
    }
  }
}
```

### 2. Cache Warming Strategy
```typescript
@Service()
class CacheWarmingService {
  constructor(
    private cacheService: CacheService,
    private popularityTracker: PopularityTracker
  ) {}

  async warmCache(): Promise<void> {
    // Warm popular queries
    await this.warmPopularQueries();
    
    // Warm recent filings
    await this.warmRecentFilings();
    
    // Warm financial data for major companies
    await this.warmMajorCompaniesFinancialData();
  }

  private async warmPopularQueries(): Promise<void> {
    const popularQueries = await this.popularityTracker.getTopQueries(50);
    
    await Promise.all(
      popularQueries.map(async query => {
        try {
          // Re-execute popular queries to warm cache
          await this.executeAndCacheQuery(query);
        } catch (error) {
          // Log error but don't fail the warming process
          console.error(`Failed to warm query: ${query.text}`, error);
        }
      })
    );
  }

  private async warmRecentFilings(): Promise<void> {
    // Pre-cache recent filings from major companies
    const majorCompanies = await this.getMajorCompanies();
    
    await Promise.all(
      majorCompanies.map(async company => {
        const filings = await this.edgarService.getRecentFilings(company.cik, 5);
        const cacheKey = CacheKeyGenerator.companyFilings(company.cik);
        await this.cacheService.set(cacheKey, filings, CacheTTL.COMPANY_PROFILES);
      })
    );
  }
}
```

## Monitoring & Analytics

### 1. Cache Performance Monitoring
```typescript
@Service()
class CacheMonitoringService {
  private metrics: Map<string, CacheMetrics> = new Map();

  recordCacheHit(key: string): void {
    const metrics = this.getMetrics(key);
    metrics.hits++;
    metrics.lastAccessed = Date.now();
  }

  recordCacheMiss(key: string): void {
    const metrics = this.getMetrics(key);
    metrics.misses++;
    metrics.lastAccessed = Date.now();
  }

  private getMetrics(key: string): CacheMetrics {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        hits: 0,
        misses: 0,
        lastAccessed: Date.now(),
        createdAt: Date.now()
      });
    }
    return this.metrics.get(key)!;
  }

  getCacheStats(): CacheStats {
    const stats = {
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      topKeys: [] as string[]
    };

    for (const [key, metrics] of this.metrics) {
      stats.totalHits += metrics.hits;
      stats.totalMisses += metrics.misses;
    }

    stats.hitRate = stats.totalHits / (stats.totalHits + stats.totalMisses);
    
    // Get top performing cache keys
    stats.topKeys = Array.from(this.metrics.entries())
      .sort((a, b) => b[1].hits - a[1].hits)
      .slice(0, 10)
      .map(([key]) => key);

    return stats;
  }
}
```

### 2. Performance Alerting
```typescript
@Service()
class PerformanceAlertService {
  constructor(
    private cacheMonitoring: CacheMonitoringService,
    private notificationService: NotificationService
  ) {}

  async checkPerformanceMetrics(): Promise<void> {
    const stats = this.cacheMonitoring.getCacheStats();
    
    // Alert if cache hit rate is too low
    if (stats.hitRate < 0.7) {
      await this.notificationService.sendAlert({
        type: 'low_cache_hit_rate',
        message: `Cache hit rate is ${(stats.hitRate * 100).toFixed(1)}%`,
        severity: 'warning'
      });
    }

    // Alert if memory usage is high
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
      await this.notificationService.sendAlert({
        type: 'high_memory_usage',
        message: `Memory usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(0)}MB`,
        severity: 'critical'
      });
    }
  }
}
```

## Cache Configuration

### 1. Redis Configuration
```typescript
// Redis cache configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  keyPrefix: 'edgar:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  maxMemoryPolicy: 'allkeys-lru',
  
  // Connection pool
  family: 4,
  keepAlive: true,
  
  // Cluster configuration for production
  enableOfflineQueue: false,
  redisOptions: {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false
  }
};
```

### 2. Cache Size Management
```typescript
@Service()
class CacheSizeManager {
  private maxCacheSize = 1024 * 1024 * 1024; // 1GB
  private currentSize = 0;

  async addToCache(key: string, data: any, ttl: number): Promise<void> {
    const dataSize = this.calculateSize(data);
    
    // Check if adding this data would exceed the limit
    if (this.currentSize + dataSize > this.maxCacheSize) {
      await this.evictOldestEntries(dataSize);
    }

    await this.cacheService.set(key, data, ttl);
    this.currentSize += dataSize;
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Approximate size in bytes
  }

  private async evictOldestEntries(requiredSpace: number): Promise<void> {
    // Implementation of LRU eviction
    // This would connect to Redis and remove oldest entries
  }
}
```

This comprehensive caching and optimization strategy ensures optimal performance while maintaining data freshness and complying with SEC API rate limits.