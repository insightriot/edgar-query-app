// Knowledge Synthesis Engine - Combines knowledge to generate comprehensive answers

import OpenAI from 'openai';
import { 
  UniversalQuery,
  KnowledgeSet,
  UniversalAnswer,
  AnswerData,
  Citation,
  AnswerAssessment,
  FollowUpSuggestions,
  DataSource,
  FilingReference
} from './types';

export class KnowledgeSynthesizer {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async synthesizeAnswer(query: UniversalQuery, knowledge: KnowledgeSet): Promise<UniversalAnswer> {
    console.log('=== KNOWLEDGE SYNTHESIS ===');
    console.log('Synthesizing answer for:', query.intent.primary);
    console.log('Available knowledge:', {
      companies: knowledge.companies.length,
      filings: knowledge.filings.length,
      confidence: knowledge.confidence
    });

    // 1. Generate primary narrative response
    const narrative = await this.generateNarrative(query, knowledge);
    
    // 2. Structure supporting data
    const data = await this.structureSupportingData(query, knowledge);
    
    // 3. Generate citations
    const citations = this.generateCitations(knowledge);
    
    // 4. Assess answer quality
    const assessment = this.assessAnswer(query, knowledge, narrative);
    
    // 5. Generate follow-up suggestions
    const followUp = this.generateFollowUpSuggestions(query, knowledge);

    const answer: UniversalAnswer = {
      narrative,
      data,
      citations,
      assessment,
      followUp,
      metadata: {
        queryId: `query_${Date.now()}`,
        timestamp: new Date(),
        processingTimeMs: 0, // Would be calculated in real implementation
        sources: knowledge.sources,
        complexity: query.complexity,
        confidence: assessment.confidence
      }
    };

    console.log('Answer synthesis complete:', {
      narrativeLength: narrative.length,
      citationsCount: citations.length,
      confidence: assessment.confidence
    });

    return answer;
  }

