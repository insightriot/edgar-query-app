import { Router } from 'express';
import { SECEdgarClient } from '../services/sec-edgar-client';
import { CacheService, CacheKeys, CacheTTL } from '../services/cache-service';
import { asyncHandler } from '../middleware/error-handler';
import { rateLimiter } from '../middleware/rate-limiter';

const router = Router();
const secClient = new SECEdgarClient();
const cacheService = new CacheService();

/**
 * GET /api/v1/filings/search
 * Search for filings with filters
 */
router.get('/search', rateLimiter, asyncHandler(async (req, res) => {
  const { 
    company, 
    form, 
    date_from, 
    date_to, 
    limit = '20', 
    page = '1' 
  } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 100);

  if (!company) {
    return res.status(400).json({
      error: 'Company CIK is required',
      statusCode: 400
    });
  }

  const cik = company as string;
  if (!SECEdgarClient.isValidCIK(cik)) {
    return res.status(400).json({
      error: 'Invalid CIK format',
      statusCode: 400
    });
  }

  const formattedCik = SECEdgarClient.formatCIK(cik);
  const cacheKey = CacheKeys.companyFilings(formattedCik, form as string);

  const filings = await cacheService.getOrSet(
    cacheKey,
    async () => {
      let allFilings = await secClient.getRecentFilings(formattedCik, 50);
      
      // Apply filters
      if (form) {
        allFilings = allFilings.filter(filing => 
          filing.form.toLowerCase().includes((form as string).toLowerCase())
        );
      }

      if (date_from) {
        const fromDate = new Date(date_from as string);
        allFilings = allFilings.filter(filing => 
          new Date(filing.filingDate) >= fromDate
        );
      }

      if (date_to) {
        const toDate = new Date(date_to as string);
        allFilings = allFilings.filter(filing => 
          new Date(filing.filingDate) <= toDate
        );
      }

      return allFilings;
    },
    CacheTTL.RECENT_FILINGS
  );

  // Apply pagination
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedFilings = filings.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      filings: paginatedFilings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filings.length,
        total_pages: Math.ceil(filings.length / limitNum)
      },
      filters: {
        company: formattedCik,
        form: form || null,
        date_from: date_from || null,
        date_to: date_to || null
      }
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/filings/:accession_number
 * Get filing details by accession number
 */
router.get('/:accession_number', rateLimiter, asyncHandler(async (req, res) => {
  const { accession_number } = req.params;

  // Validate accession number format
  if (!/^\d{10}-\d{2}-\d{6}$/.test(accession_number)) {
    return res.status(400).json({
      error: 'Invalid accession number format',
      statusCode: 400
    });
  }

  // For now, return basic info about the filing
  // In a full implementation, you would fetch and parse the actual filing document
  res.json({
    success: true,
    data: {
      accession_number,
      message: 'Filing document parsing not implemented yet',
      document_url: `https://www.sec.gov/Archives/edgar/data/[CIK]/${accession_number.replace(/-/g, '')}-index.htm`
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/filings/recent
 * Get recent filings across all companies
 */
router.get('/recent', rateLimiter, asyncHandler(async (req, res) => {
  const { limit = '20' } = req.query;
  const limitNum = Math.min(parseInt(limit as string) || 20, 100);

  // This would typically come from a database of recent filings
  // For now, return a placeholder response
  res.json({
    success: true,
    data: {
      message: 'Recent filings across all companies not implemented yet',
      suggestion: 'Use /api/v1/companies/{cik}/filings to get filings for a specific company'
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/filings/forms
 * Get available filing form types
 */
router.get('/forms', asyncHandler(async (req, res) => {
  const filingForms = [
    {
      form: '10-K',
      description: 'Annual report',
      frequency: 'Annual'
    },
    {
      form: '10-Q',
      description: 'Quarterly report',
      frequency: 'Quarterly'
    },
    {
      form: '8-K',
      description: 'Current report',
      frequency: 'As needed'
    },
    {
      form: 'DEF 14A',
      description: 'Proxy statement',
      frequency: 'Annual'
    },
    {
      form: '10-K/A',
      description: 'Annual report amendment',
      frequency: 'As needed'
    },
    {
      form: '10-Q/A',
      description: 'Quarterly report amendment',
      frequency: 'As needed'
    },
    {
      form: '20-F',
      description: 'Annual report for foreign private issuers',
      frequency: 'Annual'
    },
    {
      form: '6-K',
      description: 'Report of foreign private issuer',
      frequency: 'Semi-annual'
    },
    {
      form: 'Form 3',
      description: 'Initial statement of beneficial ownership',
      frequency: 'As needed'
    },
    {
      form: 'Form 4',
      description: 'Statement of changes in beneficial ownership',
      frequency: 'As needed'
    },
    {
      form: 'Form 5',
      description: 'Annual statement of beneficial ownership',
      frequency: 'Annual'
    }
  ];

  res.json({
    success: true,
    data: {
      forms: filingForms,
      total: filingForms.length
    },
    timestamp: new Date().toISOString()
  });
}));

export default router;