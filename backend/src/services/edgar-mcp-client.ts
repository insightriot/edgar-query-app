// SEC EDGAR MCP Client Integration
import { MCPClient } from 'mcp-client';
import { createError } from '../middleware/error-handler';

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    uri?: string;
    mimeType?: string;
    data?: string;
    [key: string]: any;
  }>;
  isError?: boolean;
  _meta?: Record<string, any>;
}

export interface MCPCompanySearchResult {
  cik: string;
  name: string;
  ticker?: string;
  sic?: string;
  industry?: string;
  exchange?: string;
}

export interface MCPFinancialData {
  concept: string;
  value: number;
  unit: string;
  period: string;
  form: string;
  filed: string;
  accessionNumber: string;
  fiscalYear: number;
  fiscalPeriod: string;
}

export class EdgarMCPClient {
  private client: MCPClient;
  private isConnected: boolean = false;
  private mcpServerUrl: string;

  constructor(mcpServerUrl?: string) {
    // Default to local MCP server or environment variable
    this.mcpServerUrl = mcpServerUrl || process.env.EDGAR_MCP_SERVER_URL || 'http://localhost:8080';
    
    this.client = new MCPClient({
      name: 'Edgar Query App',
      version: '1.0.0',
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Try streamable HTTP first (preferred)
      await this.client.connect({
        type: 'httpStream',
        url: `${this.mcpServerUrl}/mcp`,
      });
      
      this.isConnected = true;
      console.log('✅ Connected to SEC EDGAR MCP server via HTTP Stream');
    } catch (streamError) {
      console.warn('HTTP Stream connection failed, trying SSE...', streamError);
      
      try {
        // Fallback to SSE
        await this.client.connect({
          type: 'sse',
          url: `${this.mcpServerUrl}/sse`,
        });
        
        this.isConnected = true;
        console.log('✅ Connected to SEC EDGAR MCP server via SSE');
      } catch (sseError: any) {
        console.error('Failed to connect to MCP server:', sseError);
        throw createError(`Failed to connect to MCP server at ${this.mcpServerUrl}: ${sseError?.message || 'Connection failed'}`, 503);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      // The mcp-client doesn't expose a disconnect method directly
      // but we can mark as disconnected
      this.isConnected = false;
      console.log('Disconnected from SEC EDGAR MCP server');
    }
  }

  async ping(): Promise<boolean> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('MCP ping failed:', error);
      return false;
    }
  }

  async getAvailableTools(): Promise<any[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      return await this.client.getAllTools();
    } catch (error: any) {
      console.error('Failed to get MCP tools:', error);
      throw createError(`Failed to get available MCP tools: ${error?.message || 'Unknown error'}`, 500);
    }
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      console.log(`🔧 Calling MCP tool: ${toolCall.name}`, toolCall.arguments);
      
      const result = await this.client.callTool({
        name: toolCall.name,
        arguments: toolCall.arguments,
      });

