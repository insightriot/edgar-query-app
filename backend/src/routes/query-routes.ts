import { Router } from 'express';
import { QueryProcessor } from '../services/query-processor';
import { asyncHandler } from '../middleware/error-handler';
import { strictRateLimiter } from '../middleware/rate-limiter';

const router = Router();
const queryProcessor = new QueryProcessor();

/**
 * POST /api/v1/queries
 * Process a natural language query
 */
router.post('/', strictRateLimiter, asyncHandler(async (req, res) => {
  const { query, context } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      error: 'Query is required and must be a string',
      statusCode: 400
    });
  }

  const result = await queryProcessor.processQuery(query, context);
  
  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/queries/suggestions
 * Get query suggestions based on partial input
 */
router.get('/suggestions', asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({
      error: 'Query parameter "q" is required',
      statusCode: 400
    });
  }

  const suggestions = await queryProcessor.getSuggestions(q);
  
  res.json({
    success: true,
    data: {
      suggestions,
      query: q
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/queries/examples
 * Get example queries for different use cases
 */
router.get('/examples', asyncHandler(async (req, res) => {
  const examples = [
    {
      category: 'Company Information',
      queries: [
        "Tell me about Apple Inc.",
        "Find information about Microsoft",
        "What is Tesla's business description?"
      ]
    },
    {
      category: 'Financial Data',
      queries: [
        "What was Apple's revenue in 2023?",
        "Show me Google's profit margins",
        "Tesla's cash flow for the last quarter"
      ]
    },
    {
      category: 'Filing Search',
      queries: [
        "Find Apple's latest 10-K filing",
        "Show me Microsoft's recent 10-Q reports",
        "Netflix's 8-K filings from 2023"
      ]
    },
    {
      category: 'Comparisons',
      queries: [
        "Compare Apple and Microsoft revenue",
        "Google vs Amazon profit margins",
        "Tesla vs Ford quarterly earnings"
      ]
    },
    {
      category: 'Historical Analysis',
      queries: [
        "Apple's revenue growth over the last 5 years",
        "Microsoft's quarterly trends",
        "Amazon's profit history"
      ]
    }
  ];

  res.json({
    success: true,
    data: examples,
    timestamp: new Date().toISOString()
  });
}));

export default router;