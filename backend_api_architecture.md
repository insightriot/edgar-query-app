# Backend API Architecture for SEC EDGAR Query Processing

## Overview
A scalable, microservices-based backend architecture that processes natural language queries, interacts with SEC EDGAR APIs, and delivers structured financial data through RESTful endpoints.

## Architecture Patterns

### 1. Microservices Architecture
- **Query Processing Service**: Handles NLP and query parsing
- **Data Extraction Service**: Manages SEC EDGAR API interactions
- **Search Service**: Provides advanced search capabilities
- **User Service**: Manages authentication and user preferences
- **Export Service**: Handles data export and reporting
- **Notification Service**: Manages alerts and real-time updates

### 2. Event-Driven Architecture
- **Message Queue**: Redis/RabbitMQ for async processing
- **Event Streaming**: Apache Kafka for real-time data flow
- **Webhook System**: External integrations and notifications
- **CQRS Pattern**: Command Query Responsibility Segregation

### 3. Clean Architecture
- **Domain Layer**: Business logic and entities
- **Application Layer**: Use cases and orchestration
- **Infrastructure Layer**: External APIs and data persistence
- **Presentation Layer**: REST API controllers and DTOs

## API Design

### 1. RESTful Endpoints

#### Query Processing API
```typescript
// Query endpoint
POST /api/v1/queries
{
  "query": "What was Apple's revenue in 2023?",
  "context": {
    "session_id": "uuid",
    "user_id": "user_123",
    "previous_queries": []
  }
}

// Response
{
  "query_id": "uuid",
  "status": "processing",
  "estimated_time": "2-5 seconds",
  "results_url": "/api/v1/queries/uuid/results"
}
```

#### Results API
```typescript
// Get query results
GET /api/v1/queries/{query_id}/results

// Response
{
  "query_id": "uuid",
  "status": "completed",
  "query": "What was Apple's revenue in 2023?",
  "results": {
    "type": "financial_data",
    "company": {
      "name": "Apple Inc.",
      "ticker": "AAPL",
      "cik": "0000320193"
    },
    "data": {
      "revenue": [
        {
          "period": "2023",
          "value": 383285000000,
          "unit": "USD",
          "source": "10-K"
        }
      ]
    },
    "metadata": {
      "data_sources": ["10-K/2023"],
      "last_updated": "2024-01-15T10:30:00Z",
      "confidence": 0.95
    }
  },
  "export_options": {
    "csv": "/api/v1/queries/uuid/export/csv",
    "pdf": "/api/v1/queries/uuid/export/pdf",
    "json": "/api/v1/queries/uuid/export/json"
  }
}
```

#### Company Information API
```typescript
// Company search
GET /api/v1/companies/search?q={query}&limit={limit}

// Response
{
  "companies": [
    {
      "cik": "0000320193",
      "name": "Apple Inc.",
      "ticker": "AAPL",
      "sic": "3571",
      "industry": "Electronic Computers",
      "exchange": "NASDAQ"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}

// Company details
GET /api/v1/companies/{cik}

// Response
{
  "cik": "0000320193",
  "name": "Apple Inc.",
  "ticker": "AAPL",
  "profile": {
    "industry": "Electronic Computers",
    "sector": "Technology",
    "employees": 164000,
    "founded": "1976"
  },
  "recent_filings": [
    {
      "form_type": "10-K",
      "filing_date": "2023-11-03",
      "accession_number": "0000320193-23-000106"
    }
  ]
}
```

#### Filing Search API
```typescript
// Filing search
GET /api/v1/filings/search?company={cik}&form={type}&date_from={date}&date_to={date}

// Response
{
  "filings": [
    {
      "accession_number": "0000320193-23-000106",
      "cik": "0000320193",
      "company_name": "Apple Inc.",
      "form_type": "10-K",
      "filing_date": "2023-11-03",
      "period_end_date": "2023-09-30",
      "document_url": "/api/v1/filings/0000320193-23-000106/document",
      "xbrl_url": "/api/v1/filings/0000320193-23-000106/xbrl"
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "total_pages": 8
  }
}
```

### 2. GraphQL API (Optional)
```graphql
type Query {
  processQuery(input: QueryInput!): QueryResult!
  company(cik: String!): Company!
  filings(filter: FilingFilter!): FilingConnection!
  financialData(company: String!, metric: String!, period: String!): FinancialData!
}

type QueryInput {
  query: String!
  context: QueryContext
}

type QueryResult {
  queryId: ID!
  status: QueryStatus!
  results: QueryResultData
  estimatedTime: String
}

type Company {
  cik: String!
  name: String!
  ticker: String
  industry: String
  filings(first: Int, after: String): FilingConnection!
  financialData(metric: String!, period: String!): FinancialData!
}
```

