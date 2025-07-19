// Comprehensive SEC filing types database and matching system

export interface FilingType {
  form: string;
  name: string;
  description: string;
  keywords: string[];
  aliases: string[];
  category: 'periodic' | 'proxy' | 'insider' | 'investment' | 'other';
}

export const SEC_FILING_TYPES: FilingType[] = [
  // Periodic Reports
  {
    form: '10-K',
    name: 'Annual Report',
    description: 'Annual report providing comprehensive overview of business and financial condition',
    keywords: ['annual', 'yearly', 'comprehensive', 'business overview'],
    aliases: ['annual report', 'form 10-k', '10k'],
    category: 'periodic'
  },
  {
    form: '10-Q',
    name: 'Quarterly Report',
    description: 'Quarterly report with unaudited financial statements',
    keywords: ['quarterly', 'quarter', 'q1', 'q2', 'q3', 'q4', 'unaudited'],
    aliases: ['quarterly report', 'form 10-q', '10q'],
    category: 'periodic'
  },
  {
    form: '8-K',
    name: 'Current Report',
    description: 'Report of major corporate events or changes',
    keywords: ['current', 'event', 'material', 'disclosure', 'breaking news'],
    aliases: ['current report', 'form 8-k', '8k', 'material event'],
    category: 'periodic'
  },
  
  // Proxy and Information Statements
  {
    form: 'DEF 14A',
    name: 'Proxy Statement',
    description: 'Definitive proxy statement for shareholder meetings',
    keywords: ['proxy', 'shareholder meeting', 'voting', 'board', 'executive compensation'],
    aliases: ['proxy statement', 'def 14a', 'definitive proxy'],
    category: 'proxy'
  },
  {
    form: 'PREM14A',
    name: 'Preliminary Proxy Statement',
    description: 'Preliminary proxy statement for mergers and acquisitions',
    keywords: ['preliminary proxy', 'merger', 'acquisition', 'vote'],
    aliases: ['preliminary proxy', 'prem 14a'],
    category: 'proxy'
  },
  {
    form: 'DEFA14A',
    name: 'Additional Proxy Materials',
    description: 'Additional definitive proxy soliciting materials',
    keywords: ['additional proxy', 'supplemental', 'soliciting'],
    aliases: ['additional proxy materials', 'defa 14a'],
    category: 'proxy'
  },
  
  // Insider Trading Forms
  {
    form: '3',
    name: 'Initial Statement of Ownership',
    description: 'Initial statement of beneficial ownership of securities',
    keywords: ['insider', 'ownership', 'initial', 'beneficial'],
    aliases: ['form 3', 'initial ownership'],
    category: 'insider'
  },
  {
    form: '4',
    name: 'Statement of Changes in Ownership',
    description: 'Statement of changes in beneficial ownership',
    keywords: ['insider trading', 'ownership change', 'stock transaction'],
    aliases: ['form 4', 'insider trading', 'ownership change'],
    category: 'insider'
  },
  {
    form: '5',
    name: 'Annual Statement of Ownership',
    description: 'Annual statement of beneficial ownership',
    keywords: ['annual ownership', 'insider annual'],
    aliases: ['form 5', 'annual ownership statement'],
    category: 'insider'
  },
  
  // Registration and Offering Documents
  {
    form: 'S-1',
    name: 'Registration Statement',
    description: 'Registration statement for securities offerings',
    keywords: ['registration', 'ipo', 'public offering', 'securities'],
    aliases: ['s-1', 'registration statement', 'ipo filing'],
    category: 'other'
  },
  {
    form: 'S-3',
    name: 'Short Form Registration',
    description: 'Short form registration statement',
    keywords: ['short form registration', 'shelf registration'],
    aliases: ['s-3', 'short form registration'],
    category: 'other'
  },
  {
    form: 'S-4',
    name: 'Registration for Business Combinations',
    description: 'Registration statement for business combinations',
    keywords: ['business combination', 'merger registration'],
    aliases: ['s-4', 'merger registration'],
    category: 'other'
  },
  
  // Investment Company Forms
  {
    form: 'N-1A',
    name: 'Mutual Fund Registration',
    description: 'Registration statement for mutual funds',
    keywords: ['mutual fund', 'fund registration', 'investment company'],
    aliases: ['n-1a', 'mutual fund registration'],
    category: 'investment'
  },
  {
    form: 'N-Q',
    name: 'Fund Holdings Report',
    description: 'Quarterly schedule of portfolio holdings',
    keywords: ['fund holdings', 'portfolio', 'investments'],
    aliases: ['n-q', 'fund holdings', 'portfolio holdings'],
    category: 'investment'
  },
  
  // Special Forms
  {
    form: '11-K',
    name: 'Employee Stock Purchase Plan',
    description: 'Annual report for employee stock purchase plans',
    keywords: ['employee stock', 'espp', 'stock purchase plan'],
    aliases: ['11-k', 'employee stock plan', 'espp'],
    category: 'other'
  },
  {
    form: '20-F',
    name: 'Foreign Company Annual Report',
    description: 'Annual report for foreign private issuers',
    keywords: ['foreign company', 'international', 'adr'],
    aliases: ['20-f', 'foreign annual report', 'adr report'],
    category: 'periodic'
  },
  {
    form: '6-K',
    name: 'Foreign Company Current Report',
    description: 'Report of foreign private issuer',
    keywords: ['foreign current', 'international disclosure'],
    aliases: ['6-k', 'foreign current report'],
    category: 'periodic'
  },
  
  // Comment Letters (Not actual forms but SEC correspondence)
  {
    form: 'COMMENT',
    name: 'SEC Comment Letters',
    description: 'SEC staff comment letters and company responses',
    keywords: ['comment letter', 'sec staff', 'review', 'correspondence'],
    aliases: ['comment letters', 'staff comments', 'sec comments'],
    category: 'other'
  },
  
  // Tender Offers and Acquisitions
  {
    form: 'SC 13D',
    name: 'Beneficial Ownership Report',
    description: 'Report of beneficial ownership over 5%',
    keywords: ['beneficial ownership', '5% ownership', 'large shareholder'],
    aliases: ['13d', 'sc 13d', 'beneficial ownership'],
    category: 'other'
  },
  {
    form: 'SC 13G',
    name: 'Passive Beneficial Ownership',
    description: 'Passive beneficial ownership report',
    keywords: ['passive ownership', '13g', 'institutional'],
    aliases: ['13g', 'sc 13g', 'passive ownership'],
    category: 'other'
  },
  
  // Bankruptcy and Restructuring
  {
    form: '15-12B',
    name: 'Termination of Registration',
    description: 'Notice of termination of registration',
    keywords: ['termination', 'deregistration', 'going private'],
    aliases: ['15-12b', 'termination notice'],
    category: 'other'
  }
];

