// MCP Query Router - Routes queries to appropriate MCP tools
import { EdgarMCPClient, MCPToolCall } from './edgar-mcp-client';
import { createError } from '../middleware/error-handler';

// Define simplified types to avoid complex imports
interface UniversalQuery {
  originalQuery: string;
  intent: {
    primary: string;
    secondary: string[];
  };
  entities: {
    companies: Array<{ name: string; cik?: string; ticker?: string }>;
    concepts: Array<{ concept: string }>;
    metrics: Array<{ metric: string }>;
    filingTypes: Array<{ formType: string }>;
    timeRanges: Array<{ description: string }>;
  };
  scope: {
    dataTypes: string[];
    granularity: string;
  };
  confidence: number;
}

export interface MCPQueryResult {
  success: boolean;
  data: any;
  toolsUsed: string[];
  processingTimeMs: number;
  metadata: {
    confidence: number;
    sources: string[];
    mcpTools: MCPToolCall[];
  };
}

export class MCPQueryRouter {
  private mcpClient: EdgarMCPClient;

  constructor() {
    this.mcpClient = new EdgarMCPClient();
  }

  async routeQuery(query: UniversalQuery): Promise<MCPQueryResult> {
    const startTime = performance.now();
    console.log('=== MCP QUERY ROUTING ===');
    console.log('Intent:', query.intent.primary);
    console.log('Companies:', query.entities.companies.length);
    console.log('Concepts:', query.entities.concepts.length);

    try {
      // Ensure MCP client is connected
      await this.mcpClient.connect();

      // Route based on query intent and entities
      const toolCalls = this.planToolCalls(query);
      const results = await this.executeToolCalls(toolCalls);
      const synthesizedResult = this.synthesizeResults(results, query);

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        data: synthesizedResult,
        toolsUsed: toolCalls.map(call => call.name),
        processingTimeMs: processingTime,
        metadata: {
          confidence: this.calculateConfidence(results),
          sources: this.extractSources(results),
          mcpTools: toolCalls
        }
      };

    } catch (error: any) {
      console.error('MCP Query routing failed:', error);
      throw createError(`MCP query processing failed: ${error?.message || 'Unknown error'}`, 500);
    }
  }

  private planToolCalls(query: UniversalQuery): MCPToolCall[] {
    const toolCalls: MCPToolCall[] = [];
    const intent = query.intent.primary;
    const companies = query.entities.companies;
    const concepts = query.entities.concepts;
    const metrics = query.entities.metrics;
    const filingTypes = query.entities.filingTypes;

    console.log('Planning tool calls for intent:', intent);

    switch (intent) {
      case 'company_information':
      case 'business_overview':
      case 'company_lookup':
        // Get company profile and basic information
        companies.forEach(company => {
          toolCalls.push({
            name: 'company_search',
            arguments: { query: company.name || company.ticker }
          });
          
          if (company.cik || this.shouldGetSubmissions(query)) {
            toolCalls.push({
              name: 'get_company_submissions',
              arguments: { cik: company.cik || company.name }
            });
          }
        });
        break;

      case 'financial_metrics':
      case 'revenue_analysis':
      case 'profitability_analysis':
      case 'revenue_query':
      case 'profit_query':
        // Get financial data
        companies.forEach(company => {
          // First get company info if we don't have CIK
          if (!company.cik) {
            toolCalls.push({
              name: 'company_search',
              arguments: { query: company.name || company.ticker }
            });
          }

          // Get financial facts
          toolCalls.push({
            name: 'get_company_facts',
            arguments: { cik: company.cik || company.name }
          });

          // Get specific concepts if mentioned
          concepts.forEach(concept => {
            if (this.isFinancialConcept(concept.concept)) {
              toolCalls.push({
                name: 'get_company_concept',
                arguments: {
                  cik: company.cik || company.name,
                  taxonomy: 'us-gaap',
                  concept: this.mapConceptToUSGAAP(concept.concept)
                }
              });
            }
          });

          // Get specific metrics if mentioned
          metrics.forEach(metric => {
            toolCalls.push({
              name: 'get_company_concept',
              arguments: {
                cik: company.cik || company.name,
                taxonomy: 'us-gaap',
                concept: this.mapMetricToUSGAAP(metric.metric)
              }
            });
          });
        });
        break;

      case 'filing_search':
      case 'document_analysis':
      case 'sec_filings':
        // Search for filings
        const filingParams: any = {};
        
        if (companies.length > 0) {
          filingParams.cik = companies[0].cik || companies[0].name;
        }

        if (filingTypes.length > 0) {
          filingParams.formType = filingTypes[0].formType;
        }

        if (query.entities.timeRanges.length > 0) {
          const timeRange = query.entities.timeRanges[0];
          // Convert time range to dates
          const dateRange = this.parseTimeRange(timeRange);
          if (dateRange.from) filingParams.dateFrom = dateRange.from;
          if (dateRange.to) filingParams.dateTo = dateRange.to;
        }

        toolCalls.push({
          name: 'search_filings',
          arguments: filingParams
        });
        break;

      case 'comparative_analysis':
      case 'company_comparison':
        // Compare multiple companies
        if (companies.length > 1) {
          const companyIdentifiers = companies.map(c => c.cik || c.name);
          
          if (metrics.length > 0) {
            toolCalls.push({
              name: 'compare_financial_metrics',
              arguments: {
                companies: companyIdentifiers,
                concept: this.mapMetricToUSGAAP(metrics[0].metric)
              }
            });
          } else {
            // Default to revenue comparison
            toolCalls.push({
              name: 'compare_financial_metrics',
              arguments: {
                companies: companyIdentifiers,
                concept: 'Revenues'
              }
            });
          }
        }
        break;

      case 'insider_trading':
      case 'insider_analysis':
        // Analyze insider trading
        companies.forEach(company => {
          toolCalls.push({
            name: 'get_insider_transactions',
            arguments: { cik: company.cik || company.name }
          });
        });
        break;

      case 'document_content_search':
      case 'content_search':
        // Extract document content
        if (query.entities.filingTypes.length > 0 && companies.length > 0) {
          // First search for filings, then extract content
          toolCalls.push({
            name: 'search_filings',
            arguments: {
              cik: companies[0].cik || companies[0].name,
              formType: filingTypes[0].formType,
              limit: 1
            }
          });
        }
        break;

      default:
        // Fallback: try company search if companies are mentioned
        if (companies.length > 0) {
          companies.forEach(company => {
            toolCalls.push({
              name: 'company_search',
              arguments: { query: company.name || company.ticker }
            });
          });
        }
    }

    console.log(`Planned ${toolCalls.length} tool calls:`, toolCalls.map(call => call.name));
    return toolCalls;
  }

  private async executeToolCalls(toolCalls: MCPToolCall[]): Promise<Array<{ call: MCPToolCall; result: any }>> {
    const results: Array<{ call: MCPToolCall; result: any }> = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.mcpClient.callTool(toolCall);
        results.push({ call: toolCall, result });
      } catch (error: any) {
        console.error(`Tool call ${toolCall.name} failed:`, error);
        // Continue with other calls, store error
        results.push({ 
          call: toolCall, 
          result: { 
            error: error?.message || 'Unknown error',
            content: [{ type: 'text', text: `Error: ${error?.message || 'Unknown error'}` }]
          } 
        });
      }
    }

    return results;
  }

  private synthesizeResults(results: Array<{ call: MCPToolCall; result: any }>, query: UniversalQuery): any {
    console.log('Synthesizing results from', results.length, 'tool calls');

    // Group results by tool type
    const groupedResults = this.groupResultsByTool(results);

    // Build comprehensive response
    const synthesized = {
      type: 'mcp_response',
      intent: query.intent.primary,
      companies: this.extractCompanyData(groupedResults),
      financialData: this.extractFinancialData(groupedResults),
      filings: this.extractFilingData(groupedResults),
      insiderTrading: this.extractInsiderTradingData(groupedResults),
      comparisons: this.extractComparisonData(groupedResults),
      rawResults: results,
      narrative: this.generateNarrative(groupedResults, query)
    };

    return synthesized;
  }

  private groupResultsByTool(results: Array<{ call: MCPToolCall; result: any }>): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const { call, result } of results) {
      if (!grouped[call.name]) {
        grouped[call.name] = [];
      }
      grouped[call.name].push({ arguments: call.arguments, result });
    }

    return grouped;
  }

  private extractCompanyData(groupedResults: Record<string, any[]>): any[] {
    const companies: any[] = [];

    // Extract from company_search results
    if (groupedResults.company_search) {
      for (const { result } of groupedResults.company_search) {
        if (result.content) {
          const textContent = result.content.find((c: any) => c.type === 'text')?.text;
          if (textContent) {
            try {
              const parsed = JSON.parse(textContent);
              companies.push(...(Array.isArray(parsed) ? parsed : [parsed]));
            } catch {
              companies.push({ name: textContent });
            }
          }
        }
      }
    }

    // Extract from get_company_submissions results
    if (groupedResults.get_company_submissions) {
      for (const { result } of groupedResults.get_company_submissions) {
        if (result.content) {
          const textContent = result.content.find((c: any) => c.type === 'text')?.text;
          if (textContent) {
            try {
              const parsed = JSON.parse(textContent);
              companies.push(parsed);
            } catch {
              // Skip if not parseable
            }
          }
        }
      }
    }

    return companies;
  }

  private extractFinancialData(groupedResults: Record<string, any[]>): any[] {
    const financialData: any[] = [];

    // Extract from get_company_facts and get_company_concept
    const financialTools = ['get_company_facts', 'get_company_concept'];
    
    for (const toolName of financialTools) {
      if (groupedResults[toolName]) {
        for (const { result } of groupedResults[toolName]) {
          if (result.content) {
            const textContent = result.content.find((c: any) => c.type === 'text')?.text;
            if (textContent) {
              try {
                const parsed = JSON.parse(textContent);
                financialData.push(parsed);
              } catch {
                // Skip if not parseable
              }
            }
          }
        }
      }
    }

    return financialData;
  }

  private extractFilingData(groupedResults: Record<string, any[]>): any[] {
    const filings: any[] = [];

    if (groupedResults.search_filings) {
      for (const { result } of groupedResults.search_filings) {
        if (result.content) {
          const textContent = result.content.find((c: any) => c.type === 'text')?.text;
          if (textContent) {
            try {
              const parsed = JSON.parse(textContent);
              filings.push(...(Array.isArray(parsed) ? parsed : [parsed]));
            } catch {
              // Skip if not parseable
            }
          }
        }
      }
    }

    return filings;
  }

  private extractInsiderTradingData(groupedResults: Record<string, any[]>): any[] {
    const insiderData: any[] = [];

    if (groupedResults.get_insider_transactions) {
      for (const { result } of groupedResults.get_insider_transactions) {
        if (result.content) {
          const textContent = result.content.find((c: any) => c.type === 'text')?.text;
          if (textContent) {
            try {
              const parsed = JSON.parse(textContent);
              insiderData.push(parsed);
            } catch {
              // Skip if not parseable
            }
          }
        }
      }
    }

    return insiderData;
  }

  private extractComparisonData(groupedResults: Record<string, any[]>): any[] {
    const comparisons: any[] = [];

    if (groupedResults.compare_financial_metrics) {
      for (const { result } of groupedResults.compare_financial_metrics) {
        if (result.content) {
          const textContent = result.content.find((c: any) => c.type === 'text')?.text;
          if (textContent) {
            try {
              const parsed = JSON.parse(textContent);
              comparisons.push(parsed);
            } catch {
              // Skip if not parseable
            }
          }
        }
      }
    }

    return comparisons;
  }

  private generateNarrative(groupedResults: Record<string, any[]>, query: UniversalQuery): string {
    const toolsUsed = Object.keys(groupedResults);
    const companies = query.entities.companies.map(c => c.name).join(', ');
    
    let narrative = `Processed query about ${companies || 'SEC data'} using MCP tools: ${toolsUsed.join(', ')}. `;

    // Add specific insights based on tools used
    if (groupedResults.company_search) {
      narrative += 'Found company information. ';
    }

    if (groupedResults.get_company_facts || groupedResults.get_company_concept) {
      narrative += 'Retrieved financial data from SEC filings. ';
    }

    if (groupedResults.search_filings) {
      narrative += 'Located relevant SEC filings. ';
    }

    if (groupedResults.compare_financial_metrics) {
      narrative += 'Performed comparative financial analysis. ';
    }

    if (groupedResults.get_insider_transactions) {
      narrative += 'Analyzed insider trading activity. ';
    }

    narrative += 'All data sourced from official SEC EDGAR database via MCP tools.';

    return narrative;
  }

  private calculateConfidence(results: Array<{ call: MCPToolCall; result: any }>): number {
    const successfulCalls = results.filter(r => !r.result.error).length;
    const totalCalls = results.length;
    
    if (totalCalls === 0) return 0;
    
    const successRate = successfulCalls / totalCalls;
    
    // Adjust confidence based on data quality
    let confidence = successRate * 0.8; // Base confidence from success rate
    
    // Boost confidence if we have multiple data sources
    if (successfulCalls > 2) {
      confidence += 0.1;
    }
    
    // Cap at 0.95 to account for inherent uncertainty
    return Math.min(confidence, 0.95);
  }

  private extractSources(results: Array<{ call: MCPToolCall; result: any }>): string[] {
    const sources = new Set<string>();
    
    for (const { call } of results) {
      sources.add(`SEC EDGAR (${call.name})`);
    }
    
    return Array.from(sources);
  }

  // Helper methods

  private shouldGetSubmissions(query: UniversalQuery): boolean {
    // Get submissions if we need filing information or detailed company data
    return query.intent.secondary.includes('filing_search') || 
           query.scope.dataTypes.includes('filings') ||
           query.scope.granularity === 'comprehensive';
  }

  private isFinancialConcept(concept: string): boolean {
    const financialConcepts = [
      'revenue', 'income', 'profit', 'loss', 'assets', 'liabilities', 
      'equity', 'cash', 'debt', 'expenses', 'sales', 'earnings'
    ];
    
    return financialConcepts.some(fc => concept.toLowerCase().includes(fc));
  }

  private mapConceptToUSGAAP(concept: string): string {
    const conceptMap: Record<string, string> = {
      'revenue': 'Revenues',
      'revenues': 'Revenues',
      'sales': 'Revenues',
      'income': 'NetIncomeLoss',
      'net income': 'NetIncomeLoss',
      'profit': 'NetIncomeLoss',
      'earnings': 'NetIncomeLoss',
      'assets': 'Assets',
      'total assets': 'Assets',
      'liabilities': 'Liabilities',
      'equity': 'StockholdersEquity',
      'cash': 'CashAndCashEquivalentsAtCarryingValue',
      'debt': 'LongTermDebt'
    };

    const key = concept.toLowerCase();
    return conceptMap[key] || concept;
  }

  private mapMetricToUSGAAP(metric: string): string {
    return this.mapConceptToUSGAAP(metric); // Same mapping for now
  }

  private parseTimeRange(timeRange: any): { from?: string; to?: string } {
    // Simple time range parsing - can be enhanced
    const now = new Date();
    const result: { from?: string; to?: string } = {};

    if (timeRange.description) {
      const desc = timeRange.description.toLowerCase();
      
      if (desc.includes('last year') || desc.includes('past year')) {
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        result.from = lastYear.toISOString().split('T')[0];
        result.to = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
      } else if (desc.includes('last 6 months')) {
        const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
        result.from = sixMonthsAgo.toISOString().split('T')[0];
        result.to = now.toISOString().split('T')[0];
      } else if (desc.includes('2024')) {
        result.from = '2024-01-01';
        result.to = '2024-12-31';
      } else if (desc.includes('2023')) {
        result.from = '2023-01-01';
        result.to = '2023-12-31';
      }
    }

    return result;
  }
}

// Singleton instance
let mcpQueryRouterInstance: MCPQueryRouter | null = null;

export function getMCPQueryRouter(): MCPQueryRouter {
  if (!mcpQueryRouterInstance) {
    mcpQueryRouterInstance = new MCPQueryRouter();
  }
  return mcpQueryRouterInstance;
}