## Service Architecture

### 1. Query Processing Service
```typescript
// Query Processing Service
@Service()
class QueryProcessingService {
  constructor(
    private nlpService: NLPService,
    private queryParser: QueryParser,
    private edgarService: EDGARService,
    private cacheService: CacheService
  ) {}

  async processQuery(query: string, context: QueryContext): Promise<QueryResult> {
    // 1. Parse and validate query
    const parsedQuery = await this.nlpService.parseQuery(query);
    
    // 2. Check cache for similar queries
    const cacheKey = this.generateCacheKey(parsedQuery);
    const cachedResult = await this.cacheService.get(cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }
    
    // 3. Process query
    const result = await this.executeQuery(parsedQuery, context);
    
    // 4. Cache result
    await this.cacheService.set(cacheKey, result, 3600); // 1 hour TTL
    
    return result;
  }

  private async executeQuery(parsedQuery: ParsedQuery, context: QueryContext): Promise<QueryResult> {
    switch (parsedQuery.intent) {
      case 'FINANCIAL_DATA':
        return await this.processFinancialQuery(parsedQuery, context);
      case 'COMPANY_INFO':
        return await this.processCompanyQuery(parsedQuery, context);
      case 'FILING_SEARCH':
        return await this.processFilingQuery(parsedQuery, context);
      default:
        throw new Error(`Unsupported query intent: ${parsedQuery.intent}`);
    }
  }
}
```

### 2. Data Extraction Service
```typescript
@Service()
class DataExtractionService {
  constructor(
    private edgarApiClient: EDGARAPIClient,
    private xbrlParser: XBRLParser,
    private htmlParser: HTMLParser,
    private rateLimiter: RateLimiter
  ) {}

  async extractFinancialData(cik: string, concept: string, period?: string): Promise<FinancialData[]> {
    // Rate limiting
    await this.rateLimiter.wait();
    
    // Fetch data from SEC EDGAR API
    const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${concept}.json`;
    const response = await this.edgarApiClient.get(url);
    
    // Parse and normalize data
    const parsedData = this.xbrlParser.parseConceptData(response.data);
    
    // Filter by period if specified
    if (period) {
      return parsedData.filter(item => this.matchesPeriod(item, period));
    }
    
    return parsedData;
  }

  async extractFilingContent(accessionNumber: string): Promise<FilingContent> {
    // Rate limiting
    await this.rateLimiter.wait();
    
    // Fetch filing document
    const filingUrl = this.buildFilingUrl(accessionNumber);
    const response = await this.edgarApiClient.get(filingUrl);
    
    // Parse content based on format
    if (response.headers['content-type']?.includes('html')) {
      return this.htmlParser.parse(response.data);
    } else if (response.headers['content-type']?.includes('xml')) {
      return this.xbrlParser.parse(response.data);
    }
    
    throw new Error('Unsupported filing format');
  }
}
```

### 3. Search Service
```typescript
@Service()
class SearchService {
  constructor(
    private searchEngine: ElasticsearchClient,
    private companyRepository: CompanyRepository,
    private filingRepository: FilingRepository
  ) {}

  async searchCompanies(query: string, filters: CompanyFilters): Promise<CompanySearchResult> {
    const searchQuery = {
      query: {
        multi_match: {
          query: query,
          fields: ['name^2', 'ticker^2', 'industry', 'description'],
          fuzziness: 'AUTO'
        }
      },
      filter: this.buildFilters(filters),
      size: filters.limit || 10,
      from: (filters.page - 1) * (filters.limit || 10)
    };

    const response = await this.searchEngine.search({
      index: 'companies',
      body: searchQuery
    });

    return {
      companies: response.body.hits.hits.map(hit => hit._source),
      total: response.body.hits.total.value,
      page: filters.page,
      limit: filters.limit
    };
  }

