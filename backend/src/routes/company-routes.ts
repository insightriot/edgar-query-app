import { Router } from 'express';
import { SECEdgarClient } from '../services/sec-edgar-client';
import { CacheService, CacheKeys, CacheTTL } from '../services/cache-service';
import { asyncHandler } from '../middleware/error-handler';
import { rateLimiter } from '../middleware/rate-limiter';

const router = Router();
const secClient = new SECEdgarClient();
const cacheService = new CacheService();

/**
 * GET /api/v1/companies/:cik
 * Get company information by CIK
 */
router.get('/:cik', rateLimiter, asyncHandler(async (req, res) => {
  const { cik } = req.params;

  if (!SECEdgarClient.isValidCIK(cik)) {
    return res.status(400).json({
      error: 'Invalid CIK format',
      statusCode: 400
    });
  }

  const formattedCik = SECEdgarClient.formatCIK(cik);
  const cacheKey = CacheKeys.companyProfile(formattedCik);

  const companyData = await cacheService.getOrSet(
    cacheKey,
    async () => {
      const [companyInfo, recentFilings] = await Promise.all([
        secClient.getCompanyInfo(formattedCik),
        secClient.getRecentFilings(formattedCik, 10)
      ]);

      return {
        company: companyInfo,
        recent_filings: recentFilings
      };
    },
    CacheTTL.COMPANY_PROFILES
  );

  res.json({
    success: true,
    data: companyData,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/companies/:cik/filings
 * Get filings for a specific company
 */
router.get('/:cik/filings', rateLimiter, asyncHandler(async (req, res) => {
  const { cik } = req.params;
  const { limit = '20', form } = req.query;

  if (!SECEdgarClient.isValidCIK(cik)) {
    return res.status(400).json({
      error: 'Invalid CIK format',
      statusCode: 400
    });
  }

  const formattedCik = SECEdgarClient.formatCIK(cik);
  const filingLimit = Math.min(parseInt(limit as string) || 20, 100);
  const cacheKey = CacheKeys.companyFilings(formattedCik, form as string);

  const filings = await cacheService.getOrSet(
    cacheKey,
    async () => {
      const allFilings = await secClient.getRecentFilings(formattedCik, filingLimit);
      
      // Filter by form type if specified
      if (form) {
        return allFilings.filter(filing => 
          filing.form.toLowerCase().includes((form as string).toLowerCase())
        );
      }
      
      return allFilings;
    },
    CacheTTL.RECENT_FILINGS
  );

  res.json({
    success: true,
    data: {
      cik: formattedCik,
      filings,
      total: filings.length,
      filters: {
        form: form || null,
        limit: filingLimit
      }
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/companies/:cik/facts
 * Get company facts (all XBRL data)
 */
router.get('/:cik/facts', rateLimiter, asyncHandler(async (req, res) => {
  const { cik } = req.params;

  if (!SECEdgarClient.isValidCIK(cik)) {
    return res.status(400).json({
      error: 'Invalid CIK format',
      statusCode: 400
    });
  }

  const formattedCik = SECEdgarClient.formatCIK(cik);
  const cacheKey = CacheKeys.companyFacts(formattedCik);

  const facts = await cacheService.getOrSet(
    cacheKey,
    async () => {
      return await secClient.getCompanyFacts(formattedCik);
    },
    CacheTTL.COMPANY_FACTS
  );

  res.json({
    success: true,
    data: facts,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/companies/:cik/concepts/:concept
 * Get specific concept data for a company
 */
router.get('/:cik/concepts/:concept', rateLimiter, asyncHandler(async (req, res) => {
  const { cik, concept } = req.params;
  const { taxonomy = 'us-gaap' } = req.query;

  if (!SECEdgarClient.isValidCIK(cik)) {
    return res.status(400).json({
      error: 'Invalid CIK format',
      statusCode: 400
    });
  }

  const formattedCik = SECEdgarClient.formatCIK(cik);
  const cacheKey = CacheKeys.financialData(formattedCik, concept);

  const conceptData = await cacheService.getOrSet(
    cacheKey,
    async () => {
      return await secClient.getFinancialData(formattedCik, concept, taxonomy as string);
    },
    CacheTTL.FINANCIAL_DATA
  );

  res.json({
    success: true,
    data: {
      cik: formattedCik,
      concept,
      taxonomy,
      data: conceptData
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/companies/search
 * Search for companies (placeholder - would need a search index)
 */
router.get('/search', rateLimiter, asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({
      error: 'Query parameter "q" is required',
      statusCode: 400
    });
  }

  // This is a placeholder implementation
  // In a real application, you would have a search index
  const popularCompanies = [
    { name: 'Apple Inc.', ticker: 'AAPL', cik: '0000320193' },
    { name: 'Microsoft Corporation', ticker: 'MSFT', cik: '0000789019' },
    { name: 'Amazon.com Inc.', ticker: 'AMZN', cik: '0001018724' },
    { name: 'Alphabet Inc.', ticker: 'GOOGL', cik: '0001652044' },
    { name: 'Tesla Inc.', ticker: 'TSLA', cik: '0001318605' },
    { name: 'Netflix Inc.', ticker: 'NFLX', cik: '0001065280' },
    { name: 'Meta Platforms Inc.', ticker: 'META', cik: '0001326801' },
    { name: 'NVIDIA Corporation', ticker: 'NVDA', cik: '0001045810' }
  ];

  const query = (q as string).toLowerCase();
  const results = popularCompanies.filter(company =>
    company.name.toLowerCase().includes(query) ||
    company.ticker.toLowerCase().includes(query)
  );

  res.json({
    success: true,
    data: {
      query: q,
      results,
      total: results.length
    },
    timestamp: new Date().toISOString()
  });
}));

export default router;