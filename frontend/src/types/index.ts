export interface QueryResult {
  queryId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  query: string;
  parsedQuery?: ParsedQuery;
  results?: any;
  error?: string;
  executionTime?: number;
  timestamp: string;
  context?: QueryContext;
}

export interface ParsedQuery {
  intent: string;
  entities: {
    companies?: CompanyEntity[];
    tickers?: string[];
    metrics?: string[];
    timeperiods?: TimePeriod[];
    filingTypes?: string[];
    concepts?: string[];
  };
  modifiers: {
    comparison?: boolean;
    trendAnalysis?: boolean;
    format?: 'table' | 'chart' | 'raw';
    limit?: number;
    sortBy?: string;
    filters?: any;
  };
  confidence: number;
  originalQuery: string;
}

export interface CompanyEntity {
  name: string;
  ticker?: string;
  cik?: string;
  confidence: number;
}

export interface TimePeriod {
  type: 'year' | 'quarter' | 'range' | 'relative';
  value: string;
  start?: string;
  end?: string;
  confidence: number;
}

export interface QueryContext {
  sessionId?: string;
  userId?: string;
  previousQueries?: string[];
  preferences?: any;
}

export interface Company {
  cik: string;
  name: string;
  ticker?: string;
  sic?: string;
  industry?: string;
  sector?: string;
  exchange?: string;
  employees?: number;
  founded?: string;
  description?: string;
}

export interface Filing {
  accessionNumber: string;
  filingDate: string;
  reportDate?: string;
  form: string;
  size: number;
  isXBRL: boolean;
  primaryDocument: string;
  primaryDocDescription?: string;
}

export interface FinancialData {
  concept: string;
  value: number;
  unit: string;
  period: string;
  form: string;
  filed: string;
  accessionNumber: string;
  fiscalYear: number;
  fiscalPeriod: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
}

export interface CompanySearchResult {
  name: string;
  ticker: string;
  cik: string;
}

export interface QuerySuggestion {
  category: string;
  queries: string[];
}