  async searchFilings(filters: FilingFilters): Promise<FilingSearchResult> {
    const searchQuery = {
      query: {
        bool: {
          must: [],
          filter: this.buildFilingFilters(filters)
        }
      },
      sort: [
        { filing_date: { order: 'desc' } }
      ],
      size: filters.limit || 20,
      from: (filters.page - 1) * (filters.limit || 20)
    };

    const response = await this.searchEngine.search({
      index: 'filings',
      body: searchQuery
    });

    return {
      filings: response.body.hits.hits.map(hit => hit._source),
      total: response.body.hits.total.value,
      page: filters.page,
      limit: filters.limit
    };
  }
}
```

### 4. User Service
```typescript
@Service()
class UserService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JWTService,
    private passwordService: PasswordService
  ) {}

  async authenticate(email: string, password: string): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(email);
    
    if (!user || !await this.passwordService.verify(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ userId: user.id, email: user.email });
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        preferences: user.preferences
      }
    };
  }

  async saveQuery(userId: string, query: string, results: any): Promise<SavedQuery> {
    const savedQuery = await this.userRepository.saveQuery({
      userId,
      query,
      results,
      timestamp: new Date()
    });

    return savedQuery;
  }
}
```

## Data Layer

### 1. Database Schema
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
    cik VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ticker VARCHAR(10),
    sic VARCHAR(4),
    industry VARCHAR(255),
    sector VARCHAR(100),
    exchange VARCHAR(50),
    employees INTEGER,
    founded DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Filings table
CREATE TABLE filings (
    accession_number VARCHAR(20) PRIMARY KEY,
    cik VARCHAR(10) NOT NULL,
    form_type VARCHAR(10) NOT NULL,
    filing_date DATE NOT NULL,
    period_end_date DATE,
    document_count INTEGER,
    file_size BIGINT,
    document_url TEXT,
    xbrl_available BOOLEAN DEFAULT FALSE,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cik) REFERENCES companies(cik)
);

-- Financial data table
CREATE TABLE financial_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accession_number VARCHAR(20) NOT NULL,
    cik VARCHAR(10) NOT NULL,
    concept VARCHAR(100) NOT NULL,
    value DECIMAL(20,2),
    unit VARCHAR(20),
    period_start DATE,
    period_end DATE,
    instant_date DATE,
    form_type VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accession_number) REFERENCES filings(accession_number),
    FOREIGN KEY (cik) REFERENCES companies(cik)
);

-- Query history table
CREATE TABLE query_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    query TEXT NOT NULL,
    parsed_query JSONB,
    results JSONB,
    execution_time INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Saved queries table
CREATE TABLE saved_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    filters JSONB,
    schedule JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2. Repository Pattern
```typescript
@Repository()
class CompanyRepository {
  constructor(
    @InjectDataSource() private dataSource: DataSource
  ) {}

  async findByCik(cik: string): Promise<Company | null> {
    return await this.dataSource
      .getRepository(Company)
      .findOne({ where: { cik } });
  }

  async search(query: string, filters: CompanyFilters): Promise<Company[]> {
    const queryBuilder = this.dataSource
      .getRepository(Company)
      .createQueryBuilder('company')
      .where('company.name ILIKE :query', { query: `%${query}%` })
      .orWhere('company.ticker ILIKE :query', { query: `%${query}%` });

    if (filters.industry) {
      queryBuilder.andWhere('company.industry = :industry', { industry: filters.industry });
    }

    if (filters.sector) {
      queryBuilder.andWhere('company.sector = :sector', { sector: filters.sector });
    }

    return await queryBuilder
      .limit(filters.limit || 10)
      .offset((filters.page - 1) * (filters.limit || 10))
      .getMany();
  }

  async save(company: Company): Promise<Company> {
    return await this.dataSource
      .getRepository(Company)
      .save(company);
  }
}
```

## Message Queue & Event Processing

### 1. Message Queue Setup
```typescript
// Message Queue Service
@Service()
class MessageQueueService {
  constructor(
    private redisClient: Redis,
    private bullQueue: Queue
  ) {}

  async publishQuery(query: ProcessQueryMessage): Promise<void> {
    await this.bullQueue.add('process-query', query, {
      attempts: 3,
      backoff: 'exponential',
      delay: 1000
    });
  }

  async publishDataExtraction(extraction: DataExtractionMessage): Promise<void> {
    await this.bullQueue.add('extract-data', extraction, {
      attempts: 5,
      backoff: 'exponential',
      delay: 2000
    });
  }
}

// Message Processors
@Processor('process-query')
class QueryProcessor {
  constructor(
    private queryService: QueryProcessingService
  ) {}

  @Process('process-query')
  async processQuery(job: Job<ProcessQueryMessage>): Promise<void> {
    const { queryId, query, context } = job.data;
    
    try {
      const result = await this.queryService.processQuery(query, context);
      
      // Update query status
      await this.updateQueryStatus(queryId, 'completed', result);
      
      // Notify client via WebSocket
      await this.notifyClient(context.userId, queryId, result);
      
    } catch (error) {
      await this.updateQueryStatus(queryId, 'failed', null, error.message);
      await this.notifyClient(context.userId, queryId, null, error.message);
    }
  }
}
```

### 2. Event-Driven Updates
```typescript
// Event Bus
@Service()
class EventBus {
  constructor(
    private eventEmitter: EventEmitter2
  ) {}

