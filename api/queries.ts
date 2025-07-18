import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/database';
import { get, set } from '../lib/redis';

async function rateLimit(ip: string, maxRequests = 10, windowMs = 60000): Promise<boolean> {
  const now = Date.now();
  const key = `ratelimit:${ip}`;
  
  try {
    const current = await get(key);
    const parsedCurrent = current ? JSON.parse(current) : null;

    if (!parsedCurrent || now > parsedCurrent.resetTime) {
      await set(key, { count: 1, resetTime: now + windowMs }, Math.ceil(windowMs / 1000));
      return true;
    }

    if (parsedCurrent.count >= maxRequests) {
      return false;
    }

    await set(key, { count: parsedCurrent.count + 1, resetTime: parsedCurrent.resetTime }, Math.ceil((parsedCurrent.resetTime - now) / 1000));
    return true;
  } catch (error) {
    console.error('Rate limiting error:', error);
    return true; // Allow request if Redis fails
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] as string || 'unknown';
  const rateLimitPassed = await rateLimit(ip);
  if (!rateLimitPassed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const { query: queryText } = req.body;

    if (!queryText || typeof queryText !== 'string') {
      return res.status(400).json({
        error: 'Query is required and must be a string',
        statusCode: 400
      });
    }

    const startTime = Date.now();

    // Basic NLP processing
    const intent = classifyIntent(queryText);
    const entities = extractEntities(queryText);

    // Log query to database
    try {
      await query(
        'INSERT INTO query_history (query_text, query_type, intent, entities, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
        [queryText, 'natural_language', intent, JSON.stringify(entities), ip, req.headers['user-agent']]
      );
    } catch (dbError) {
      console.error('Failed to log query:', dbError);
      // Continue processing even if logging fails
    }

    // Process query based on intent
    let results;
    try {
      results = await processQueryWithDatabase(queryText, intent, entities);
    } catch (error) {
      console.error('Query processing error:', error);
      results = {
        type: 'error_response',
        message: `Unable to process query at this time. Intent: ${intent}. Entities: ${entities.join(', ') || 'none'}.`,
        timestamp: new Date().toISOString(),
        metadata: {
          processingTime: Date.now() - startTime,
          source: 'vercel-serverless',
          error: 'Database processing failed'
        }
      };
    }

    const response = {
      success: true,
      data: {
        queryId: Date.now().toString(),
        status: 'completed',
        query: queryText,
        intent,
        entities,
        results
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({
      error: 'Internal server error',
      statusCode: 500
    });
  }
}

function classifyIntent(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('revenue') || lowerQuery.includes('sales') || lowerQuery.includes('income')) {
    return 'financial_metrics';
  }
  if (lowerQuery.includes('filing') || lowerQuery.includes('10-k') || lowerQuery.includes('10-q') || lowerQuery.includes('8-k')) {
    return 'sec_filings';
  }
  if (lowerQuery.includes('about') || lowerQuery.includes('business') || lowerQuery.includes('company')) {
    return 'company_info';
  }
  if (lowerQuery.includes('stock') || lowerQuery.includes('price') || lowerQuery.includes('market')) {
    return 'market_data';
  }
  
  return 'general_query';
}

function extractEntities(query: string): string[] {
  const entities: string[] = [];
  const companies = [
    'apple', 'microsoft', 'google', 'amazon', 'tesla', 'meta', 'netflix', 
    'nvidia', 'salesforce', 'adobe', 'intel', 'oracle', 'cisco', 'ibm'
  ];
  
  const lowerQuery = query.toLowerCase();
  
  companies.forEach(company => {
    if (lowerQuery.includes(company)) {
      entities.push(company.charAt(0).toUpperCase() + company.slice(1));
    }
  });
  
  // Extract years
  const yearMatch = query.match(/\b(20\d{2})\b/g);
  if (yearMatch) {
    entities.push(...yearMatch);
  }
  
  // Extract quarters
  const quarterMatch = query.match(/\b(Q[1-4])\b/gi);
  if (quarterMatch) {
    entities.push(...quarterMatch);
  }
  
  return entities;
}

async function processQueryWithDatabase(queryText: string, intent: string, entities: string[]): Promise<any> {
  const startTime = Date.now();
  
  // Extract company from entities
  const companyName = entities.find(entity => 
    !entity.match(/^\d{4}$/) && !entity.match(/^Q[1-4]$/i)
  );

  switch (intent) {
    case 'company_info':
      return await getCompanyInfo(companyName);
    
    case 'financial_metrics':
      return await getFinancialMetrics(companyName, queryText);
    
    case 'sec_filings':
      return await getSecFilings(companyName, queryText);
    
    default:
      return {
        type: 'general_response',
        message: `I understand you're asking about: ${queryText}. ${companyName ? `Company: ${companyName}` : 'No specific company identified.'}`,
        intent,
        entities,
        timestamp: new Date().toISOString(),
        metadata: {
          processingTime: Date.now() - startTime,
          source: 'database-integrated'
        }
      };
  }
}

async function getCompanyInfo(companyName?: string): Promise<any> {
  if (!companyName) {
    return {
      type: 'error_response',
      message: 'Please specify a company name to get company information.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    // Search for company in database
    const result = await query(
      'SELECT * FROM companies WHERE LOWER(name) LIKE LOWER($1) OR LOWER(ticker) = LOWER($2) LIMIT 1',
      [`%${companyName}%`, companyName]
    );

    if (result.rows.length === 0) {
      return {
        type: 'no_results',
        message: `No company found matching "${companyName}". The company may not be in our database yet.`,
        timestamp: new Date().toISOString()
      };
    }

    const company = result.rows[0];
    
    // Get recent filings
    const filingsResult = await query(
      'SELECT * FROM filings WHERE cik = $1 ORDER BY filing_date DESC LIMIT 5',
      [company.cik]
    );

    return {
      type: 'company_profile',
      company,
      recent_filings: filingsResult.rows,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Company info query error:', error);
    throw error;
  }
}

async function getFinancialMetrics(companyName?: string, queryText?: string): Promise<any> {
  if (!companyName) {
    return {
      type: 'error_response',
      message: 'Please specify a company name to get financial metrics.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    // Find company
    const companyResult = await query(
      'SELECT * FROM companies WHERE LOWER(name) LIKE LOWER($1) OR LOWER(ticker) = LOWER($2) LIMIT 1',
      [`%${companyName}%`, companyName]
    );

    if (companyResult.rows.length === 0) {
      return {
        type: 'no_results',
        message: `No company found matching "${companyName}".`,
        timestamp: new Date().toISOString()
      };
    }

    const company = companyResult.rows[0];
    
    // Determine metric based on query text
    let concept = 'Revenue';
    if (queryText?.toLowerCase().includes('revenue') || queryText?.toLowerCase().includes('sales')) {
      concept = 'Revenue';
    } else if (queryText?.toLowerCase().includes('profit') || queryText?.toLowerCase().includes('income')) {
      concept = 'NetIncomeLoss';
    }

    // Get financial data
    const financialResult = await query(
      'SELECT * FROM financial_data WHERE cik = $1 AND concept LIKE $2 ORDER BY fiscal_year DESC, fiscal_period DESC LIMIT 8',
      [company.cik, `%${concept}%`]
    );

    return {
      type: 'financial_data',
      company,
      metric: concept,
      data: financialResult.rows,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Financial metrics query error:', error);
    throw error;
  }
}

async function getSecFilings(companyName?: string, queryText?: string): Promise<any> {
  if (!companyName) {
    return {
      type: 'error_response',
      message: 'Please specify a company name to get SEC filings.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    // Find company
    const companyResult = await query(
      'SELECT * FROM companies WHERE LOWER(name) LIKE LOWER($1) OR LOWER(ticker) = LOWER($2) LIMIT 1',
      [`%${companyName}%`, companyName]
    );

    if (companyResult.rows.length === 0) {
      return {
        type: 'no_results',
        message: `No company found matching "${companyName}".`,
        timestamp: new Date().toISOString()
      };
    }

    const company = companyResult.rows[0];
    
    // Determine form type from query
    let formFilter = '';
    if (queryText?.toLowerCase().includes('10-k')) {
      formFilter = '10-K';
    } else if (queryText?.toLowerCase().includes('10-q')) {
      formFilter = '10-Q';
    } else if (queryText?.toLowerCase().includes('8-k')) {
      formFilter = '8-K';
    }

    // Get filings
    let filingsQuery = 'SELECT * FROM filings WHERE cik = $1';
    const params = [company.cik];
    
    if (formFilter) {
      filingsQuery += ' AND form = $2';
      params.push(formFilter);
    }
    
    filingsQuery += ' ORDER BY filing_date DESC LIMIT 20';

    const filingsResult = await query(filingsQuery, params);

    return {
      type: 'filing_search',
      company,
      form_filter: formFilter,
      filings: filingsResult.rows,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('SEC filings query error:', error);
    throw error;
  }
}