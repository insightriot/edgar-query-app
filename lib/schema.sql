-- SEC EDGAR Database Schema for Cloud Deployment

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  cik VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ticker VARCHAR(10),
  sic VARCHAR(10),
  industry VARCHAR(255),
  sector VARCHAR(255),
  exchange VARCHAR(10),
  country VARCHAR(2) DEFAULT 'US',
  state VARCHAR(2),
  employees INTEGER,
  market_cap BIGINT,
  fiscal_year_end VARCHAR(4),
  website VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Filings table
CREATE TABLE IF NOT EXISTS filings (
  id SERIAL PRIMARY KEY,
  cik VARCHAR(10) NOT NULL REFERENCES companies(cik),
  accession_number VARCHAR(25) UNIQUE NOT NULL,
  form VARCHAR(10) NOT NULL,
  filing_date DATE NOT NULL,
  report_date DATE,
  period_of_report DATE,
  fiscal_year INTEGER,
  fiscal_period VARCHAR(10),
  primary_document VARCHAR(255),
  primary_doc_description TEXT,
  size INTEGER,
  document_count INTEGER,
  interactive_data_file VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial data table for key metrics
CREATE TABLE IF NOT EXISTS financial_data (
  id SERIAL PRIMARY KEY,
  cik VARCHAR(10) NOT NULL REFERENCES companies(cik),
  accession_number VARCHAR(25) REFERENCES filings(accession_number),
  fiscal_year INTEGER NOT NULL,
  fiscal_period VARCHAR(10) NOT NULL,
  form VARCHAR(10) NOT NULL,
  concept VARCHAR(100) NOT NULL,
  taxonomy VARCHAR(50) DEFAULT 'us-gaap',
  value NUMERIC(20, 2),
  unit VARCHAR(20),
  decimals INTEGER,
  frame VARCHAR(20),
  filed_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cik, fiscal_year, fiscal_period, concept, taxonomy)
);

-- Query history table
CREATE TABLE IF NOT EXISTS query_history (
  id SERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_type VARCHAR(50),
  intent VARCHAR(50),
  entities JSONB,
  response_type VARCHAR(50),
  execution_time INTEGER,
  status VARCHAR(20) DEFAULT 'completed',
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved queries table (for future user system)
CREATE TABLE IF NOT EXISTS saved_queries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  query_text TEXT NOT NULL,
  tags JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company search optimization
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker) WHERE ticker IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry) WHERE industry IS NOT NULL;

-- Filing search optimization
CREATE INDEX IF NOT EXISTS idx_filings_cik ON filings(cik);
CREATE INDEX IF NOT EXISTS idx_filings_form ON filings(form);
CREATE INDEX IF NOT EXISTS idx_filings_filing_date ON filings(filing_date);
CREATE INDEX IF NOT EXISTS idx_filings_fiscal_year ON filings(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_filings_accession ON filings(accession_number);

-- Financial data optimization
CREATE INDEX IF NOT EXISTS idx_financial_data_cik ON financial_data(cik);
CREATE INDEX IF NOT EXISTS idx_financial_data_concept ON financial_data(concept);
CREATE INDEX IF NOT EXISTS idx_financial_data_fiscal ON financial_data(fiscal_year, fiscal_period);
CREATE INDEX IF NOT EXISTS idx_financial_data_form ON financial_data(form);

-- Query history optimization
CREATE INDEX IF NOT EXISTS idx_query_history_created ON query_history(created_at);
CREATE INDEX IF NOT EXISTS idx_query_history_type ON query_history(query_type);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_filings_updated_at BEFORE UPDATE ON filings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_data_updated_at BEFORE UPDATE ON financial_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_queries_updated_at BEFORE UPDATE ON saved_queries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();