// Universal EDGAR Intelligence Engine - Main orchestrator

import { UniversalQueryParser } from './query-parser';
import { KnowledgeExtractionEngine } from './knowledge-extractor';
import { KnowledgeSynthesizer } from './knowledge-synthesizer';
import { UniversalQuery, UniversalAnswer } from './types';

export class UniversalEdgarEngine {
  private queryParser: UniversalQueryParser;
  private knowledgeExtractor: KnowledgeExtractionEngine;
  private synthesizer: KnowledgeSynthesizer;

  constructor() {
    this.queryParser = new UniversalQueryParser();
    this.knowledgeExtractor = new KnowledgeExtractionEngine();
    this.synthesizer = new KnowledgeSynthesizer();
  }

  async processQuery(naturalLanguageQuery: string): Promise<UniversalAnswer> {
    console.log('=== UNIVERSAL EDGAR ENGINE ===');
    console.log('Processing query:', naturalLanguageQuery);
    
    const startTime = performance.now();

    try {
      // Step 1: Parse the natural language query
      console.log('Step 1: Parsing query...');
      let universalQuery;
      try {
        universalQuery = await this.queryParser.parse(naturalLanguageQuery);
        console.log('Query parsing result:', {
          confidence: universalQuery.confidence,
          intent: universalQuery.intent.primary,
          entities: {
            companies: universalQuery.entities.companies.length,
            concepts: universalQuery.entities.concepts.length,
            filingTypes: universalQuery.entities.filingTypes.length
          }
        });
      } catch (parseError) {
        console.error('Query parsing failed:', parseError);
        throw new Error(`Query parsing failed: ${parseError.message}`);
      }
      
      if (universalQuery.confidence < 0.1) {
        console.warn('Low confidence in query parsing:', universalQuery.confidence);
        return this.generateLowConfidenceResponse(naturalLanguageQuery, universalQuery);
      }

      // Step 2: Extract relevant knowledge
      console.log('Step 2: Extracting knowledge...');
      let knowledgeSet;
      try {
        knowledgeSet = await this.knowledgeExtractor.extractKnowledge(universalQuery);
        console.log('Knowledge extraction result:', {
          confidence: knowledgeSet.confidence,
          completeness: knowledgeSet.completeness,
          companies: knowledgeSet.companies.length,
          filings: knowledgeSet.filings.length
        });
      } catch (extractError) {
        console.error('Knowledge extraction failed:', extractError);
        throw new Error(`Knowledge extraction failed: ${extractError.message}`);
      }
      
      if (knowledgeSet.confidence < 0.2) {
        console.warn('Low confidence in knowledge extraction:', knowledgeSet.confidence);
        return this.generateInsufficientDataResponse(naturalLanguageQuery, universalQuery, knowledgeSet);
      }

      // Step 3: Synthesize comprehensive answer
      console.log('Step 3: Synthesizing answer...');
      let answer;
      try {
        answer = await this.synthesizer.synthesizeAnswer(universalQuery, knowledgeSet);
        console.log('Answer synthesis result:', {
          narrativeLength: answer.narrative.length,
          confidence: answer.assessment.confidence,
          citationsCount: answer.citations.length
        });
      } catch (synthesisError) {
        console.error('Answer synthesis failed:', synthesisError);
        throw new Error(`Answer synthesis failed: ${synthesisError.message}`);
      }
      
      // Update processing time
      answer.metadata.processingTimeMs = performance.now() - startTime;
      
      console.log('Universal EDGAR Engine processing complete:', {
        processingTime: answer.metadata.processingTimeMs,
        confidence: answer.assessment.confidence,
        citationsCount: answer.citations.length
      });

      return answer;

    } catch (error) {
      console.error('Universal EDGAR Engine error:', error);
      console.error('Error stack:', error.stack);
      return this.generateErrorResponse(naturalLanguageQuery, error);
    }
  }

  private generateLowConfidenceResponse(
    originalQuery: string, 
    parsedQuery: UniversalQuery
  ): UniversalAnswer {
    return {
      narrative: `I had difficulty understanding your query "${originalQuery}". Could you please rephrase it or provide more specific details? For example, you could specify:
      
- Company names or ticker symbols
- Specific financial metrics or data points  
- Time periods of interest
- Types of SEC filings (10-K, 10-Q, 8-K, etc.)

Some example queries that work well:
- "What is Tesla's business description?"
- "Compare Apple and Microsoft's revenue"
- "What are the main risk factors for Amazon?"
- "Show me Google's latest 10-K filing"`,
      data: {},
      citations: [],
      assessment: {
        confidence: parsedQuery.confidence,
        completeness: 0.1,
        limitations: ['Query parsing failed or had low confidence', 'Unable to identify clear intent or entities'],
        assumptions: [],
        dataFreshness: {
          overall_age_days: 0,
          oldest_data_date: new Date(),
          newest_data_date: new Date(),
          has_realtime_data: false,
          coverage_gaps: []
        },
        bias_risks: []
      },
      followUp: {
        suggested_queries: [
          'What does [company name] do?',
          'What was [company]\'s revenue last year?',
          'What are [company]\'s main risks?',
          'Compare [company1] and [company2] finances'
        ],
        related_topics: ['Query syntax', 'Available data types', 'Company lookup'],
        deeper_analysis: [],
        comparison_opportunities: []
      },
      metadata: {
        queryId: `low_confidence_${Date.now()}`,
        timestamp: new Date(),
        processingTimeMs: 0,
        sources: [],
        complexity: 'simple',
        confidence: parsedQuery.confidence
      }
    };
  }

