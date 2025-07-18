import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/database';

const SAMPLE_COMPANIES = [
  {
    cik: '0000320193',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    sic: '3571',
    industry: 'Technology Hardware, Storage & Peripherals',
    sector: 'Technology',
    exchange: 'NASDAQ',
    state: 'CA',
    employees: 154000,
    fiscal_year_end: '0930',
    website: 'https://www.apple.com',
    description: 'Apple Inc. designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessories.'
  },
  {
    cik: '0001018724',
    name: 'Amazon.com, Inc.',
    ticker: 'AMZN',
    sic: '5961',
    industry: 'Internet & Direct Marketing Retail',
    sector: 'Consumer Discretionary',
    exchange: 'NASDAQ',
    state: 'WA',
    employees: 1541000,
    fiscal_year_end: '1231',
    website: 'https://www.amazon.com',
    description: 'Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions.'
  },
  {
    cik: '0000789019',
    name: 'Microsoft Corporation',
    ticker: 'MSFT',
    sic: '7372',
    industry: 'Systems Software',
    sector: 'Technology',
    exchange: 'NASDAQ',
    state: 'WA',
    employees: 221000,
    fiscal_year_end: '0630',
    website: 'https://www.microsoft.com',
    description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.'
  },
  {
    cik: '0001652044',
    name: 'Alphabet Inc.',
    ticker: 'GOOGL',
    sic: '7370',
    industry: 'Interactive Media & Services',
    sector: 'Communication Services',
    exchange: 'NASDAQ',
    state: 'DE',
    employees: 182000,
    fiscal_year_end: '1231',
    website: 'https://abc.xyz',
    description: 'Alphabet Inc. provides online advertising services worldwide.'
  },
  {
    cik: '0001318605',
    name: 'Tesla, Inc.',
    ticker: 'TSLA',
    sic: '3711',
    industry: 'Automobile Manufacturers',
    sector: 'Consumer Discretionary',
    exchange: 'NASDAQ',
    state: 'TX',
    employees: 140473,
    fiscal_year_end: '1231',
    website: 'https://www.tesla.com',
    description: 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems.'
  }
];

const SAMPLE_FILINGS = [
  {
    cik: '0000320193',
    accession_number: '0000320193-23-000106',
    form: '10-K',
    filing_date: '2023-11-03',
    report_date: '2023-09-30',
    fiscal_year: 2023,
    fiscal_period: 'FY',
    primary_document: 'aapl-20230930.htm',
    primary_doc_description: 'Form 10-K - Annual report',
    size: 15687234,
    document_count: 101
  },
  {
    cik: '0000320193',
    accession_number: '0000320193-23-000077',
    form: '10-Q',
    filing_date: '2023-08-04',
    report_date: '2023-07-01',
    fiscal_year: 2023,
    fiscal_period: 'Q3',
    primary_document: 'aapl-20230701.htm',
    primary_doc_description: 'Form 10-Q - Quarterly report',
    size: 8234567,
    document_count: 45
  },
  {
    cik: '0001018724',
    accession_number: '0001018724-23-000017',
    form: '10-K',
    filing_date: '2023-02-03',
    report_date: '2022-12-31',
    fiscal_year: 2022,
    fiscal_period: 'FY',
    primary_document: 'amzn-20221231.htm',
    primary_doc_description: 'Form 10-K - Annual report',
    size: 18456789,
    document_count: 156
  },
  {
    cik: '0001652044',
    accession_number: '0001652044-23-000016',
    form: '10-K',
    filing_date: '2023-02-03',
    report_date: '2022-12-31',
    fiscal_year: 2022,
    fiscal_period: 'FY',
    primary_document: 'googl-20221231.htm',
    primary_doc_description: 'Form 10-K - Annual report',
    size: 12345678,
    document_count: 89
  },
  {
    cik: '0001318605',
    accession_number: '0001318605-23-000008',
    form: '10-K',
    filing_date: '2023-01-31',
    report_date: '2022-12-31',
    fiscal_year: 2022,
    fiscal_period: 'FY',
    primary_document: 'tsla-20221231.htm',
    primary_doc_description: 'Form 10-K - Annual report',
    size: 9876543,
    document_count: 67
  }
];