/**
 * Intelligently matches user query to SEC filing types
 */
export function matchFilingTypes(query: string): FilingType[] {
  const lowerQuery = query.toLowerCase();
  const matches: Array<{filing: FilingType, score: number}> = [];
  
  for (const filing of SEC_FILING_TYPES) {
    let score = 0;
    
    // Exact form match (highest priority)
    if (lowerQuery.includes(filing.form.toLowerCase())) {
      score += 100;
    }
    
    // Alias matches (high priority)
    for (const alias of filing.aliases) {
      if (lowerQuery.includes(alias.toLowerCase())) {
        score += 80;
      }
    }
    
    // Keyword matches (medium priority)
    for (const keyword of filing.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 30;
      }
    }
    
    // Name match (medium-low priority)
    if (lowerQuery.includes(filing.name.toLowerCase())) {
      score += 50;
    }
    
    // Description word matches (low priority)
    const descWords = filing.description.toLowerCase().split(' ');
    for (const word of descWords) {
      if (word.length > 3 && lowerQuery.includes(word)) {
        score += 5;
      }
    }
    
    if (score > 0) {
      matches.push({filing, score});
    }
  }
  
  // Sort by score (highest first) and return filing objects
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Top 5 matches
    .map(m => m.filing);
}

/**
 * Get all form codes for database queries
 */
export function getFormCodes(filingTypes: FilingType[]): string[] {
  return filingTypes.map(f => f.form);
}

/**
 * Check if query is asking about SEC filings
 */
export function isFilingQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const filingIndicators = [
    'filing', 'form', 'report', 'statement', 'disclosure',
    'sec', 'edgar', 'document', 'submission'
  ];
  
  return filingIndicators.some(indicator => lowerQuery.includes(indicator));
}

/**
 * Extract potential company references from query
 */
export function extractCompanyReferences(query: string): string[] {
  const companies: string[] = [];
  
  // Common company patterns
  const companyPatterns = [
    /\b([A-Z]{2,5})\b/g, // Ticker symbols
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corp|Company|Co)\b/g, // Company names
    /\bApple\b/gi, /\bMicrosoft\b/gi, /\bGoogle\b/gi, /\bAmazon\b/gi, /\bTesla\b/gi,
    /\bMeta\b/gi, /\bNetflix\b/gi, /\bNvidia\b/gi, /\bSalesforce\b/gi
  ];
  
  for (const pattern of companyPatterns) {
    const matches = query.match(pattern);
    if (matches) {
      companies.push(...matches);
    }
  }
  
  return [...new Set(companies)]; // Remove duplicates
}