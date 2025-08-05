#!/usr/bin/env node

// Mock SEC EDGAR MCP Server for Testing
// This creates a simple HTTP server that mimics the SEC EDGAR MCP server responses

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Mock company data
const mockCompanies = {
  'AAPL': {
    cik: '0000320193',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    sic: '3571',
    industry: 'Electronic Computers',
    exchange: 'NASDAQ'
  },
  'MSFT': {
    cik: '0000789019',
    name: 'Microsoft Corporation',
    ticker: 'MSFT',
    sic: '7372',
    industry: 'Prepackaged Software',
    exchange: 'NASDAQ'
  },
  'TSLA': {
    cik: '0001318605',
    name: 'Tesla, Inc.',
    ticker: 'TSLA',
    sic: '3711',
    industry: 'Motor Vehicles & Passenger Car Bodies',
    exchange: 'NASDAQ'
  }
};

// Mock financial data
const mockFinancialData = [
  {
    concept: 'Revenues',
    value: 394328000000,
    unit: 'USD',
    period: '2024-09-30',
    form: '10-K',
    filed: '2024-11-01',
    accessionNumber: '0000320193-24-000123',
    fiscalYear: 2024,
    fiscalPeriod: 'FY'
  },
  {
    concept: 'NetIncomeLoss',
    value: 93736000000,
    unit: 'USD',
    period: '2024-09-30',
    form: '10-K',
    filed: '2024-11-01',
    accessionNumber: '0000320193-24-000123',
    fiscalYear: 2024,
    fiscalPeriod: 'FY'
  }
];

// Mock available tools
const mockTools = [
  {
    name: 'company_search',
    description: 'Search for companies by name or ticker symbol',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Company name or ticker to search for' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_company_submissions',
    description: 'Get company submission data',
    inputSchema: {
      type: 'object',
      properties: {
        cik: { type: 'string', description: 'Company CIK number' }
      },
      required: ['cik']
    }
  },
  {
    name: 'get_company_facts',
    description: 'Get company financial facts',
    inputSchema: {
      type: 'object',
      properties: {
        cik: { type: 'string', description: 'Company CIK number' }
      },
      required: ['cik']
    }
  },
  {
    name: 'search_filings',
    description: 'Search SEC filings',
    inputSchema: {
      type: 'object',
      properties: {
        cik: { type: 'string', description: 'Company CIK number' },
        formType: { type: 'string', description: 'Form type (e.g., 10-K, 10-Q)' },
        dateFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        dateTo: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        limit: { type: 'number', description: 'Number of results to return' }
      }
    }
  }
];

// SSE endpoint for MCP
app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });

  // Send initial handshake
  res.write('event: handshake\n');
  res.write('data: {"type":"handshake","protocol_version":"2025-03-26"}\n\n');

  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write('event: ping\n');
    res.write('data: {"type":"ping"}\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// HTTP Stream endpoint for MCP
app.post('/mcp', (req, res) => {
  const { jsonrpc, id, method, params } = req.body;
  
  console.log(`📋 MCP Request: ${method}`, params);

  let result = {};

  switch (method) {
    case 'initialize':
      result = {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {},
          resources: {}
        },
        serverInfo: {
          name: 'Mock SEC EDGAR MCP',
          version: '1.0.0'
        }
      };
      break;

    case 'tools/list':
      result = { tools: mockTools };
      break;

    case 'tools/call':
      const { name, arguments: args } = params;
      result = handleToolCall(name, args);
      break;

    case 'ping':
      result = {}; // Empty result for ping
      break;

    case 'notifications/initialized':
      // This is a notification, no response needed
      console.log('✅ Client initialized');
      return res.status(204).send(); // No content response

    default:
      const errorResponse = {
        jsonrpc: '2.0',
        id: id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
      console.log(`❌ MCP Error Response:`, errorResponse);
      return res.json(errorResponse);
  }

  const response = {
    jsonrpc: '2.0',
    id: id,
    result: result
  };

  console.log(`✅ MCP Response:`, response);
  res.json(response);
});

// Handle tool calls
function handleToolCall(toolName, args) {
  console.log(`🔧 Tool Call: ${toolName}`, args);

  switch (toolName) {
    case 'company_search':
      const query = args.query.toLowerCase();
      const matches = Object.entries(mockCompanies)
        .filter(([ticker, company]) => 
          company.name.toLowerCase().includes(query) || 
          ticker.toLowerCase().includes(query)
        )
        .map(([_, company]) => company);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(matches, null, 2)
        }]
      };

    case 'get_company_submissions':
      const cik = args.cik;
      const company = Object.values(mockCompanies).find(c => c.cik === cik);
      
      if (!company) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'Company not found' })
          }]
        };
      }

      const submissions = {
        cik,
        name: company.name,
        recentFilings: [
          {
            accessionNumber: '0000320193-24-000123',
            filingDate: '2024-11-01',
            form: '10-K',
            size: '15234567'
          }
        ]
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(submissions, null, 2)
        }]
      };

    case 'get_company_facts':
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            cik: args.cik,
            facts: mockFinancialData
          }, null, 2)
        }]
      };

    case 'search_filings':
      const filings = [
        {
          accessionNumber: '0000320193-24-000123',
          cik: args.cik || '0000320193',
          filingDate: '2024-11-01',
          form: args.formType || '10-K',
          size: '15234567',
          companyName: 'Apple Inc.'
        }
      ];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(filings, null, 2)
        }]
      };

    default:
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Unknown tool: ${toolName}` })
        }]
      };
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    server: 'Mock SEC EDGAR MCP', 
    timestamp: new Date().toISOString() 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock SEC EDGAR MCP Server running on http://localhost:${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`🔄 HTTP Stream endpoint: http://localhost:${PORT}/mcp`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`\n🛠️  Available tools: ${mockTools.map(t => t.name).join(', ')}`);
  console.log(`📊 Mock companies: ${Object.keys(mockCompanies).join(', ')}`);
});

module.exports = app;