const SAMPLE_FINANCIAL_DATA = [
  // Apple financial data
  {
    cik: '0000320193',
    accession_number: '0000320193-23-000106',
    fiscal_year: 2023,
    fiscal_period: 'FY',
    form: '10-K',
    concept: 'Revenues',
    taxonomy: 'us-gaap',
    value: 383285000000,
    unit: 'USD',
    decimals: -6,
    frame: 'CY2023',
    filed_date: '2023-11-03'
  },
  {
    cik: '0000320193',
    accession_number: '0000320193-23-000106',
    fiscal_year: 2023,
    fiscal_period: 'FY',
    form: '10-K',
    concept: 'NetIncomeLoss',
    taxonomy: 'us-gaap',
    value: 96995000000,
    unit: 'USD',
    decimals: -6,
    frame: 'CY2023',
    filed_date: '2023-11-03'
  },
  // Amazon financial data
  {
    cik: '0001018724',
    accession_number: '0001018724-23-000017',
    fiscal_year: 2022,
    fiscal_period: 'FY',
    form: '10-K',
    concept: 'Revenues',
    taxonomy: 'us-gaap',
    value: 513983000000,
    unit: 'USD',
    decimals: -6,
    frame: 'CY2022',
    filed_date: '2023-02-03'
  },
  {
    cik: '0001018724',
    accession_number: '0001018724-23-000017',
    fiscal_year: 2022,
    fiscal_period: 'FY',
    form: '10-K',
    concept: 'NetIncomeLoss',
    taxonomy: 'us-gaap',
    value: -2722000000,
    unit: 'USD',
    decimals: -6,
    frame: 'CY2022',
    filed_date: '2023-02-03'
  },
  // Microsoft financial data
  {
    cik: '0000789019',
    accession_number: '0000789019-23-000017',
    fiscal_year: 2023,
    fiscal_period: 'FY',
    form: '10-K',
    concept: 'Revenues',
    taxonomy: 'us-gaap',
    value: 211915000000,
    unit: 'USD',
    decimals: -6,
    frame: 'CY2023',
    filed_date: '2023-07-26'
  },
  {
    cik: '0000789019',
    accession_number: '0000789019-23-000017',
    fiscal_year: 2023,
    fiscal_period: 'FY',
    form: '10-K',
    concept: 'NetIncomeLoss',
    taxonomy: 'us-gaap',
    value: 72361000000,
    unit: 'USD',
    decimals: -6,
    frame: 'CY2023',
    filed_date: '2023-07-26'
  },
  // Tesla financial data
  {
    cik: '0001318605',
    accession_number: '0001318605-23-000008',
    fiscal_year: 2022,
    fiscal_period: 'FY',
    form: '10-K',
    concept: 'Revenues',
    taxonomy: 'us-gaap',
    value: 81462000000,
    unit: 'USD',
    decimals: -6,
    frame: 'CY2022',
    filed_date: '2023-01-31'
  },
  {
    cik: '0001318605',
    accession_number: '0001318605-23-000008',
    fiscal_year: 2022,
    fiscal_period: 'FY',
    form: '10-K',
    concept: 'NetIncomeLoss',
    taxonomy: 'us-gaap',
    value: 12556000000,
    unit: 'USD',
    decimals: -6,
    frame: 'CY2022',
    filed_date: '2023-01-31'
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.SETUP_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let results = [];

    // Insert companies
    results.push('=== Inserting Companies ===');
    for (const company of SAMPLE_COMPANIES) {
      try {
        await query(
          `INSERT INTO companies (cik, name, ticker, sic, industry, sector, exchange, state, employees, fiscal_year_end, website, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (cik) DO UPDATE SET
           name = EXCLUDED.name,
           ticker = EXCLUDED.ticker,
           sic = EXCLUDED.sic,
           industry = EXCLUDED.industry,
           sector = EXCLUDED.sector,
           exchange = EXCLUDED.exchange,
           state = EXCLUDED.state,
           employees = EXCLUDED.employees,
           fiscal_year_end = EXCLUDED.fiscal_year_end,
           website = EXCLUDED.website,
           description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP`,
          [
            company.cik, company.name, company.ticker, company.sic, company.industry,
            company.sector, company.exchange, company.state, company.employees,
            company.fiscal_year_end, company.website, company.description
          ]
        );
        results.push(`✓ ${company.name} (${company.ticker})`);
      } catch (error) {
        results.push(`✗ ${company.name}: ${error.message}`);
      }
    }

    // Insert filings
    results.push('=== Inserting Filings ===');
    for (const filing of SAMPLE_FILINGS) {
      try {
        await query(
          `INSERT INTO filings (cik, accession_number, form, filing_date, report_date, fiscal_year, fiscal_period, primary_document, primary_doc_description, size, document_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (accession_number) DO UPDATE SET
           form = EXCLUDED.form,
           filing_date = EXCLUDED.filing_date,
           report_date = EXCLUDED.report_date,
           fiscal_year = EXCLUDED.fiscal_year,
           fiscal_period = EXCLUDED.fiscal_period,
           primary_document = EXCLUDED.primary_document,
           primary_doc_description = EXCLUDED.primary_doc_description,
           size = EXCLUDED.size,
           document_count = EXCLUDED.document_count,
           updated_at = CURRENT_TIMESTAMP`,
          [
            filing.cik, filing.accession_number, filing.form, filing.filing_date,
            filing.report_date, filing.fiscal_year, filing.fiscal_period,
            filing.primary_document, filing.primary_doc_description, filing.size, filing.document_count
          ]
        );
        results.push(`✓ ${filing.form} for CIK ${filing.cik}`);
      } catch (error) {
        results.push(`✗ ${filing.form}: ${error.message}`);
      }
    }

    // Insert financial data
    results.push('=== Inserting Financial Data ===');
    for (const financial of SAMPLE_FINANCIAL_DATA) {
      try {
        await query(
          `INSERT INTO financial_data (cik, accession_number, fiscal_year, fiscal_period, form, concept, taxonomy, value, unit, decimals, frame, filed_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (cik, fiscal_year, fiscal_period, concept, taxonomy) DO UPDATE SET
           accession_number = EXCLUDED.accession_number,
           form = EXCLUDED.form,
           value = EXCLUDED.value,
           unit = EXCLUDED.unit,
           decimals = EXCLUDED.decimals,
           frame = EXCLUDED.frame,
           filed_date = EXCLUDED.filed_date,
           updated_at = CURRENT_TIMESTAMP`,
          [
            financial.cik, financial.accession_number, financial.fiscal_year,
            financial.fiscal_period, financial.form, financial.concept, financial.taxonomy,
            financial.value, financial.unit, financial.decimals, financial.frame, financial.filed_date
          ]
        );
        results.push(`✓ ${financial.concept} for CIK ${financial.cik} (${financial.fiscal_year})`);
      } catch (error) {
        results.push(`✗ ${financial.concept}: ${error.message}`);
      }
    }

    res.status(200).json({
      message: 'Sample data seeded successfully',
      results,
      counts: {
        companies: SAMPLE_COMPANIES.length,
        filings: SAMPLE_FILINGS.length,
        financial_data: SAMPLE_FINANCIAL_DATA.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Data seeding error:', error);
    res.status(500).json({
      error: 'Data seeding failed',
      message: error.message
    });
  }
}