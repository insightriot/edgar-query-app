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
    // Use predefined CIK mappings for major companies (SEC API endpoint changed)
    const tickerToCik: { [key: string]: string } = {
      'AAPL': '0000320193',
      'APPLE': '0000320193',
      'TSLA': '0001318605',
      'TESLA': '0001318605',
      'MSFT': '0000789019',
      'MICROSOFT': '0000789019',
      'GOOGL': '0001652044',
      'GOOGLE': '0001652044',
      'ALPHABET': '0001652044',
      'AMZN': '0001018724',
      'AMAZON': '0001018724',
      'META': '0001326801',
      'FACEBOOK': '0001326801',
      'NFLX': '0001065280',
      'NETFLIX': '0001065280',
      'NVDA': '0001045810',
      'NVIDIA': '0001045810'
    };
    
    const upperTicker = ticker.toUpperCase();
    const cik = tickerToCik[upperTicker];
    
    if (!cik) {
      // Try to extract ticker from company name like "Tesla (TSLA)"
      const tickerMatch = ticker.match(/\(([A-Z]+)\)/);
      if (tickerMatch) {
        const extractedTicker = tickerMatch[1];
        const extractedCik = tickerToCik[extractedTicker];
        if (extractedCik) {
          return await searchCompaniesByCIK(extractedCik);
        }
      }
      throw new Error(`CIK mapping not found for ticker ${ticker}. Supported: AAPL, TSLA, MSFT, GOOGL, AMZN, META, NFLX, NVDA`);
    }

    // Get full company data using CIK
    return await searchCompaniesByCIK(cik);
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

export async function getRecentFilings(cik: string, count = 10, formType?: string) {
  try {
    const paddedCIK = cik.padStart(10, '0');
    const url = `${SEC_BASE_URL}/submissions/CIK${paddedCIK}.json`;
    
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      throw new Error(`SEC submissions error: ${response.status}`);
    }
    
    const companyData = await response.json();
    
    if (!companyData.filings || !companyData.filings.recent) {
      return [];
    }
    
    const filings = companyData.filings.recent;
    const recentFilings = [];
    
    for (let i = 0; i < filings.accessionNumber.length && recentFilings.length < count; i++) {
      // Filter by form type if specified
      if (!formType || filings.form[i] === formType) {
        recentFilings.push({
          accessionNumber: filings.accessionNumber[i],
          form: filings.form[i],
          filingDate: filings.filingDate[i],
          reportDate: filings.reportDate[i],
          primaryDocument: filings.primaryDocument[i],
          primaryDocDescription: filings.primaryDocDescription[i],
          items: filings.items ? filings.items[i] : '',
        });
      }
    }
    
    return recentFilings;
  } catch (error) {
    console.error('SEC recent filings error:', error);
    throw error;
  }
}

// New function to detect and extract 8-K earnings data
export async function getLatestEarningsRelease(cik: string) {
  try {
    // Get recent 8-K filings
    const recent8Ks = await getRecentFilings(cik, 10, '8-K');
    
    // Look for earnings-related 8-Ks (Item 2.02 or earnings keywords)
    const earningsFilings = recent8Ks.filter(filing => {
      const items = filing.items?.toLowerCase() || '';
      const description = filing.primaryDocDescription?.toLowerCase() || '';
      return items.includes('2.02') || 
             description.includes('earnings') || 
             description.includes('results of operations') ||
             description.includes('financial results');
    });
    
    if (earningsFilings.length === 0) {
      return null;
    }
    
    // Return the most recent earnings filing
    const latestEarnings = earningsFilings[0];
    return {
      filing: latestEarnings,
      type: '8-K_earnings',
      isRecentEarnings: true,
      filingDate: latestEarnings.filingDate,
      documentUrl: `https://www.sec.gov/Archives/edgar/data/${cik.padStart(10, '0')}/${latestEarnings.accessionNumber.replace(/-/g, '')}/${latestEarnings.primaryDocument}`
    };
  } catch (error) {
    console.error('Error getting earnings release:', error);
    return null;
  }
}

export async function getFinancialMetrics(cik: string, concept: string = 'Revenues') {
  try {
    const facts = await getCompanyFacts(cik);
    
    if (!facts.facts || !facts.facts['us-gaap']) {
      return null;
    }
    
    // Try multiple common revenue concept names
    const revenueConcepts = ['Revenues', 'Revenue', 'SalesRevenueNet', 'RevenueFromContractWithCustomerExcludingAssessedTax'];
    let actualConcept = concept;
    
    if (concept === 'Revenues' || concept.toLowerCase().includes('revenue')) {
      actualConcept = revenueConcepts.find(c => facts.facts['us-gaap'][c]) || concept;
    }
    
    if (!facts.facts['us-gaap'][actualConcept]) {
      console.log(`Available concepts for ${facts.entityName}:`, Object.keys(facts.facts['us-gaap']).filter(k => k.toLowerCase().includes('revenue')));
      return null;
    }
    
    const conceptData = facts.facts['us-gaap'][actualConcept];
    const units = Object.keys(conceptData.units)[0]; // Usually 'USD'
    
    if (!conceptData.units[units]) {
      return null;
    }
    
    // Get financial data from all relevant filing types
    const relevantForms = ['10-K', '10-Q', '8-K', '20-F', '40-F'];
    const financialData = conceptData.units[units]
      .filter((item: any) => relevantForms.includes(item.form))
      .sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime())
      .slice(0, 10); // Get more records to find latest data
    
    return {
      concept: actualConcept,
      unit: units,
      data: financialData,
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