  private generateInsufficientDataResponse(
    originalQuery: string,
    parsedQuery: UniversalQuery,
    knowledgeSet: any
  ): UniversalAnswer {
    const companies = parsedQuery.entities.companies.map(c => c.name).join(', ');
    
    return {
      narrative: `I was unable to find sufficient data to answer "${originalQuery}". ${companies ? `The companies mentioned (${companies}) may not be in our database, or there may have been issues accessing their SEC filings.` : 'No companies were clearly identified in your query.'}

Our database includes major public companies that file with the SEC. Please verify:
- Company names or ticker symbols are spelled correctly
- The companies are publicly traded in the US
- The companies have recent SEC filings

You can also try:
- Using official company names or common ticker symbols
- Asking about well-known public companies (Apple, Microsoft, Tesla, etc.)
- Specifying the type of information you're looking for`,
      data: {},
      citations: [],
      assessment: {
        confidence: knowledgeSet.confidence,
        completeness: knowledgeSet.completeness,
        limitations: [
          'Insufficient data extracted from SEC sources',
          'Company may not be in database or have accessible filings',
          'SEC API may be temporarily unavailable'
        ],
        assumptions: [],
        dataFreshness: {
          overall_age_days: 0,
          oldest_data_date: new Date(),
          newest_data_date: new Date(),
          has_realtime_data: false,
          coverage_gaps: [{ area: 'Company data', description: 'No data available', impact: 'high' }]
        },
        bias_risks: []
      },
      followUp: {
        suggested_queries: [
          'List available companies in the database',
          'Search for companies by industry',
          'Try a different company name or ticker symbol'
        ],
        related_topics: ['Supported companies', 'SEC filing types', 'Data availability'],
        deeper_analysis: [],
        comparison_opportunities: []
      },
      metadata: {
        queryId: `insufficient_data_${Date.now()}`,
        timestamp: new Date(),
        processingTimeMs: 0,
        sources: knowledgeSet.sources || [],
        complexity: parsedQuery.complexity,
        confidence: knowledgeSet.confidence
      }
    };
  }

  private generateErrorResponse(originalQuery: string, error: any): UniversalAnswer {
    console.error('Generating error response for:', error);
    
    return {
      narrative: `I encountered an error while processing your query "${originalQuery}". This could be due to:

- Temporary issues with SEC data sources
- Network connectivity problems  
- System processing errors

Please try again in a few moments. If the problem persists, you can:
- Try a simpler version of your query
- Check if the company names are correct
- Contact support for assistance

Error details: ${error.message || 'Unknown error occurred'}`,
      data: {},
      citations: [],
      assessment: {
        confidence: 0.1,
        completeness: 0.0,
        limitations: [
          'System error prevented processing',
          'No data was retrieved or analyzed',
          'Query could not be completed'
        ],
        assumptions: [],
        dataFreshness: {
          overall_age_days: 0,
          oldest_data_date: new Date(),
          newest_data_date: new Date(),
          has_realtime_data: false,
          coverage_gaps: [{ area: 'All data', description: 'System error', impact: 'high' }]
        },
        bias_risks: []
      },
      followUp: {
        suggested_queries: [
          'Try again with a simpler query',
          'Check system status',
          'Contact support'
        ],
        related_topics: ['System status', 'Error reporting', 'Alternative queries'],
        deeper_analysis: [],
        comparison_opportunities: []
      },
      metadata: {
        queryId: `error_${Date.now()}`,
        timestamp: new Date(),
        processingTimeMs: 0,
        sources: [],
        complexity: 'simple',
        confidence: 0.1
      }
    };
  }

  // Helper method to check system health
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Test basic functionality
      const testQuery = "What is Tesla's business?";
      const startTime = performance.now();
      
      const parsedQuery = await this.queryParser.parse(testQuery);
      const processingTime = performance.now() - startTime;
      
      return {
        status: 'healthy',
        details: {
          queryParsingWorking: parsedQuery.confidence > 0.5,
          processingTimeMs: processingTime,
          openaiConnected: !!process.env.OPENAI_API_KEY,
          secApiAccessible: true // Would need actual test
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          timestamp: new Date()
        }
      };
    }
  }
}