  async publishEvent(event: DomainEvent): Promise<void> {
    await this.eventEmitter.emitAsync(event.type, event);
  }

  onEvent(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    this.eventEmitter.on(eventType, handler);
  }
}

// Event Handlers
@EventHandler()
class FilingEventHandler {
  constructor(
    private searchService: SearchService,
    private notificationService: NotificationService
  ) {}

  @OnEvent('filing.new')
  async handleNewFiling(event: NewFilingEvent): Promise<void> {
    // Index new filing for search
    await this.searchService.indexFiling(event.filing);
    
    // Notify users who have saved queries matching this filing
    await this.notificationService.notifyMatchingUsers(event.filing);
  }

  @OnEvent('filing.processed')
  async handleProcessedFiling(event: ProcessedFilingEvent): Promise<void> {
    // Update search index with extracted data
    await this.searchService.updateFilingIndex(event.accessionNumber, event.extractedData);
  }
}
```

## Rate Limiting & Compliance

### 1. Rate Limiter Implementation
```typescript
@Service()
class RateLimiter {
  constructor(
    private redisClient: Redis
  ) {}

  async checkLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const current = await this.redisClient.incr(key);
    
    if (current === 1) {
      await this.redisClient.expire(key, Math.ceil(windowMs / 1000));
    }
    
    return current <= maxRequests;
  }

  async wait(): Promise<void> {
    const canProceed = await this.checkLimit('sec-api-requests', 10, 1000); // 10 requests per second
    
    if (!canProceed) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      return this.wait(); // Retry
    }
  }
}
```

### 2. Request Logging & Monitoring
```typescript
@Service()
class RequestLogger {
  constructor(
    private logger: Logger
  ) {}

  logRequest(request: APIRequest): void {
    this.logger.info('API Request', {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      timestamp: new Date().toISOString()
    });
  }

  logResponse(response: APIResponse, duration: number): void {
    this.logger.info('API Response', {
      statusCode: response.statusCode,
      duration: `${duration}ms`,
      size: response.contentLength,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Security & Authentication

### 1. JWT Authentication
```typescript
@Injectable()
class JWTStrategy extends PassportStrategy(Strategy) {
  constructor(
    private userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET
    });
  }

  async validate(payload: JWTPayload): Promise<User> {
    const user = await this.userService.findById(payload.userId);
    
    if (!user) {
      throw new UnauthorizedException();
    }
    
    return user;
  }
}
```

### 2. Input Validation & Sanitization
```typescript
// DTOs with validation
class ProcessQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  query: string;

  @IsOptional()
  @IsObject()
  context?: QueryContext;
}

class CompanySearchDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  q: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  sector?: string;
}
```

## Performance Optimization

### 1. Response Caching
```typescript
@Service()
class CacheService {
  constructor(
    private redisClient: Redis
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.redisClient.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
}
```

### 2. Database Query Optimization
```typescript
@Service()
class QueryOptimizer {
  constructor(
    private dataSource: DataSource
  ) {}

  async getCompanyWithFilings(cik: string): Promise<Company> {
    return await this.dataSource
      .getRepository(Company)
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.filings', 'filing')
      .where('company.cik = :cik', { cik })
      .orderBy('filing.filing_date', 'DESC')
      .limit(10)
      .getOne();
  }

  async getFinancialDataAggregated(cik: string, concept: string): Promise<FinancialSummary> {
    const result = await this.dataSource
      .getRepository(FinancialData)
      .createQueryBuilder('fd')
      .select([
        'EXTRACT(YEAR FROM fd.period_end_date) as year',
        'AVG(fd.value) as avg_value',
        'COUNT(*) as count'
      ])
      .where('fd.cik = :cik', { cik })
      .andWhere('fd.concept = :concept', { concept })
      .groupBy('EXTRACT(YEAR FROM fd.period_end_date)')
      .orderBy('year', 'DESC')
      .limit(5)
      .getRawMany();

    return result;
  }
}
```

## Deployment & Infrastructure

### 1. Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### 2. Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/edgar_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=edgar_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  elasticsearch:
    image: elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
```

This comprehensive backend architecture provides a robust foundation for processing natural language queries against SEC EDGAR data with scalability, performance, and reliability in mind.