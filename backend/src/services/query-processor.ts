import { v4 as uuidv4 } from 'uuid';
import { NLPService } from './nlp-service';
import { SECEdgarClient } from './sec-edgar-client';
import { CacheService, CacheKeys, CacheTTL } from './cache-service';
import { 
  QueryResult, 
  QueryContext, 
  ParsedQuery, 
  QueryIntent,
  CompanyEntity,
  TimePeriod 
} from '../types/query-types';
import { createError } from '../middleware/error-handler';
import crypto from 'crypto';

export class QueryProcessor {
  private nlpService: NLPService;
  private secClient: SECEdgarClient;
  private cacheService: CacheService;

  constructor() {
    this.nlpService = new NLPService();
    this.secClient = new SECEdgarClient();
    this.cacheService = new CacheService();
  }

  /**
   * Process a natural language query
   */
  async processQuery(query: string, context?: QueryContext): Promise<QueryResult> {
    const startTime = Date.now();
    const queryId = uuidv4();

    try {
      // Validate query
      const validation = this.nlpService.validateQuery(query);
      if (!validation.isValid) {
        throw createError(validation.error!, 400);
      }

      // Check cache first
      const cacheKey = CacheKeys.queryResult(this.generateQueryHash(query, context));
      const cachedResult = await this.cacheService.get<QueryResult>(cacheKey);
      
      if (cachedResult) {
        return {
          ...cachedResult,
          queryId, // Generate new ID for tracking
          timestamp: new Date()
        };
      }

      // Parse query using NLP
      const parsedQuery = await this.nlpService.parseQuery(query);

      // Execute query based on intent
      const results = await this.executeQuery(parsedQuery, context);

      const queryResult: QueryResult = {
        queryId,
        status: 'completed',
        query,
        parsedQuery,
        results,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        context
      };

      // Cache the result
      await this.cacheService.set(cacheKey, queryResult, CacheTTL.QUERY_RESULTS);

      return queryResult;

    } catch (error) {
      const queryResult: QueryResult = {
        queryId,
        status: 'failed',
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        context
      };

      return queryResult;
    }
  }

  /**
   * Execute parsed query based on intent
   */
  private async executeQuery(parsedQuery: ParsedQuery, context?: QueryContext): Promise<any> {
    switch (parsedQuery.intent) {
      case QueryIntent.COMPANY_LOOKUP:
      case QueryIntent.COMPANY_PROFILE:
        return this.handleCompanyLookup(parsedQuery);
      
      case QueryIntent.REVENUE_QUERY:
        return this.handleRevenueQuery(parsedQuery);
      
      case QueryIntent.PROFIT_QUERY:
        return this.handleProfitQuery(parsedQuery);
      
      case QueryIntent.FILING_SEARCH:
        return this.handleFilingSearch(parsedQuery);
      
      case QueryIntent.COMPANY_COMPARISON:
        return this.handleCompanyComparison(parsedQuery);
      
      case QueryIntent.HISTORICAL_DATA:
        return this.handleHistoricalData(parsedQuery);
      
      case QueryIntent.QUARTERLY_TRENDS:
        return this.handleQuarterlyTrends(parsedQuery);
      
      default:
        return this.handleGeneralQuery(parsedQuery);
    }
  }

