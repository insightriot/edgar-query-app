// Live SEC EDGAR API integration
const SEC_BASE_URL = 'https://data.sec.gov';
const USER_AGENT = process.env.SEC_API_USER_AGENT || 'Edgar Query App/1.0';

// Rate limiting: SEC allows 10 requests per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms = 10 req/sec

async function rateLimitedFetch(url: string, options: RequestInit = {}) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  return fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      ...options.headers,
    },
  });
}

export async function searchCompaniesByCIK(cik: string) {
  try {
    const paddedCIK = cik.padStart(10, '0');
    const url = `${SEC_BASE_URL}/submissions/CIK${paddedCIK}.json`;
    
    const response = await rateLimitedFetch(url);
    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('SEC company search error:', error);
    throw error;
  }
}

export async function searchCompaniesByTicker(ticker: string) {
  try {
    // First get the CIK from ticker lookup
    const tickerUrl = `${SEC_BASE_URL}/files/company_tickers.json`;
    const response = await rateLimitedFetch(tickerUrl);
    
    if (!response.ok) {
      throw new Error(`SEC ticker lookup error: ${response.status}`);
    }
    
    const tickers = await response.json();
    
    // Find the company by ticker
    const company = Object.values(tickers).find((company: any) => 
      company.ticker?.toLowerCase() === ticker.toLowerCase()
    );
    
    if (!company) {
      throw new Error(`Ticker ${ticker} not found`);
    }
    
    // Get full company data using CIK
    return await searchCompaniesByCIK((company as any).cik_str);
  } catch (error) {
    console.error('SEC ticker search error:', error);
    throw error;
  }
}

export async function getCompanyFacts(cik: string) {
  try {
    const paddedCIK = cik.padStart(10, '0');
    const url = `${SEC_BASE_URL}/api/xbrl/companyfacts/CIK${paddedCIK}.json`;
    
    const response = await rateLimitedFetch(url);
    if (!response.ok) {
      throw new Error(`SEC facts API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('SEC company facts error:', error);
    throw error;
  }
}

export async function getRecentFilings(cik: string, count = 10) {
  try {
    const companyData = await searchCompaniesByCIK(cik);
    
    if (!companyData.filings || !companyData.filings.recent) {
      return [];
    }
    
    const filings = companyData.filings.recent;
    const recentFilings = [];
    
    for (let i = 0; i < Math.min(count, filings.accessionNumber.length); i++) {
      recentFilings.push({
        accessionNumber: filings.accessionNumber[i],
        form: filings.form[i],
        filingDate: filings.filingDate[i],
        reportDate: filings.reportDate[i],
        primaryDocument: filings.primaryDocument[i],
        primaryDocDescription: filings.primaryDocDescription[i],
      });
    }
    
    return recentFilings;
  } catch (error) {
    console.error('SEC recent filings error:', error);
    throw error;
  }
}

export async function getFinancialMetrics(cik: string, concept: string = 'Revenues') {
  try {
    const facts = await getCompanyFacts(cik);
    
    if (!facts.facts || !facts.facts['us-gaap'] || !facts.facts['us-gaap'][concept]) {
      return null;
    }
    
    const conceptData = facts.facts['us-gaap'][concept];
    const units = Object.keys(conceptData.units)[0]; // Usually 'USD'
    
    if (!conceptData.units[units]) {
      return null;
    }
    
    // Get the most recent annual data
    const annualData = conceptData.units[units]
      .filter((item: any) => item.form === '10-K')
      .sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime())
      .slice(0, 5); // Last 5 years
    
    return {
      concept,
      unit: units,
      data: annualData,
      company: {
        name: facts.entityName,
        cik: facts.cik,
      }
    };
  } catch (error) {
    console.error('SEC financial metrics error:', error);
    throw error;
  }
}