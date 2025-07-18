import type { VercelRequest, VercelResponse } from '@vercel/node';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const key = ip;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
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
  const ip = req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query is required and must be a string',
        statusCode: 400
      });
    }

    // Basic NLP processing
    const intent = classifyIntent(query);
    const entities = extractEntities(query);

    // Mock response for now - will be replaced with real processing
    const response = {
      success: true,
      data: {
        queryId: Date.now().toString(),
        status: 'completed',
        query,
        intent,
        entities,
        results: {
          type: 'serverless_response',
          message: `Processed query: "${query}". Intent: ${intent}. Entities: ${entities.join(', ') || 'none'}. Database integration needed for full functionality.`,
          timestamp: new Date().toISOString(),
          metadata: {
            processingTime: Math.floor(Math.random() * 100) + 50,
            source: 'vercel-serverless'
          }
        }
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