      console.log(`✅ MCP tool ${toolCall.name} completed`);
      return result as MCPToolResult;
    } catch (error: any) {
      console.error(`❌ MCP tool ${toolCall.name} failed:`, error);
      throw createError(`MCP tool call failed: ${error?.message || 'Unknown error'}`, 500);
    }
  }

  // Convenience methods for common SEC EDGAR operations

  async searchCompany(query: string): Promise<MCPCompanySearchResult[]> {
    const result = await this.callTool({
      name: 'company_search',
      arguments: { query }
    });

    // Parse the result based on MCP response format
    if (result.content && result.content.length > 0) {
      const textContent = result.content.find(c => c.type === 'text')?.text;
      if (textContent) {
        try {
          // Attempt to parse JSON response
          const parsed = JSON.parse(textContent);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // If not JSON, return raw text in a structured format
          return [{
            cik: '',
            name: textContent,
            ticker: query.toUpperCase()
          }];
        }
      }
    }

    return [];
  }

  async getCompanySubmissions(cik: string): Promise<any> {
    const result = await this.callTool({
      name: 'get_company_submissions',
      arguments: { cik }
    });

    if (result.content && result.content.length > 0) {
      const textContent = result.content.find(c => c.type === 'text')?.text;
      if (textContent) {
        try {
          return JSON.parse(textContent);
        } catch {
          return { raw: textContent };
        }
      }
    }

    return null;
  }

  async getFinancialFacts(cik: string): Promise<MCPFinancialData[]> {
    const result = await this.callTool({
      name: 'get_company_facts',
      arguments: { cik }
    });

    if (result.content && result.content.length > 0) {
      const textContent = result.content.find(c => c.type === 'text')?.text;
      if (textContent) {
        try {
          const parsed = JSON.parse(textContent);
          // Extract financial data from the facts structure
          return this.extractFinancialDataFromFacts(parsed);
        } catch {
          return [];
        }
      }
    }

    return [];
  }

  async getFinancialMetric(cik: string, concept: string): Promise<MCPFinancialData[]> {
    const result = await this.callTool({
      name: 'get_company_concept',
      arguments: { cik, taxonomy: 'us-gaap', concept }
    });

    if (result.content && result.content.length > 0) {
      const textContent = result.content.find(c => c.type === 'text')?.text;
      if (textContent) {
        try {
          const parsed = JSON.parse(textContent);
          return this.extractFinancialDataFromConcept(parsed, concept);
        } catch {
          return [];
        }
      }
    }

    return [];
  }

  async searchFilings(params: {
    cik?: string;
    formType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<any[]> {
    const result = await this.callTool({
      name: 'search_filings',
      arguments: params
    });

    if (result.content && result.content.length > 0) {
      const textContent = result.content.find(c => c.type === 'text')?.text;
      if (textContent) {
        try {
          const parsed = JSON.parse(textContent);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      }
    }

    return [];
  }

  async extractDocumentContent(accessionNumber: string): Promise<any> {
    const result = await this.callTool({
      name: 'extract_document_sections',
      arguments: { accessionNumber }
    });

    if (result.content && result.content.length > 0) {
      const textContent = result.content.find(c => c.type === 'text')?.text;
      if (textContent) {
        try {
          return JSON.parse(textContent);
        } catch {
          return { raw: textContent };
        }
      }
    }

    return null;
  }

  async analyzeInsiderTrading(cik: string): Promise<any> {
    const result = await this.callTool({
      name: 'get_insider_transactions',
      arguments: { cik }
    });

    if (result.content && result.content.length > 0) {
      const textContent = result.content.find(c => c.type === 'text')?.text;
      if (textContent) {
        try {
          return JSON.parse(textContent);
        } catch {
          return { raw: textContent };
        }
      }
    }

    return null;
  }

  async compareFinancialMetrics(companies: string[], concept: string): Promise<any> {
    const result = await this.callTool({
      name: 'compare_financial_metrics',
      arguments: { companies, concept }
    });

    if (result.content && result.content.length > 0) {
      const textContent = result.content.find(c => c.type === 'text')?.text;
      if (textContent) {
        try {
          return JSON.parse(textContent);
        } catch {
          return { raw: textContent };
        }
      }
    }

    return null;
  }

  // Helper methods

  private extractFinancialDataFromFacts(facts: any): MCPFinancialData[] {
    const financialData: MCPFinancialData[] = [];
    
    if (facts && facts.facts && facts.facts['us-gaap']) {
      const usGaap = facts.facts['us-gaap'];
      
      for (const [concept, conceptData] of Object.entries(usGaap)) {
        if (conceptData && typeof conceptData === 'object' && 'units' in conceptData && conceptData.units) {
          for (const [unit, values] of Object.entries(conceptData.units)) {
            if (Array.isArray(values)) {
              for (const value of values) {
                financialData.push({
                  concept,
                  value: value.val,
                  unit,
                  period: value.end,
                  form: value.form,
                  filed: value.filed,
                  accessionNumber: value.accn,
                  fiscalYear: value.fy,
                  fiscalPeriod: value.fp
                });
              }
            }
          }
        }
      }
    }

    return financialData.sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());
  }

  private extractFinancialDataFromConcept(conceptData: any, concept: string): MCPFinancialData[] {
    const financialData: MCPFinancialData[] = [];
    
    if (conceptData && conceptData.units) {
      for (const [unit, values] of Object.entries(conceptData.units)) {
        if (Array.isArray(values)) {
          for (const value of values) {
            financialData.push({
              concept,
              value: value.val,
              unit,
              period: value.end,
              form: value.form,
              filed: value.filed,
              accessionNumber: value.accn,
              fiscalYear: value.fy,
              fiscalPeriod: value.fp
            });
          }
        }
      }
    }

    return financialData.sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());
  }
}

// Singleton instance
let mcpClientInstance: EdgarMCPClient | null = null;

export function getMCPClient(): EdgarMCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new EdgarMCPClient();
  }
  return mcpClientInstance;
}