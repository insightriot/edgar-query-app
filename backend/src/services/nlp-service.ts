import { 
  QueryIntent, 
  ParsedQuery, 
  QueryEntities, 
  QueryModifiers, 
  CompanyEntity, 
  TimePeriod,
  FINANCIAL_METRICS,
  FinancialMetric
} from '../types/query-types';
import { createError } from '../middleware/error-handler';

export class NLPService {
  private intentPatterns: Map<QueryIntent, RegExp[]>;
  private companyNames: Map<string, string>; // name -> cik mapping
  private tickerToCik: Map<string, string>; // ticker -> cik mapping

  constructor() {
    this.intentPatterns = new Map();
    this.companyNames = new Map();
    this.tickerToCik = new Map();
    this.initializeIntentPatterns();
    this.initializeCompanyMappings();
  }

  private initializeIntentPatterns(): void {
    this.intentPatterns.set(QueryIntent.COMPANY_LOOKUP, [
      /find\s+(information\s+about\s+|data\s+on\s+|details\s+for\s+)?(.+)/i,
      /tell\s+me\s+about\s+(.+)/i,
      /what\s+is\s+(.+)/i,
      /show\s+me\s+(.+)/i
    ]);

    this.intentPatterns.set(QueryIntent.REVENUE_QUERY, [
      /what\s+(was|is)\s+(.+?)['s]?\s+(revenue|sales|net\s+sales)/i,
      /show\s+me\s+(.+?)['s]?\s+(revenue|sales)/i,
      /(.+?)\s+(revenue|sales)\s+(for|in)\s+(.+)/i,
      /(revenue|sales)\s+(of|for)\s+(.+)/i
    ]);

    this.intentPatterns.set(QueryIntent.PROFIT_QUERY, [
      /what\s+(was|is)\s+(.+?)['s]?\s+(profit|earnings|net\s+income)/i,
      /show\s+me\s+(.+?)['s]?\s+(profit|earnings)/i,
      /(.+?)\s+(profit|earnings|net\s+income)\s+(for|in)\s+(.+)/i,
      /(profit|earnings|net\s+income)\s+(of|for)\s+(.+)/i
    ]);

    this.intentPatterns.set(QueryIntent.FILING_SEARCH, [
      /find\s+(.+?)['s]?\s+(latest|recent|newest)\s+(10-k|10-q|8-k|filing)/i,
      /show\s+me\s+(.+?)['s]?\s+(filings|10-k|10-q|8-k)/i,
      /(.+?)\s+(10-k|10-q|8-k|filing)\s+(for|in)\s+(.+)/i,
      /(10-k|10-q|8-k|filings)\s+(for|from)\s+(.+)/i
    ]);

    this.intentPatterns.set(QueryIntent.COMPANY_COMPARISON, [
      /compare\s+(.+?)\s+(and|vs|versus)\s+(.+)/i,
      /(.+?)\s+(vs|versus)\s+(.+?)\s+(revenue|profit|sales|earnings)/i,
      /show\s+me\s+(.+?)\s+(and|vs)\s+(.+?)\s+(comparison|revenue|profit)/i
    ]);

    this.intentPatterns.set(QueryIntent.HISTORICAL_DATA, [
      /(.+?)\s+(revenue|profit|sales|earnings)\s+(over\s+)?(the\s+)?(last|past)\s+(\d+)\s+(years?|quarters?)/i,
      /show\s+me\s+(.+?)['s]?\s+(revenue|profit)\s+(trend|history|over\s+time)/i,
      /(.+?)\s+(financial\s+)?(history|trend|performance)\s+(over|for)\s+(.+)/i
    ]);

    this.intentPatterns.set(QueryIntent.QUARTERLY_TRENDS, [
      /(.+?)\s+(quarterly|q\d)\s+(revenue|profit|earnings)/i,
      /show\s+me\s+(.+?)['s]?\s+(quarterly|q\d)\s+(results|performance)/i,
      /(.+?)\s+(q\d\s+\d{4}|quarter\s+\d+)/i
    ]);
  }

  private initializeCompanyMappings(): void {
    // In a real implementation, this would be loaded from a database
    // For now, we'll use a small sample of well-known companies
    const companies = [
      { name: 'Apple Inc.', ticker: 'AAPL', cik: '0000320193' },
      { name: 'Microsoft Corporation', ticker: 'MSFT', cik: '0000789019' },
      { name: 'Amazon.com Inc.', ticker: 'AMZN', cik: '0001018724' },
      { name: 'Alphabet Inc.', ticker: 'GOOGL', cik: '0001652044' },
      { name: 'Tesla Inc.', ticker: 'TSLA', cik: '0001318605' },
      { name: 'Netflix Inc.', ticker: 'NFLX', cik: '0001065280' },
      { name: 'Meta Platforms Inc.', ticker: 'META', cik: '0001326801' },
      { name: 'NVIDIA Corporation', ticker: 'NVDA', cik: '0001045810' },
      { name: 'JPMorgan Chase & Co.', ticker: 'JPM', cik: '0000019617' },
      { name: 'Johnson & Johnson', ticker: 'JNJ', cik: '0000200406' }
    ];

    companies.forEach(company => {
      this.companyNames.set(company.name.toLowerCase(), company.cik);
      this.companyNames.set(company.name.toLowerCase().replace(/\s+(inc|corp|corporation|llc|ltd)\.?$/i, ''), company.cik);
      this.tickerToCik.set(company.ticker.toLowerCase(), company.cik);
    });
  }

  /**
   * Parse natural language query into structured format
   */
  async parseQuery(query: string): Promise<ParsedQuery> {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Classify intent
    const intent = this.classifyIntent(normalizedQuery);
    
    // Extract entities
    const entities = this.extractEntities(normalizedQuery);
    
    // Extract modifiers
    const modifiers = this.extractModifiers(normalizedQuery);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(intent, entities, modifiers);

    return {
      intent,
      entities,
      modifiers,
      confidence,
      originalQuery: query
    };
  }

  private classifyIntent(query: string): QueryIntent {
    for (const [intent, patterns] of this.intentPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          return intent;
        }
      }
    }
    return QueryIntent.UNKNOWN;
  }

  private extractEntities(query: string): QueryEntities {
    const entities: QueryEntities = {};

    // Extract companies
    entities.companies = this.extractCompanies(query);
    
    // Extract tickers
    entities.tickers = this.extractTickers(query);
    
    // Extract financial metrics
    entities.metrics = this.extractMetrics(query);
    
    // Extract time periods
    entities.timeperiods = this.extractTimePeriods(query);
    
    // Extract filing types
    entities.filingTypes = this.extractFilingTypes(query);
    
    // Extract concepts
    entities.concepts = this.extractConcepts(query);

    return entities;
  }

  private extractCompanies(query: string): CompanyEntity[] {
    const companies: CompanyEntity[] = [];
    
    // Look for company names
    for (const [name, cik] of this.companyNames) {
      const nameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (nameRegex.test(query)) {
        companies.push({
          name,
          cik,
          confidence: 0.9
        });
      }
    }

    // Look for ticker symbols
    const tickerRegex = /\b[A-Z]{1,5}\b/g;
    const tickerMatches = query.toUpperCase().match(tickerRegex);
    if (tickerMatches) {
      for (const ticker of tickerMatches) {
        const cik = this.tickerToCik.get(ticker.toLowerCase());
        if (cik) {
          companies.push({
            name: ticker,
            ticker,
            cik,
            confidence: 0.95
          });
        }
      }
    }

    return companies;
  }

  private extractTickers(query: string): string[] {
    const tickerRegex = /\b[A-Z]{1,5}\b/g;
    const matches = query.toUpperCase().match(tickerRegex);
    return matches || [];
  }

  private extractMetrics(query: string): string[] {
    const metrics: string[] = [];
    
    for (const metric of FINANCIAL_METRICS) {
      for (const alias of metric.aliases) {
        const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (aliasRegex.test(query)) {
          metrics.push(metric.name);
          break;
        }
      }
    }

    return [...new Set(metrics)]; // Remove duplicates
  }

  private extractTimePeriods(query: string): TimePeriod[] {
    const periods: TimePeriod[] = [];

    // Extract years
    const yearRegex = /\b(19|20)\d{2}\b/g;
    const yearMatches = query.match(yearRegex);
    if (yearMatches) {
      for (const year of yearMatches) {
        periods.push({
          type: 'year',
          value: year,
          confidence: 0.9
        });
      }
    }

    // Extract quarters
    const quarterRegex = /\b(q[1-4]|quarter\s+[1-4])\s*(19|20)\d{2}\b/gi;
    const quarterMatches = query.match(quarterRegex);
    if (quarterMatches) {
      for (const quarter of quarterMatches) {
        periods.push({
          type: 'quarter',
          value: quarter,
          confidence: 0.9
        });
      }
    }

    // Extract relative periods
    const relativeRegex = /\b(last|past)\s+(\d+)\s+(years?|quarters?|months?)\b/gi;
    const relativeMatches = query.match(relativeRegex);
    if (relativeMatches) {
      for (const relative of relativeMatches) {
        periods.push({
          type: 'relative',
          value: relative,
          confidence: 0.8
        });
      }
    }

    return periods;
  }

  private extractFilingTypes(query: string): string[] {
    const filingTypes: string[] = [];
    const filingRegex = /\b(10-k|10-q|8-k|def\s+14a|proxy|annual\s+report|quarterly\s+report)\b/gi;
    const matches = query.match(filingRegex);
    
    if (matches) {
      for (const match of matches) {
        filingTypes.push(match.toUpperCase().replace(/\s+/g, ' '));
      }
    }

    return [...new Set(filingTypes)];
  }

  private extractConcepts(query: string): string[] {
    const concepts: string[] = [];
    
    // Extract US-GAAP concepts mentioned in query
    for (const metric of FINANCIAL_METRICS) {
      for (const alias of metric.aliases) {
        const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (aliasRegex.test(query)) {
          concepts.push(metric.concept);
          break;
        }
      }
    }

    return [...new Set(concepts)];
  }

  private extractModifiers(query: string): QueryModifiers {
    const modifiers: QueryModifiers = {};

    // Check for comparison
    if (/\b(compare|vs|versus|against)\b/i.test(query)) {
      modifiers.comparison = true;
    }

    // Check for trend analysis
    if (/\b(trend|over\s+time|history|historical|growth|change)\b/i.test(query)) {
      modifiers.trendAnalysis = true;
    }

    // Extract format preferences
    if (/\b(table|chart|graph|raw\s+data)\b/i.test(query)) {
      const formatMatch = query.match(/\b(table|chart|graph|raw\s+data)\b/i);
      if (formatMatch) {
        modifiers.format = formatMatch[1].toLowerCase().replace(/\s+/g, '_') as any;
      }
    }

    // Extract limits
    const limitMatch = query.match(/\b(top|first|last)\s+(\d+)\b/i);
    if (limitMatch) {
      modifiers.limit = parseInt(limitMatch[2]);
    }

    return modifiers;
  }

  private calculateConfidence(intent: QueryIntent, entities: QueryEntities, modifiers: QueryModifiers): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on recognized entities
    if (entities.companies && entities.companies.length > 0) {
      confidence += 0.2;
    }
    if (entities.metrics && entities.metrics.length > 0) {
      confidence += 0.2;
    }
    if (entities.timeperiods && entities.timeperiods.length > 0) {
      confidence += 0.1;
    }

    // Increase confidence based on intent recognition
    if (intent !== QueryIntent.UNKNOWN) {
      confidence += 0.3;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Get financial metric by name or alias
   */
  getFinancialMetric(name: string): FinancialMetric | undefined {
    return FINANCIAL_METRICS.find(metric => 
      metric.name.toLowerCase() === name.toLowerCase() ||
      metric.aliases.some(alias => alias.toLowerCase() === name.toLowerCase())
    );
  }

  /**
   * Get CIK by company name or ticker
   */
  getCIK(identifier: string): string | undefined {
    const normalized = identifier.toLowerCase();
    return this.companyNames.get(normalized) || this.tickerToCik.get(normalized);
  }

  /**
   * Validate and normalize query
   */
  validateQuery(query: string): { isValid: boolean; error?: string; normalized?: string } {
    if (!query || query.trim().length === 0) {
      return { isValid: false, error: 'Query cannot be empty' };
    }

    if (query.length > 1000) {
      return { isValid: false, error: 'Query is too long (max 1000 characters)' };
    }

    const normalized = query.trim().replace(/\s+/g, ' ');
    return { isValid: true, normalized };
  }

  /**
   * Generate query suggestions based on partial input
   */
  generateSuggestions(partialQuery: string): string[] {
    const suggestions: string[] = [];
    const normalized = partialQuery.toLowerCase();

    // Company-based suggestions
    if (normalized.includes('apple')) {
      suggestions.push("What was Apple's revenue in 2023?");
      suggestions.push("Show me Apple's latest 10-K filing");
      suggestions.push("Apple's profit margins over the last 3 years");
    }

    // Metric-based suggestions
    if (normalized.includes('revenue')) {
      suggestions.push("Compare Apple and Microsoft revenue");
      suggestions.push("Show me Tesla's revenue growth");
      suggestions.push("Top 10 companies by revenue");
    }

    // General suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        "What was Apple's revenue in 2023?",
        "Show me Tesla's latest 10-K filing",
        "Compare Google and Microsoft profit margins",
        "Find Netflix's quarterly earnings",
        "Show me Amazon's cash flow statement"
      );
    }

    return suggestions.slice(0, 5);
  }
}