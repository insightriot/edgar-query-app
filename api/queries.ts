import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/database';
import { get, set } from '../lib/redis';
import { UniversalEdgarEngine } from '../lib/universal/universal-edgar-engine';

// Load environment variables for Vercel (always try to load .env.local)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // Ignore if dotenv fails in production
}

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

// Simple, direct query handler for basic requests
async function handleSimpleQuery(queryText: string): Promise<any> {
  const lowerQuery = queryText.toLowerCase();
  
  // Extract company name
  let companyName = '';
  const companyPatterns = [
    { pattern: /\btesla\b/gi, name: 'Tesla', ticker: 'TSLA', cik: '0001318605' },
    { pattern: /\bapple\b/gi, name: 'Apple', ticker: 'AAPL', cik: '0000320193' },
    { pattern: /\bmicrosoft\b/gi, name: 'Microsoft', ticker: 'MSFT', cik: '0000789019' },
    { pattern: /\bgoogle\b|alphabet/gi, name: 'Alphabet', ticker: 'GOOGL', cik: '0001652044' },
    { pattern: /\bamazon\b/gi, name: 'Amazon', ticker: 'AMZN', cik: '0001018724' },
    { pattern: /\bmeta\b|facebook/gi, name: 'Meta', ticker: 'META', cik: '0001326801' }
  ];
  
  let company = null;
  for (const pattern of companyPatterns) {
    if (pattern.pattern.test(queryText)) {
      company = pattern;
      break;
    }
  }
  
  if (!company) {
    return null; // Can't handle without a recognized company
  }
  
  // Handle filing requests
  if (/filing|10-k|10-q|8-k|document/i.test(queryText)) {
    try {
      // Import the SEC functions
      const { getRecentFilings } = await import('../lib/sec-edgar-live');
      
      // Extract number if specified
      const numberMatch = queryText.match(/(\d+)/);
      const count = numberMatch ? parseInt(numberMatch[1]) : 5;
      
      console.log(`Simple handler: Getting ${count} recent filings for ${company.name} (CIK: ${company.cik})`);
      const filings = await getRecentFilings(company.cik, count);
      
      if (filings && filings.length > 0) {
        let narrative = `Here are the ${Math.min(count, filings.length)} most recent SEC filings for ${company.name}:\n\n`;
        
        filings.slice(0, count).forEach((filing, index) => {
          const filingDate = new Date(filing.filingDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          narrative += `${index + 1}. **${filing.form}** - Filed on ${filingDate}\n`;
          narrative += `   Accession Number: ${filing.accessionNumber}\n`;
          if (filing.primaryDocument) {
            narrative += `   Document: ${filing.primaryDocument}\n`;
          }
          narrative += '\n';
        });
        
        narrative += `These filings are available on the SEC EDGAR database.`;
        
        return {
          type: 'filing_list',
          message: narrative,
          company: {
            name: company.name,
            ticker: company.ticker,
            cik: company.cik
          },
          filings: filings.slice(0, count),
          source: 'sec_edgar_direct',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Simple filing handler failed:', error);
      return null;
    }
  }
  
  return null; // Can't handle this type of query simply
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

    // Initialize Universal EDGAR Engine
    console.log('=== UNIVERSAL EDGAR ENGINE ===');
    console.log('Query:', queryText);
    console.log('Environment check - OpenAI Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    console.log('Environment check - Database URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');
    console.log('Environment check - SEC User Agent:', process.env.SEC_API_USER_AGENT ? 'Present' : 'Missing');
    
    const universalEngine = new UniversalEdgarEngine();
    
    // Log query to database
    try {
      await query(
        'INSERT INTO query_history (query_text, query_type, intent, entities, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
        [queryText, 'universal_edgar', 'universal', JSON.stringify({ query: queryText }), ip, req.headers['user-agent']]
      );
    } catch (dbError) {
      console.error('Failed to log query:', dbError);
      // Continue processing even if logging fails
    }

    // Process query with Universal EDGAR Engine
    console.log('=== Calling Universal EDGAR Engine ===');
    let universalAnswer;
    try {
      universalAnswer = await universalEngine.processQuery(queryText);
      console.log('=== Universal Engine Success ===');
      console.log('Confidence:', universalAnswer.assessment.confidence);
      console.log('Processing Time:', universalAnswer.metadata.processingTimeMs);
      console.log('Narrative Length:', universalAnswer.narrative.length);
      console.log('Query ID:', universalAnswer.metadata.queryId);
      console.log('Narrative Preview:', universalAnswer.narrative.substring(0, 200));
    } catch (error) {
      console.error('=== Universal Engine Failed ===');
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      
      // Generate fallback error response
      universalAnswer = {
        narrative: `I encountered an error processing your query "${queryText}". Please try again or rephrase your question.`,
        data: {},
        citations: [],
        assessment: {
          confidence: 0.1,
          completeness: 0.0,
          limitations: ['System error occurred'],
          assumptions: [],
          dataFreshness: {
            overall_age_days: 0,
            oldest_data_date: new Date(),
            newest_data_date: new Date(),
            has_realtime_data: false,
            coverage_gaps: []
          },
          bias_risks: []
        },
        followUp: {
          suggested_queries: ['Try rephrasing your question', 'Check company names are correct'],
          related_topics: [],
          deeper_analysis: [],
          comparison_opportunities: []
        },
        metadata: {
          queryId: `error_${Date.now()}`,
          timestamp: new Date(),
          processingTimeMs: Date.now() - startTime,
          sources: [],
          complexity: 'simple',
          confidence: 0.1
        }
      };
    }

    // Check if we got a meaningful response or should fall back to simple approach
    const isSuccessfulResponse = universalAnswer.assessment.confidence > 0.5 && 
                                  universalAnswer.narrative.length > 100 &&
                                  !universalAnswer.metadata.queryId.startsWith('error_') &&
                                  !universalAnswer.metadata.queryId.startsWith('low_confidence_');

    if (!isSuccessfulResponse) {
      console.log('Universal Engine failed, trying simple fallback for:', queryText);
      // Try simple, direct approach for basic queries
      try {
        const simpleResult = await handleSimpleQuery(queryText);
        if (simpleResult) {
          return res.status(200).json({
            success: true,
            data: {
              queryId: `simple_${Date.now()}`,
              status: 'completed',
              query: queryText,
              results: simpleResult
            }
          });
        }
      } catch (simpleError) {
        console.error('Simple fallback also failed:', simpleError);
      }
    }

    const response = {
      success: isSuccessfulResponse,
      data: {
        queryId: universalAnswer.metadata.queryId,
        status: isSuccessfulResponse ? 'completed' : 'failed',
        query: queryText,
        answer: universalAnswer,
        // Legacy format for backward compatibility
        results: {
          type: isSuccessfulResponse ? 'universal_answer' : 'error_response',
          narrative: universalAnswer.narrative,
          data: universalAnswer.data,
          citations: universalAnswer.citations,
          assessment: universalAnswer.assessment,
          source: 'universal_edgar_engine',
          timestamp: universalAnswer.metadata.timestamp
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