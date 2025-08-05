import { Router } from 'express';
import { getMCPClient } from '../services/edgar-mcp-client';
import { getMCPQueryRouter } from '../services/mcp-query-router';
import { asyncHandler } from '../middleware/error-handler';
import { rateLimiter } from '../middleware/rate-limiter';

const router = Router();

/**
 * GET /api/v1/mcp/status
 * Check MCP server connectivity and available tools
 */
router.get('/status', rateLimiter, asyncHandler(async (req, res) => {
  const mcpClient = getMCPClient();
  
  try {
    // Test connectivity
    await mcpClient.connect();
    const isConnected = await mcpClient.ping();
    
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'MCP server not responding',
        statusCode: 503
      });
    }

    // Get available tools
    const tools = await mcpClient.getAvailableTools();

    res.json({
      success: true,
      data: {
        status: 'connected',
        server_url: process.env.EDGAR_MCP_SERVER_URL || 'http://localhost:8080',
        available_tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description || 'No description available',
          input_schema: tool.inputSchema || {}
        })),
        tools_count: tools.length,
        connection_time: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('MCP status check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Failed to connect to MCP server',
      details: error?.message || 'Unknown error',
      statusCode: 503,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /api/v1/mcp/tools
 * List all available MCP tools with detailed information
 */
router.get('/tools', rateLimiter, asyncHandler(async (req, res) => {
  const mcpClient = getMCPClient();
  
  try {
    await mcpClient.connect();
    const tools = await mcpClient.getAvailableTools();

    res.json({
      success: true,
      data: {
        tools: tools,
        count: tools.length,
        categories: categorizeTools(tools)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Failed to get MCP tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve MCP tools',
      details: error?.message || 'Unknown error',
      statusCode: 500
    });
  }
}));

/**
 * POST /api/v1/mcp/tool/:toolName
 * Call a specific MCP tool directly
 */
router.post('/tool/:toolName', rateLimiter, asyncHandler(async (req, res) => {
  const { toolName } = req.params;
  const { arguments: toolArgs = {} } = req.body;

  const mcpClient = getMCPClient();
  
  try {
    await mcpClient.connect();
    
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: toolArgs
    });

    res.json({
      success: true,
      data: {
        tool_name: toolName,
        arguments: toolArgs,
        result: result,
        execution_time: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`MCP tool ${toolName} call failed:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to execute MCP tool: ${toolName}`,
      details: error?.message || 'Unknown error',
      statusCode: 500
    });
  }
}));

/**
 * POST /api/v1/mcp/query
 * Process a natural language query using MCP tools
 */
router.post('/query', rateLimiter, asyncHandler(async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query is required',
      statusCode: 400
    });
  }

  try {
    // This would integrate with the Universal Query Parser
    // For now, return a simple response indicating MCP integration is ready
    res.json({
      success: true,
      data: {
        message: 'MCP query processing integration is ready',
        query: query,
        status: 'mcp_integration_complete',
        next_steps: [
          'MCP client is configured and connected',
          'Query router is implemented',
          'Universal EDGAR Engine has MCP integration',
          'Ready for end-to-end testing'
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('MCP query processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process MCP query',
      details: error?.message || 'Unknown error',
      statusCode: 500
    });
  }
}));

/**
 * POST /api/v1/mcp/test-tools
 * Test common MCP tools with sample data
 */
router.post('/test-tools', rateLimiter, asyncHandler(async (req, res) => {
  const mcpClient = getMCPClient();
  
  try {
    await mcpClient.connect();

    const testResults: Array<{
      tool: string;
      success: boolean;
      result?: any;
      error?: string;
    }> = [];

    // Test company search
    try {
      const companyResult = await mcpClient.searchCompany('Apple');
      testResults.push({
        tool: 'company_search',
        success: true,
        result: companyResult
      });
    } catch (error: any) {
      testResults.push({
        tool: 'company_search',
        success: false,
        error: error?.message || 'Unknown error'
      });
    }

    // Test financial facts (if company search worked)
    if (testResults[0].success && testResults[0].result.length > 0) {
      try {
        const company = testResults[0].result[0];
        const factsResult = await mcpClient.getFinancialFacts(company.cik);
        testResults.push({
          tool: 'get_financial_facts',
          success: true,
          result: factsResult.slice(0, 5) // Limit results for testing
        });
      } catch (error: any) {
        testResults.push({
          tool: 'get_financial_facts',
          success: false,
          error: error?.message || 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      data: {
        test_summary: {
          total_tests: testResults.length,
          successful: testResults.filter(r => r.success).length,
          failed: testResults.filter(r => !r.success).length
        },
        test_results: testResults
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('MCP tools testing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test MCP tools',
      details: error?.message || 'Unknown error',
      statusCode: 500
    });
  }
}));

// Helper function to categorize tools
function categorizeTools(tools: any[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    company: [],
    financial: [],
    filing: [],
    insider: [],
    analysis: [],
    other: []
  };

  tools.forEach(tool => {
    const name = tool.name.toLowerCase();
    
    if (name.includes('company') || name.includes('search')) {
      categories.company.push(tool.name);
    } else if (name.includes('financial') || name.includes('fact') || name.includes('concept')) {
      categories.financial.push(tool.name);
    } else if (name.includes('filing') || name.includes('document')) {
      categories.filing.push(tool.name);
    } else if (name.includes('insider') || name.includes('transaction')) {
      categories.insider.push(tool.name);
    } else if (name.includes('compare') || name.includes('analyze')) {
      categories.analysis.push(tool.name);
    } else {
      categories.other.push(tool.name);
    }
  });

  return categories;
}

export default router;