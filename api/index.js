// Vercel serverless function for API root
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    service: 'Edgar Query App API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      queries: '/api/queries (POST)',
      mcp_status: '/api/mcp/status'
    },
    mcp_integration: {
      enabled: process.env.ENABLE_MCP_INTEGRATION === 'true',
      server: process.env.MCP_SEC_EDGAR_URL || 'Not configured'
    }
  });
}