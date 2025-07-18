const express = require('express');
const path = require('path');

const app = express();

// Serve static files from frontend dist
app.use(express.static('frontend/dist'));

// Parse JSON requests
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'development',
    database: 'not configured',
    redis: 'not configured'
  });
});

// Queries endpoint
app.post('/api/queries', (req, res) => {
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
          source: 'test-proxy'
        }
      }
    }
  };

  res.json(response);
});

// Fallback to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

function classifyIntent(query) {
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

function extractEntities(query) {
  const entities = [];
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

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Test proxy server running on port ${PORT}`);
});