export interface QueryContext {
  sessionId?: string;
  userId?: string;
  previousQueries?: string[];
  preferences?: any;
}

export interface ParsedQuery {
  intent: QueryIntent;
  entities: QueryEntities;
  modifiers: QueryModifiers;
  confidence: number;
  originalQuery: string;
}

export enum QueryIntent {
  COMPANY_LOOKUP = 'COMPANY_LOOKUP',
  COMPANY_PROFILE = 'COMPANY_PROFILE',
  COMPANY_OFFICERS = 'COMPANY_OFFICERS',
  REVENUE_QUERY = 'REVENUE_QUERY',
  PROFIT_QUERY = 'PROFIT_QUERY',
  BALANCE_SHEET = 'BALANCE_SHEET',
  CASH_FLOW = 'CASH_FLOW',
  FILING_SEARCH = 'FILING_SEARCH',
  FILING_CONTENT = 'FILING_CONTENT',
  INSIDER_TRADING = 'INSIDER_TRADING',
  COMPANY_COMPARISON = 'COMPANY_COMPARISON',
  SECTOR_ANALYSIS = 'SECTOR_ANALYSIS',
  PEER_ANALYSIS = 'PEER_ANALYSIS',
  HISTORICAL_DATA = 'HISTORICAL_DATA',
  QUARTERLY_TRENDS = 'QUARTERLY_TRENDS',
  YEAR_OVER_YEAR = 'YEAR_OVER_YEAR',
  UNKNOWN = 'UNKNOWN'
}

export interface QueryEntities {
  companies?: CompanyEntity[];
  tickers?: string[];
  metrics?: string[];
  timeperiods?: TimePeriod[];
  filingTypes?: string[];
  amounts?: AmountEntity[];
  sectors?: string[];
  concepts?: string[];
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

export interface AmountEntity {
  value: number;
  unit: string;
  confidence: number;
}

export interface QueryModifiers {
  comparison?: boolean;
  trendAnalysis?: boolean;
  format?: 'table' | 'chart' | 'raw';
  limit?: number;
  sortBy?: string;
  filters?: any;
}

export interface QueryResult {
  queryId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  query: string;
  parsedQuery?: ParsedQuery;
  results?: any;
  error?: string;
  executionTime?: number;
  timestamp: Date;
  context?: QueryContext;
}

export interface FinancialMetric {
  name: string;
  concept: string;
  taxonomy: string;
  unit: string;
  description: string;
  aliases: string[];
}

export const FINANCIAL_METRICS: FinancialMetric[] = [
  {
    name: 'Revenue',
    concept: 'Revenues',
    taxonomy: 'us-gaap',
    unit: 'USD',
    description: 'Total revenue or net sales',
    aliases: ['revenue', 'sales', 'net sales', 'total revenue', 'revenues']
  },
  {
    name: 'Net Income',
    concept: 'NetIncomeLoss',
    taxonomy: 'us-gaap',
    unit: 'USD',
    description: 'Net income or loss',
    aliases: ['net income', 'profit', 'earnings', 'net profit', 'net earnings']
  },
  {
    name: 'Total Assets',
    concept: 'Assets',
    taxonomy: 'us-gaap',
    unit: 'USD',
    description: 'Total assets',
    aliases: ['assets', 'total assets']
  },
  {
    name: 'Total Liabilities',
    concept: 'Liabilities',
    taxonomy: 'us-gaap',
    unit: 'USD',
    description: 'Total liabilities',
    aliases: ['liabilities', 'total liabilities', 'debt']
  },
  {
    name: 'Stockholders Equity',
    concept: 'StockholdersEquity',
    taxonomy: 'us-gaap',
    unit: 'USD',
    description: 'Total stockholders equity',
    aliases: ['equity', 'shareholders equity', 'stockholders equity']
  },
  {
    name: 'Cash and Cash Equivalents',
    concept: 'CashAndCashEquivalentsAtCarryingValue',
    taxonomy: 'us-gaap',
    unit: 'USD',
    description: 'Cash and cash equivalents',
    aliases: ['cash', 'cash equivalents', 'cash and cash equivalents']
  },
  {
    name: 'Operating Cash Flow',
    concept: 'NetCashProvidedByUsedInOperatingActivities',
    taxonomy: 'us-gaap',
    unit: 'USD',
    description: 'Net cash provided by operating activities',
    aliases: ['operating cash flow', 'cash flow from operations', 'operating activities cash flow']
  },
  {
    name: 'Research and Development',
    concept: 'ResearchAndDevelopmentExpense',
    taxonomy: 'us-gaap',
    unit: 'USD',
    description: 'Research and development expenses',
    aliases: ['r&d', 'research and development', 'rd expense', 'research expense']
  }
];