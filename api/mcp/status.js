// Vercel serverless function for MCP status
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mcpServerUrl = process.env.MCP_SEC_EDGAR_URL || 'https://sec-edgar-mcp.amorelli.tech';
    const mcpEnabled = process.env.ENABLE_MCP_INTEGRATION === 'true';

    if (!mcpEnabled) {
      return res.status(200).json({
        success: false,
        message: 'MCP integration is disabled',
        data: {
          status: 'disabled',
          mcp_enabled: false
        },
        timestamp: new Date().toISOString()
      });
    }

    // For production deployment, return a status indicating MCP is configured
    const response = {
      success: true,
      data: {
        status: 'configured',
        server_url: mcpServerUrl,
        mcp_enabled: true,
        environment: process.env.NODE_ENV || 'development',
        available_tools: [
          {
            name: 'company_search',
            description: 'Search for companies by name or ticker symbol'
          },
          {
            name: 'get_company_submissions',
            description: 'Get company submission data'
          },
          {
            name: 'get_company_facts',
            description: 'Get company financial facts'
          },
          {
            name: 'search_filings',
            description: 'Search SEC filings'
          }
        ],
        tools_count: 4,
        connection_time: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('MCP status error:', error);
    res.status(503).json({
      success: false,
      error: 'MCP server not responding',
      details: error.message,
      statusCode: 503
    });
  }
}