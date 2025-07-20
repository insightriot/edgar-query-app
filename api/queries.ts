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
    let universalAnswer;
    try {
      universalAnswer = await universalEngine.processQuery(queryText);
      console.log('Universal Engine Success:', {
        confidence: universalAnswer.assessment.confidence,
        processingTime: universalAnswer.metadata.processingTimeMs
      });
    } catch (error) {
      console.error('Universal Engine Failed:', error.message);
      console.error('Error Details:', error);
      
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

    const response = {
      success: true,
      data: {
        queryId: universalAnswer.metadata.queryId,
        status: 'completed',
        query: queryText,
        answer: universalAnswer,
        // Legacy format for backward compatibility
        results: {
          type: 'universal_answer',
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