  private async generateNarrative(query: UniversalQuery, knowledge: KnowledgeSet): Promise<string> {
    // Handle simple filing lookup queries directly without AI
    if (query.intent.primary === 'filing_lookup' && knowledge.companies.length > 0) {
      return this.generateFilingLookupResponse(query, knowledge);
    }
    
    // Prepare context for AI narrative generation
    const context = this.prepareKnowledgeContext(knowledge);
    
    const prompt = `You are an expert financial analyst with deep knowledge of SEC filings and public company data. Generate a comprehensive, accurate response to this query using the provided knowledge.

QUERY: "${query.originalQuery}"

QUERY ANALYSIS:
- Primary Intent: ${query.intent.primary}
- Secondary Intents: ${query.intent.secondary.join(', ')}
- Complexity: ${query.complexity}
- Requires Analysis: ${query.intent.requiresAnalysis}
- Requires Comparison: ${query.intent.requiresComparison}
- Requires Historical: ${query.intent.requiresHistorical}

AVAILABLE KNOWLEDGE:
${context}

REQUIREMENTS:
1. Provide a direct, comprehensive answer to the specific question asked
2. Use specific data and facts from the knowledge provided
3. Include quantitative details where available
4. Explain context and significance of findings
5. Address all aspects of the query (primary and secondary intents)
6. Be precise and factual - avoid speculation
7. Structure the response logically with clear sections if needed
8. If comparing companies, provide balanced analysis
9. If analyzing trends, explain the trajectory and implications
10. Maintain professional, analytical tone
11. IMPORTANT: Reference specific SEC filings when citing data (e.g., "According to Tesla's 10-K filed on [date]...")

RESPONSE FORMAT:
- Start with a direct answer to the main question
- Provide supporting details and context with filing references
- Include specific data points and metrics with sources
- End with implications or significance
- Note: Source links will be provided separately, focus on clear attribution in text

Generate a comprehensive response:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      return content;

    } catch (error) {
      console.error('Narrative generation failed:', error);
      return this.generateFallbackNarrative(query, knowledge);
    }
  }

  private prepareKnowledgeContext(knowledge: KnowledgeSet): string {
    let context = '';

    // Add company knowledge
    if (knowledge.companies.length > 0) {
      context += '\nCOMPANY INFORMATION:\n';
      knowledge.companies.forEach((company, index) => {
        context += `\n${index + 1}. ${company.identity.name} (${company.identity.ticker}):\n`;
        context += `   - Industry: ${company.identity.industry.sicDescription}\n`;
        context += `   - Business: ${company.business.description}\n`;
        
        if (company.financial.metrics.revenue) {
          context += `   - Revenue: $${(company.financial.metrics.revenue / 1000000).toFixed(0)}M\n`;
        }
        if (company.financial.metrics.net_income) {
          context += `   - Net Income: $${(company.financial.metrics.net_income / 1000000).toFixed(0)}M\n`;
        }
        
        // Add risk factors
        if (company.risk.risk_factors.length > 0) {
          context += `   - Key Risks: ${company.risk.risk_factors.slice(0, 3).map(r => r.category).join(', ')}\n`;
        }
        
        // Add recent filings
        if (company.filings.length > 0) {
          context += `   - Recent Filings: ${company.filings.slice(0, 3).map(f => f.form).join(', ')}\n`;
        }
      });
    }

    // Add filing-specific insights
    if (knowledge.filings.length > 0) {
      context += '\nFILING INSIGHTS:\n';
      knowledge.filings.forEach((filing, index) => {
        if (filing.content.business_description) {
          context += `\n${index + 1}. ${filing.metadata.formType} (${filing.metadata.filingDate.toISOString().split('T')[0]}):\n`;
          context += `   - Business Description: ${filing.content.business_description.substring(0, 200)}...\n`;
        }
        
        if (filing.content.risk_factors && filing.content.risk_factors.length > 0) {
          context += `   - Risk Factors: ${filing.content.risk_factors.length} identified\n`;
          context += `   - Top Risk Categories: ${filing.content.risk_factors.slice(0, 3).map(r => r.category).join(', ')}\n`;
        }
      });
    }

    // Add data sources
    context += `\nDATA SOURCES: ${knowledge.sources.map(s => s.name).join(', ')}\n`;
    context += `KNOWLEDGE CONFIDENCE: ${(knowledge.confidence * 100).toFixed(0)}%\n`;
    context += `KNOWLEDGE COMPLETENESS: ${(knowledge.completeness * 100).toFixed(0)}%\n`;

    return context;
  }

  private async structureSupportingData(query: UniversalQuery, knowledge: KnowledgeSet): Promise<AnswerData> {
    const data: AnswerData = {};

    // Generate tables for comparative data
    if (query.intent.requiresComparison && knowledge.companies.length > 1) {
      data.tables = this.generateComparisonTables(knowledge.companies);
    }

    // Generate financial metrics table
    if (query.intent.primary === 'financial_metrics') {
      data.tables = [...(data.tables || []), this.generateFinancialMetricsTable(knowledge.companies)];
    }

    // Generate risk analysis table
    if (query.intent.primary === 'risk_analysis') {
      data.tables = [...(data.tables || []), this.generateRiskAnalysisTable(knowledge.companies)];
    }

    // Generate timeline for historical analysis
    if (query.intent.requiresHistorical) {
      data.timelines = this.generateTimelines(knowledge);
    }

    return data;
  }

  private generateComparisonTables(companies: any[]): any[] {
    if (companies.length < 2) return [];

    const table = {
      title: 'Company Comparison',
      headers: ['Company', 'Industry', 'Revenue ($M)', 'Net Income ($M)', 'Key Risks'],
      rows: companies.map(company => [
        company.identity.name,
        company.identity.industry.sicDescription,
        company.financial.metrics.revenue ? (company.financial.metrics.revenue / 1000000).toFixed(0) : 'N/A',
        company.financial.metrics.net_income ? (company.financial.metrics.net_income / 1000000).toFixed(0) : 'N/A',
        company.risk.risk_factors.slice(0, 2).map((r: any) => r.category).join(', ') || 'N/A'
      ]),
      source: 'SEC filings and XBRL data',
      notes: ['Revenue and Net Income from most recent 10-K filing', 'Risks from most recent risk factor analysis']
    };

    return [table];
  }

  private generateFinancialMetricsTable(companies: any[]): any {
    return {
      title: 'Financial Metrics Summary',
      headers: ['Company', 'Revenue', 'Net Income', 'Total Assets', 'Cash', 'Debt'],
      rows: companies.map(company => [
        company.identity.name,
        this.formatCurrency(company.financial.metrics.revenue),
        this.formatCurrency(company.financial.metrics.net_income),
        this.formatCurrency(company.financial.metrics.total_assets),
        this.formatCurrency(company.financial.metrics.cash),
        this.formatCurrency(company.financial.metrics.debt)
      ]),
      source: 'XBRL financial data from SEC filings',
      notes: ['All figures in millions USD', 'Data from most recent 10-K filing']
    };
  }

  private generateRiskAnalysisTable(companies: any[]): any {
    const riskData: any[] = [];
    
    companies.forEach(company => {
      if (company.risk.risk_factors.length > 0) {
        company.risk.risk_factors.forEach((risk: any) => {
          riskData.push([
            company.identity.name,
            risk.category,
            risk.severity,
            risk.description.substring(0, 100) + '...'
          ]);
        });
      }
    });

    return {
      title: 'Risk Factor Analysis',
      headers: ['Company', 'Risk Category', 'Severity', 'Description'],
      rows: riskData.slice(0, 10), // Limit to top 10 risks
      source: 'Risk factors from 10-K filings',
      notes: ['Severity assessed based on language used in filings', 'Limited to top 10 risk factors']
    };
  }

  private generateTimelines(knowledge: KnowledgeSet): any[] {
    // Generate timeline from filing dates and key events
    const events: any[] = [];
    
    knowledge.companies.forEach(company => {
      company.filings.forEach(filing => {
        events.push({
          date: filing.filingDate,
          event: `${filing.form} filed`,
          company: company.identity.name,
          type: 'filing'
        });
      });
    });

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return [{
      title: 'Filing Timeline',
      events: events.slice(-10), // Last 10 events
      source: 'SEC filing dates'
    }];
  }

  private generateCitations(knowledge: KnowledgeSet): Citation[] {
    const citations: Citation[] = [];

    // Add company data sources with direct filing links
    knowledge.companies.forEach(company => {
      company.filings.forEach(filing => {
        const paddedCik = company.identity.cik.padStart(10, '0');
        const cleanAccession = filing.accessionNumber.replace(/-/g, '');
        
        // Generate direct filing URL
        const filingUrl = filing.url || 
          `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${cleanAccession}/${filing.primaryDocument}`;
        
        citations.push({
          source: {
            type: 'sec_filing',
            name: `${company.identity.name} ${filing.form} (${filing.filingDate})`,
            timestamp: new Date(filing.filingDate),
            reliability: 1.0,
            isOfficial: true
          },
          filing: {
            accessionNumber: filing.accessionNumber,
            formType: filing.form,
            filingDate: new Date(filing.filingDate),
            section: filing.form === '10-K' ? 'Item 1 - Business' : undefined,
            item: filing.form === '8-K' ? 'Current Report' : undefined
          },
          content: `SEC Filing: ${filing.form} filed on ${filing.filingDate}`,
          url: filingUrl,
          confidence: 0.95,
          relevance: 0.9
        });
      });
    });

    // Add XBRL data sources with company links
    knowledge.sources.forEach(source => {
      citations.push({
        source,
        confidence: 0.9,
        relevance: 0.8
      });
    });

    return citations;
  }

  private assessAnswer(query: UniversalQuery, knowledge: KnowledgeSet, narrative: string): AnswerAssessment {
    const assessment: AnswerAssessment = {
      confidence: this.calculateAnswerConfidence(query, knowledge, narrative),
      completeness: this.calculateAnswerCompleteness(query, knowledge),
      limitations: this.identifyLimitations(knowledge),
      assumptions: this.identifyAssumptions(query, knowledge),
      dataFreshness: this.assessDataFreshness(knowledge),
      bias_risks: this.identifyBiasRisks(query, knowledge)
    };

    return assessment;
  }

  private calculateAnswerConfidence(query: UniversalQuery, knowledge: KnowledgeSet, narrative: string): number {
    let confidence = knowledge.confidence;
    
    // Adjust based on query complexity
    if (query.complexity === 'research') confidence *= 0.8;
    else if (query.complexity === 'analytical') confidence *= 0.9;
    
    // Adjust based on data availability
    if (knowledge.companies.length === 0) confidence *= 0.3;
    if (knowledge.filings.length === 0) confidence *= 0.5;
    
    // Adjust based on narrative quality
    if (narrative.length < 100) confidence *= 0.6;
    if (narrative.includes('could not')) confidence *= 0.7;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private calculateAnswerCompleteness(query: UniversalQuery, knowledge: KnowledgeSet): number {
    let completeness = knowledge.completeness;
    
    // Check if we have data for all requested entities
    const requestedCompanies = query.entities.companies.length;
    const availableCompanies = knowledge.companies.length;
    
    if (requestedCompanies > 0) {
      completeness *= (availableCompanies / requestedCompanies);
    }
    
    return Math.max(0.1, Math.min(1.0, completeness));
  }

  private identifyLimitations(knowledge: KnowledgeSet): string[] {
    const limitations: string[] = [];
    
    if (knowledge.companies.length === 0) {
      limitations.push('No company data available');
    }
    
    if (knowledge.filings.length === 0) {
      limitations.push('No filing content analyzed');
    }
    
    if (knowledge.confidence < 0.7) {
      limitations.push('Low confidence in extracted data');
    }
    
    limitations.push('Analysis based on most recent filings only');
    limitations.push('Risk assessments are qualitative interpretations');
    
    return limitations;
  }

  private identifyAssumptions(query: UniversalQuery, knowledge: KnowledgeSet): string[] {
    const assumptions: string[] = [];
    
    assumptions.push('Filing data is accurate and complete');
    assumptions.push('Most recent data represents current state');
    
    if (query.intent.requiresComparison) {
      assumptions.push('Companies are comparable within their respective contexts');
    }
    
    if (query.intent.requiresHistorical) {
      assumptions.push('Historical patterns may predict future trends');
    }
    
    return assumptions;
  }

  private assessDataFreshness(knowledge: KnowledgeSet): any {
    const dates = knowledge.sources.map(s => s.timestamp).filter(Boolean);
    
    if (dates.length === 0) {
      return {
        overall_age_days: 365,
        oldest_data_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        newest_data_date: new Date(),
        has_realtime_data: false,
        coverage_gaps: [{ area: 'All data', description: 'No timestamp information', impact: 'high' }]
      };
    }
    
    const oldest = new Date(Math.min(...dates.map(d => d.getTime())));
    const newest = new Date(Math.max(...dates.map(d => d.getTime())));
    const avgAge = (Date.now() - newest.getTime()) / (1000 * 60 * 60 * 24);
    
    return {
      overall_age_days: Math.floor(avgAge),
      oldest_data_date: oldest,
      newest_data_date: newest,
      has_realtime_data: avgAge < 1,
      coverage_gaps: []
    };
  }

  private identifyBiasRisks(query: UniversalQuery, knowledge: KnowledgeSet): string[] {
    const biasRisks: string[] = [];
    
    if (knowledge.companies.length === 1) {
      biasRisks.push('Single company analysis may lack industry context');
    }
    
    if (query.intent.requiresComparison && knowledge.companies.length < query.entities.companies.length) {
      biasRisks.push('Incomplete comparison due to missing company data');
    }
    
    biasRisks.push('Analysis based on company self-reported information');
    biasRisks.push('Recent filing data may not reflect current market conditions');
    
    return biasRisks;
  }

  private generateFollowUpSuggestions(query: UniversalQuery, knowledge: KnowledgeSet): FollowUpSuggestions {
    const suggestions: FollowUpSuggestions = {
      suggested_queries: [],
      related_topics: [],
      deeper_analysis: [],
      comparison_opportunities: []
    };

    // Generate suggestions based on query intent and available data
    if (query.intent.primary === 'business_overview') {
      suggestions.suggested_queries = [
        'What are the main risk factors for this company?',
        'How has the business model evolved over time?',
        'What are the key financial metrics?'
      ];
    }

    if (query.intent.primary === 'financial_metrics') {
      suggestions.suggested_queries = [
        'How do these metrics compare to industry peers?',
        'What are the trends over the last 5 years?',
        'What factors are driving these financial results?'
      ];
    }

    // Add related topics based on company industries
    if (knowledge.companies.length > 0) {
      const industries = [...new Set(knowledge.companies.map(c => c.identity.industry.sector))];
      suggestions.related_topics = industries.map(industry => `Other companies in ${industry} sector`);
    }

    return suggestions;
  }

  private generateFallbackNarrative(query: UniversalQuery, knowledge: KnowledgeSet): string {
    if (knowledge.companies.length === 0) {
      return `I was unable to find sufficient company data to answer "${query.originalQuery}". This could be due to the company not being in our database or issues with data extraction.`;
    }

    const company = knowledge.companies[0];
    return `Based on available SEC filing data for ${company.identity.name}: ${company.business.description}. Additional analysis was limited due to data extraction constraints.`;
  }

  private generateFilingLookupResponse(query: UniversalQuery, knowledge: KnowledgeSet): string {
    const company = knowledge.companies[0];
    const companyName = company.identity.name;
    
    if (!company.filings || company.filings.length === 0) {
      return `I could not find recent SEC filings for ${companyName}. This may be due to API limitations or the company may not have recent filings available.`;
    }

    // Extract number from query if specified (e.g., "last 3 filings")
    const numberMatch = query.originalQuery.match(/(\d+)/);
    const requestedCount = numberMatch ? parseInt(numberMatch[1]) : 5;
    const filings = company.filings.slice(0, requestedCount);

    let response = `Here are the ${requestedCount === filings.length ? requestedCount : filings.length} most recent SEC filings for ${companyName}:\n\n`;

    filings.forEach((filing, index) => {
      const filingDate = new Date(filing.filingDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Generate direct SEC EDGAR URL if not already present
      const paddedCik = company.identity.cik.padStart(10, '0');
      const cleanAccession = filing.accessionNumber.replace(/-/g, '');
      const filingUrl = filing.url || 
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${cleanAccession}/${filing.primaryDocument}`;
      
      response += `${index + 1}. **${filing.form}** - Filed on ${filingDate}\n`;
      response += `   📄 **[View Filing](${filingUrl})**\n`;
      response += `   Accession Number: ${filing.accessionNumber}\n`;
      if (filing.primaryDocument) {
        response += `   Document: ${filing.primaryDocument}\n`;
      }
      response += '\n';
    });

    response += `**📋 Filing Type Guide:**\n`;
    response += `- **10-K**: Annual report with comprehensive business and financial information\n`;
    response += `- **10-Q**: Quarterly report with unaudited financial statements\n`;
    response += `- **8-K**: Current report for material events or corporate changes\n`;
    response += `- **DEF 14A**: Proxy statement for shareholder meetings\n\n`;

    response += `🔗 **[Browse All ${companyName} Filings](https://www.sec.gov/edgar/browse/?CIK=${company.identity.cik.padStart(10, '0')}&owner=exclude)**`;

    return response;
  }

  private formatCurrency(amount: number | undefined): string {
    if (!amount) return 'N/A';
    return `$${(amount / 1000000).toFixed(0)}M`;
  }
}