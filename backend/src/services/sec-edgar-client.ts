import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createError } from '../middleware/error-handler';

export interface CompanySubmissions {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  description: string;
  website: string;
  investorWebsite: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  stateOfIncorporationDescription: string;
  addresses: any;
  phone: string;
  flags: string;
  formerNames: any[];
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      acceptanceDateTime: string[];
      act: string[];
      form: string[];
      fileNumber: string[];
      filmNumber: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      isInlineXBRL: number[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
    files: any[];
  };
}

export interface CompanyFacts {
  cik: string;
  entityName: string;
  facts: {
    [taxonomy: string]: {
      [concept: string]: {
        label: string;
        description: string;
        units: {
          [unit: string]: Array<{
            end: string;
            val: number;
            accn: string;
            fy: number;
            fp: string;
            form: string;
            filed: string;
            frame?: string;
          }>;
        };
      };
    };
  };
}

export interface CompanyConcept {
  cik: string;
  taxonomy: string;
  tag: string;
  label: string;
  description: string;
  entityName: string;
  units: {
    [unit: string]: Array<{
      end: string;
      val: number;
      accn: string;
      fy: number;
      fp: string;
      form: string;
      filed: string;
      frame?: string;
    }>;
  };
}

export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = false;
  private maxRequestsPerSecond: number;
  private interval: number;

  constructor(maxRequestsPerSecond: number = 10) {
    this.maxRequestsPerSecond = maxRequestsPerSecond;
    this.interval = 1000 / maxRequestsPerSecond;
  }

  async wait(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.running || this.queue.length === 0) {
      return;
    }

    this.running = true;
    const resolve = this.queue.shift()!;
    
    setTimeout(() => {
      this.running = false;
      resolve();
      this.processQueue();
    }, this.interval);
  }
}

export class SECEdgarClient {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private baseURL: string;
  private userAgent: string;

  constructor() {
    this.baseURL = process.env.SEC_API_BASE_URL || 'https://data.sec.gov';
    this.userAgent = process.env.SEC_API_USER_AGENT || 'EDGAR-Query-App/1.0 (contact@example.com)';
    this.rateLimiter = new RateLimiter(parseInt(process.env.SEC_API_RATE_LIMIT || '10'));

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'data.sec.gov'
      }
    });

    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.rateLimiter.wait();
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 429) {
          throw createError('SEC API rate limit exceeded', 429);
        }
        if (error.response?.status === 403) {
          throw createError('SEC API access forbidden - check User-Agent header', 403);
        }
        if (error.response?.status === 404) {
          throw createError('SEC data not found', 404);
        }
        throw createError(`SEC API error: ${error.message}`, error.response?.status || 500);
      }
    );
  }

  /**
   * Get company submissions data
   */
  async getCompanySubmissions(cik: string): Promise<CompanySubmissions> {
    const paddedCik = cik.padStart(10, '0');
    const url = `/submissions/CIK${paddedCik}.json`;
    
    try {
      const response = await this.client.get<CompanySubmissions>(url);
      return response.data;
    } catch (error) {
      throw createError(`Failed to fetch company submissions for CIK ${cik}: ${error}`, 500);
    }
  }

  /**
   * Get company facts (all XBRL data)
   */
  async getCompanyFacts(cik: string): Promise<CompanyFacts> {
    const paddedCik = cik.padStart(10, '0');
    const url = `/api/xbrl/companyfacts/CIK${paddedCik}.json`;
    
    try {
      const response = await this.client.get<CompanyFacts>(url);
      return response.data;
    } catch (error) {
      throw createError(`Failed to fetch company facts for CIK ${cik}: ${error}`, 500);
    }
  }

  /**
   * Get specific company concept data
   */
  async getCompanyConcept(cik: string, taxonomy: string, tag: string): Promise<CompanyConcept> {
    const paddedCik = cik.padStart(10, '0');
    const url = `/api/xbrl/companyconcept/CIK${paddedCik}/${taxonomy}/${tag}.json`;
    
    try {
      const response = await this.client.get<CompanyConcept>(url);
      return response.data;
    } catch (error) {
      throw createError(`Failed to fetch company concept ${tag} for CIK ${cik}: ${error}`, 500);
    }
  }

  /**
   * Get frames data (aggregated across all companies)
   */
  async getFrames(taxonomy: string, tag: string, unit: string, period: string): Promise<any> {
    const url = `/api/xbrl/frames/${taxonomy}/${tag}/${unit}/${period}.json`;
    
    try {
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw createError(`Failed to fetch frames data for ${taxonomy}/${tag}: ${error}`, 500);
    }
  }

  /**
   * Search for companies by name or ticker
   */
  async searchCompanies(query: string): Promise<any[]> {
    // This would typically use a search endpoint, but SEC doesn't provide one
    // For now, we'll implement a simple search by fetching company tickers
    // In a real implementation, you'd maintain a local search index
    
    throw createError('Company search not implemented - use CIK lookup instead', 501);
  }

  /**
   * Get company information by CIK
   */
  async getCompanyInfo(cik: string): Promise<{
    cik: string;
    name: string;
    ticker?: string;
    sic?: string;
    industry?: string;
    exchange?: string;
  }> {
    const submissions = await this.getCompanySubmissions(cik);
    
    return {
      cik: submissions.cik,
      name: submissions.name,
      ticker: submissions.tickers[0] || undefined,
      sic: submissions.sic,
      industry: submissions.sicDescription,
      exchange: submissions.exchanges[0] || undefined
    };
  }

  /**
   * Get recent filings for a company
   */
  async getRecentFilings(cik: string, limit: number = 10): Promise<any[]> {
    const submissions = await this.getCompanySubmissions(cik);
    const recent = submissions.filings.recent;
    
    const filings: any[] = [];
    const maxIndex = Math.min(limit, recent.accessionNumber.length);
    
    for (let i = 0; i < maxIndex; i++) {
      filings.push({
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i],
        form: recent.form[i],
        size: recent.size[i],
        isXBRL: recent.isXBRL[i] === 1,
        primaryDocument: recent.primaryDocument[i],
        primaryDocDescription: recent.primaryDocDescription[i]
      });
    }
    
    return filings;
  }

  /**
   * Get financial data for a specific concept
   */
  async getFinancialData(cik: string, concept: string, taxonomy: string = 'us-gaap'): Promise<any[]> {
    const conceptData = await this.getCompanyConcept(cik, taxonomy, concept);
    
    // Extract and flatten the units data
    const results: any[] = [];
    
    for (const [unit, values] of Object.entries(conceptData.units)) {
      for (const value of values) {
        results.push({
          concept,
          value: value.val,
          unit,
          period: value.end,
          form: value.form,
          filed: value.filed,
          accessionNumber: value.accn,
          fiscalYear: value.fy,
          fiscalPeriod: value.fp
        });
      }
    }
    
    // Sort by period (most recent first)
    results.sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());
    
    return results;
  }

  /**
   * Validate CIK format
   */
  static isValidCIK(cik: string): boolean {
    return /^\d{1,10}$/.test(cik);
  }

  /**
   * Format CIK with leading zeros
   */
  static formatCIK(cik: string): string {
    return cik.padStart(10, '0');
  }
}