  /**
   * Handle company lookup queries
   */
  private async handleCompanyLookup(parsedQuery: ParsedQuery): Promise<any> {
    const companies = parsedQuery.entities.companies || [];
    
    if (companies.length === 0) {
      throw createError('No company found in query', 400);
    }

    const company = companies[0];
    const cik = company.cik || this.nlpService.getCIK(company.name);
    
    if (!cik) {
      throw createError(`Could not find CIK for company: ${company.name}`, 404);
    }

    const cacheKey = CacheKeys.companyProfile(cik);
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [companyInfo, recentFilings] = await Promise.all([
          this.secClient.getCompanyInfo(cik),
          this.secClient.getRecentFilings(cik, 5)
        ]);

        return {
          type: 'company_profile',
          company: companyInfo,
          recent_filings: recentFilings,
          metadata: {
            source: 'SEC EDGAR',
            cik,
            last_updated: new Date().toISOString()
          }
        };
      },
      CacheTTL.COMPANY_PROFILES
    );
  }

  /**
   * Handle revenue queries
   */
  private async handleRevenueQuery(parsedQuery: ParsedQuery): Promise<any> {
    const companies = parsedQuery.entities.companies || [];
    
    if (companies.length === 0) {
      throw createError('No company found in query', 400);
    }

    const company = companies[0];
    const cik = company.cik || this.nlpService.getCIK(company.name);
    
    if (!cik) {
      throw createError(`Could not find CIK for company: ${company.name}`, 404);
    }

    const cacheKey = CacheKeys.financialData(cik, 'Revenues');
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const revenueData = await this.secClient.getFinancialData(cik, 'Revenues');
        
        // Filter by time period if specified
        const filteredData = this.filterByTimePeriod(revenueData, parsedQuery.entities.timeperiods);
        
        return {
          type: 'financial_data',
          metric: 'Revenue',
          company: { name: company.name, cik },
          data: filteredData,
          metadata: {
            source: 'SEC EDGAR',
            concept: 'us-gaap:Revenues',
            unit: 'USD',
            last_updated: new Date().toISOString()
          }
        };
      },
      CacheTTL.FINANCIAL_DATA
    );
  }

  /**
   * Handle profit queries
   */
  private async handleProfitQuery(parsedQuery: ParsedQuery): Promise<any> {
    const companies = parsedQuery.entities.companies || [];
    
    if (companies.length === 0) {
      throw createError('No company found in query', 400);
    }

    const company = companies[0];
    const cik = company.cik || this.nlpService.getCIK(company.name);
    
    if (!cik) {
      throw createError(`Could not find CIK for company: ${company.name}`, 404);
    }

    const cacheKey = CacheKeys.financialData(cik, 'NetIncomeLoss');
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const profitData = await this.secClient.getFinancialData(cik, 'NetIncomeLoss');
        
        // Filter by time period if specified
        const filteredData = this.filterByTimePeriod(profitData, parsedQuery.entities.timeperiods);
        
        return {
          type: 'financial_data',
          metric: 'Net Income',
          company: { name: company.name, cik },
          data: filteredData,
          metadata: {
            source: 'SEC EDGAR',
            concept: 'us-gaap:NetIncomeLoss',
            unit: 'USD',
            last_updated: new Date().toISOString()
          }
        };
      },
      CacheTTL.FINANCIAL_DATA
    );
  }

  /**
   * Handle filing search queries
   */
  private async handleFilingSearch(parsedQuery: ParsedQuery): Promise<any> {
    const companies = parsedQuery.entities.companies || [];
    
    if (companies.length === 0) {
      throw createError('No company found in query', 400);
    }

    const company = companies[0];
    const cik = company.cik || this.nlpService.getCIK(company.name);
    
    if (!cik) {
      throw createError(`Could not find CIK for company: ${company.name}`, 404);
    }

    const filingTypes = parsedQuery.entities.filingTypes || [];
    const cacheKey = CacheKeys.companyFilings(cik, filingTypes[0]);
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const filings = await this.secClient.getRecentFilings(cik, 20);
        
        // Filter by filing type if specified
        const filteredFilings = filingTypes.length > 0 
          ? filings.filter(filing => filingTypes.some(type => 
              filing.form.toLowerCase().includes(type.toLowerCase())
            ))
          : filings;
        
        return {
          type: 'filing_search',
          company: { name: company.name, cik },
          filings: filteredFilings,
          filters: {
            filing_types: filingTypes
          },
          metadata: {
            source: 'SEC EDGAR',
            total_found: filteredFilings.length,
            last_updated: new Date().toISOString()
          }
        };
      },
      CacheTTL.RECENT_FILINGS
    );
  }

  /**
   * Handle company comparison queries
   */
  private async handleCompanyComparison(parsedQuery: ParsedQuery): Promise<any> {
    const companies = parsedQuery.entities.companies || [];
    
    if (companies.length < 2) {
      throw createError('At least two companies required for comparison', 400);
    }

    const companyData = await Promise.all(
      companies.slice(0, 2).map(async (company) => {
        const cik = company.cik || this.nlpService.getCIK(company.name);
        
        if (!cik) {
          throw createError(`Could not find CIK for company: ${company.name}`, 404);
        }

        // Get revenue data for comparison
        const revenueData = await this.secClient.getFinancialData(cik, 'Revenues');
        
        return {
          company: { name: company.name, cik },
          revenue: revenueData.slice(0, 5) // Get latest 5 periods
        };
      })
    );

    return {
      type: 'company_comparison',
      companies: companyData,
      metric: 'Revenue',
      metadata: {
        source: 'SEC EDGAR',
        comparison_type: 'side_by_side',
        last_updated: new Date().toISOString()
      }
    };
  }

  /**
   * Handle historical data queries
   */
  private async handleHistoricalData(parsedQuery: ParsedQuery): Promise<any> {
    const companies = parsedQuery.entities.companies || [];
    const metrics = parsedQuery.entities.metrics || ['Revenue'];
    
    if (companies.length === 0) {
      throw createError('No company found in query', 400);
    }

    const company = companies[0];
    const cik = company.cik || this.nlpService.getCIK(company.name);
    
    if (!cik) {
      throw createError(`Could not find CIK for company: ${company.name}`, 404);
    }

    const metric = metrics[0];
    const concept = this.nlpService.getFinancialMetric(metric)?.concept || 'Revenues';
    
    const historicalData = await this.secClient.getFinancialData(cik, concept);
    
    return {
      type: 'historical_data',
      metric,
      company: { name: company.name, cik },
      data: historicalData,
      metadata: {
        source: 'SEC EDGAR',
        concept: `us-gaap:${concept}`,
        periods: historicalData.length,
        last_updated: new Date().toISOString()
      }
    };
  }

  /**
   * Handle quarterly trends queries
   */
  private async handleQuarterlyTrends(parsedQuery: ParsedQuery): Promise<any> {
    const companies = parsedQuery.entities.companies || [];
    
    if (companies.length === 0) {
      throw createError('No company found in query', 400);
    }

    const company = companies[0];
    const cik = company.cik || this.nlpService.getCIK(company.name);
    
    if (!cik) {
      throw createError(`Could not find CIK for company: ${company.name}`, 404);
    }

    const revenueData = await this.secClient.getFinancialData(cik, 'Revenues');
    
    // Filter for quarterly data only
    const quarterlyData = revenueData.filter(item => 
      item.form === '10-Q' || item.fiscalPeriod?.includes('Q')
    );
    
    return {
      type: 'quarterly_trends',
      metric: 'Revenue',
      company: { name: company.name, cik },
      data: quarterlyData,
      metadata: {
        source: 'SEC EDGAR',
        trend_type: 'quarterly',
        periods: quarterlyData.length,
        last_updated: new Date().toISOString()
      }
    };
  }

  /**
   * Handle general queries
   */
  private async handleGeneralQuery(parsedQuery: ParsedQuery): Promise<any> {
    // For unknown intents, try to provide helpful suggestions
    const suggestions = this.nlpService.generateSuggestions(parsedQuery.originalQuery);
    
    return {
      type: 'suggestions',
      message: 'I\'m not sure how to handle that query. Here are some suggestions:',
      suggestions,
      metadata: {
        original_query: parsedQuery.originalQuery,
        confidence: parsedQuery.confidence,
        detected_entities: parsedQuery.entities
      }
    };
  }

  /**
   * Filter data by time period
   */
  private filterByTimePeriod(data: any[], timePeriods?: TimePeriod[]): any[] {
    if (!timePeriods || timePeriods.length === 0) {
      return data;
    }

    const timePeriod = timePeriods[0];
    
    if (timePeriod.type === 'year') {
      return data.filter(item => {
        const itemYear = new Date(item.period).getFullYear().toString();
        return itemYear === timePeriod.value;
      });
    }

    if (timePeriod.type === 'relative') {
      // Handle "last 3 years" type queries
      const match = timePeriod.value.match(/(\d+)\s+(years?|quarters?)/i);
      if (match) {
        const count = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        if (unit.includes('year')) {
          const cutoffYear = new Date().getFullYear() - count;
          return data.filter(item => {
            const itemYear = new Date(item.period).getFullYear();
            return itemYear >= cutoffYear;
          });
        }
      }
    }

    return data;
  }

  /**
   * Generate cache key hash for query
   */
  private generateQueryHash(query: string, context?: QueryContext): string {
    const content = JSON.stringify({ query: query.toLowerCase(), context });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get query suggestions
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    return this.nlpService.generateSuggestions(partialQuery);
  }
}