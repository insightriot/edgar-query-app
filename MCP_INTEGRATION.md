# SEC EDGAR MCP Integration

This document describes the integration of the SEC EDGAR MCP (Model Context Protocol) server with our application.

## Overview

The MCP integration allows our application to leverage the powerful SEC EDGAR MCP server tools instead of building all functionality from scratch. This significantly reduces infrastructure complexity while providing access to comprehensive SEC data processing capabilities.

## Architecture Changes

### Before MCP Integration
- Custom SEC API client implementation
- Heavy database infrastructure for bulk data
- Complex document parsing and indexing
- Rate limiting and caching layers

### After MCP Integration
- **MCP Client**: Connects to SEC EDGAR MCP server
- **Query Router**: Routes queries to appropriate MCP tools
- **Hybrid Approach**: MCP-first with fallback to traditional methods
- **Simplified Infrastructure**: Reduced database and processing overhead

## Implementation Components

### 1. MCP Client (`edgar-mcp-client.ts`)
```typescript
class EdgarMCPClient {
  async connect(): Promise<void>
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult>
  async searchCompany(query: string): Promise<MCPCompanySearchResult[]>
  async getFinancialFacts(cik: string): Promise<MCPFinancialData[]>
  async searchFilings(params): Promise<any[]>
  async analyzeInsiderTrading(cik: string): Promise<any>
}
```

### 2. Query Router (`mcp-query-router.ts`)
```typescript
class MCPQueryRouter {
  async routeQuery(query: UniversalQuery): Promise<MCPQueryResult>
  private planToolCalls(query: UniversalQuery): MCPToolCall[]
  private executeToolCalls(toolCalls: MCPToolCall[]): Promise<any[]>
  private synthesizeResults(results: any[], query: UniversalQuery): any
}
```

### 3. Universal Engine Integration
The Universal EDGAR Engine now uses MCP as the primary data source:
- **Step 1**: Parse natural language query
- **Step 2**: Try MCP-powered knowledge extraction first
- **Step 3**: Fallback to traditional extraction if MCP fails
- **Step 4**: Synthesize comprehensive answer

## Available MCP Tools

Based on the SEC EDGAR MCP documentation, these tools are available:

### Company Tools
- `company_search` - Search for companies by name/ticker
- `get_company_submissions` - Get company submission data
- `get_company_facts` - Get all XBRL facts for a company

### Financial Tools  
- `get_company_concept` - Get specific XBRL concept data
- `compare_financial_metrics` - Compare metrics across companies

### Filing Tools
- `search_filings` - Search filings with filters
- `extract_document_sections` - Parse document content

### Analysis Tools
- `get_insider_transactions` - Analyze insider trading
- `analyze_insider_patterns` - Advanced insider analysis

## API Endpoints

### MCP Status and Testing
```
GET /api/v1/mcp/status           # Check MCP connectivity
GET /api/v1/mcp/tools            # List available tools
POST /api/v1/mcp/tool/:toolName  # Call specific tool
POST /api/v1/mcp/test-tools      # Test common tools
```

### Enhanced Query Processing
```
POST /api/v1/queries             # Now uses MCP integration
```

## Configuration

### Environment Variables
```bash
# MCP Server Configuration
EDGAR_MCP_SERVER_URL=http://localhost:8080  # Default MCP server URL
SEC_EDGAR_USER_AGENT="Your App Name (your.email@domain.com)"  # Required by SEC
```

### MCP Server Setup

You need to run the SEC EDGAR MCP server separately. Options:

#### Option 1: Local Installation
```bash
npm install -g sec-edgar-mcp
sec-edgar-mcp --port 8080
```

#### Option 2: Docker
```bash
docker run -p 8080:8080 sec-edgar-mcp
```

#### Option 3: Using MCP Proxy
```bash
npx mcp-proxy --port 8080 -- sec-edgar-mcp stdio
```

## Query Examples

### Company Information
```
"Tell me about Apple Inc."
→ Uses: company_search, get_company_submissions
```

### Financial Data  
```
"What was Apple's revenue in 2024?"
→ Uses: company_search, get_company_facts, get_company_concept
```

### Filing Search
```
"Find Apple's latest 10-K filing"
→ Uses: search_filings, extract_document_sections
```

### Comparative Analysis
```
"Compare Apple and Microsoft revenue"
→ Uses: compare_financial_metrics
```

### Bulk Queries
```
"Give me all 10-Ks filed in the last 6 months"
→ Uses: search_filings with date filters
```

## Benefits

### 1. Reduced Infrastructure Costs
- **Before**: $200-500/month for databases, storage, processing
- **After**: ~$50/month for basic hosting + MCP server costs

### 2. Faster Development
- **Before**: Months to build comprehensive SEC data processing
- **After**: Weeks to integrate with battle-tested MCP tools

### 3. Better Accuracy
- **Before**: Custom parsing with potential errors
- **After**: Professional MCP tools with proven accuracy

### 4. Automatic Updates
- **Before**: Manual updates when SEC changes formats
- **After**: MCP server handles SEC API changes

## Error Handling

The system includes comprehensive fallback mechanisms:

1. **MCP Primary**: Try MCP tools first
2. **Traditional Fallback**: Use existing SEC client if MCP fails
3. **Graceful Degradation**: Partial results if some tools fail
4. **Error Recovery**: Detailed error messages and retry logic

## Testing

### Test MCP Connectivity
```bash
curl http://localhost:3000/api/v1/mcp/status
```

### Test Available Tools
```bash
curl http://localhost:3000/api/v1/mcp/tools
```

### Test Query Processing
```bash
curl -X POST http://localhost:3000/api/v1/queries \
  -H "Content-Type: application/json" \
  -d '{"query": "What was Apple'\''s revenue in 2024?"}'
```

## Monitoring

The integration includes detailed logging:
- MCP connection status
- Tool call success/failure rates
- Processing times
- Fallback usage statistics
- Error patterns

## Troubleshooting

### Common Issues

#### MCP Server Not Responding
```bash
# Check if MCP server is running
curl http://localhost:8080/mcp

# Check server logs
docker logs sec-edgar-mcp-container
```

#### Authentication Errors
```bash
# Ensure User-Agent is set
export SEC_EDGAR_USER_AGENT="YourApp/1.0 (your.email@domain.com)"
```

#### Rate Limiting
- MCP server handles SEC rate limits automatically
- No additional configuration needed

### Debug Mode
Enable debug logging:
```bash
export DEBUG=mcp:*
npm run dev
```

## Future Enhancements

1. **Load Balancing**: Multiple MCP server instances
2. **Caching**: Smart caching of MCP results
3. **Custom Tools**: Develop custom MCP tools for specific needs
4. **Advanced Analytics**: Leverage MCP's analytical capabilities
5. **Real-time Updates**: Stream updates from MCP server

## Migration Notes

This integration maintains backward compatibility:
- Existing API endpoints continue to work
- Traditional SEC client remains as fallback
- No breaking changes to frontend
- Enhanced responses include MCP metadata

The migration provides immediate benefits while maintaining system reliability through the fallback mechanism.