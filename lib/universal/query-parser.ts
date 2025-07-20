// Universal Query Parser - Advanced NLU for EDGAR queries

import OpenAI from 'openai';
import { 
  UniversalQuery, 
  EntitySet, 
  QueryIntent, 
  QueryScope, 
  QueryConstraints,
  CompanyEntity,
  ConceptEntity,
  TimeRange,
  MetricEntity,
  FilingTypeEntity,
  PrimaryIntent,
  SecondaryIntent
} from './types';

export class UniversalQueryParser {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parse(naturalLanguageQuery: string): Promise<UniversalQuery> {
    console.log('=== UNIVERSAL QUERY PARSING ===');
    console.log('Query:', naturalLanguageQuery);

    // Multi-step parsing process
    const entities = await this.extractEntities(naturalLanguageQuery);
    const intent = await this.classifyIntent(naturalLanguageQuery, entities);
    const scope = await this.determineScope(naturalLanguageQuery, intent);
    const constraints = await this.extractConstraints(naturalLanguageQuery);
    const complexity = this.determineComplexity(naturalLanguageQuery, intent, entities);
    const confidence = this.calculateConfidence(entities, intent, scope);

    const universalQuery: UniversalQuery = {
      originalQuery: naturalLanguageQuery,
      entities,
      intent,
      scope,
      constraints,
      confidence,
      complexity
    };

    console.log('Parsed Query:', JSON.stringify(universalQuery, null, 2));
    return universalQuery;
  }

  private async extractEntities(query: string): Promise<EntitySet> {
    const prompt = `Extract entities from this SEC EDGAR database query. Analyze the query and identify:

Query: "${query}"

Return a JSON object with:
{
  "companies": [{"name": "Company Name", "ticker": "TICK", "variations": ["Name1", "TICK"], "confidence": 0.9, "context": "how mentioned"}],
  "concepts": [{"concept": "business model", "category": "business", "variations": ["business", "model"], "confidence": 0.8}],
  "timeRanges": [{"description": "last 3 years", "period": "annual", "confidence": 0.9}],
  "metrics": [{"metric": "revenue", "category": "revenue", "standardName": "TotalRevenue", "confidence": 0.9}],
  "filingTypes": [{"formType": "10-K", "description": "Annual Report", "category": "periodic", "confidence": 0.8}],
  "amounts": [{"value": 1000000, "currency": "USD", "unit": "actual", "confidence": 0.7}],
  "people": [{"name": "Elon Musk", "role": "CEO", "company": "Tesla", "confidence": 0.9}],
  "locations": [{"location": "California", "type": "state", "confidence": 0.8}]
}

Concept categories: business, financial, risk, regulatory, operational
Metric categories: revenue, profitability, efficiency, liquidity, leverage, growth
Filing categories: periodic, proxy, insider, registration, other
Time periods: current, latest, annual, quarterly

Be generous with variations and synonyms. Include confidence scores 0-1.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      const entities = JSON.parse(content);
      
      // Normalize and validate entities
      return {
        companies: entities.companies || [],
        concepts: entities.concepts || [],
        timeRanges: entities.timeRanges || [],
        metrics: entities.metrics || [],
        filingTypes: entities.filingTypes || [],
        amounts: entities.amounts || [],
        people: entities.people || [],
        locations: entities.locations || []
      };

    } catch (error) {
      console.error('Entity extraction failed:', error);
      // Fallback to rule-based extraction
      return this.fallbackEntityExtraction(query);
    }
  }

  private async classifyIntent(query: string, entities: EntitySet): Promise<QueryIntent> {
    const prompt = `Classify the intent of this SEC EDGAR database query:

Query: "${query}"
Entities found: ${JSON.stringify(entities, null, 2)}

Determine the primary intent and any secondary intents:

PRIMARY INTENTS:
- business_overview: Understanding what a company does
- financial_metrics: Getting specific financial numbers
- comparative_analysis: Comparing multiple companies/metrics
- trend_analysis: Looking at changes over time
- content_search: Finding text/content within filings
- filing_lookup: Finding specific documents
- risk_analysis: Understanding risks and uncertainties
- regulatory_analysis: Understanding regulatory impacts
- market_analysis: Market-wide or sector analysis
- relationship_analysis: Company relationships and connections
- pattern_analysis: Statistical patterns across companies
- predictive_analysis: Forward-looking analysis
- meta_analysis: Questions about the database itself

SECONDARY INTENTS:
- geographic_focus, industry_focus, size_focus
- time_series, benchmarking, correlation, causation
- ranking, aggregation, summarization

Return JSON:
{
  "primary": "business_overview",
  "secondary": ["industry_focus", "time_series"],
  "requiresAnalysis": true,
  "requiresComparison": false,
  "requiresHistorical": true,
  "confidence": 0.9,
  "reasoning": "User wants to understand business evolution over time"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      const result = JSON.parse(content);
      
      return {
        primary: result.primary,
        secondary: result.secondary || [],
        requiresAnalysis: result.requiresAnalysis || false,
        requiresComparison: result.requiresComparison || false,
        requiresHistorical: result.requiresHistorical || false
      };

    } catch (error) {
      console.error('Intent classification failed:', error);
      return this.fallbackIntentClassification(query, entities);
    }
  }

  private async determineScope(query: string, intent: QueryIntent): Promise<QueryScope> {
    const prompt = `Determine the scope for this SEC EDGAR query:

Query: "${query}"
Intent: ${JSON.stringify(intent)}

Analyze what data types are needed and the depth of analysis required:

DATA TYPES:
- company_profile, financial_statements, filing_content
- risk_factors, business_description, management_discussion
- legal_proceedings, corporate_governance, insider_transactions
- market_data, regulatory_context, industry_context
- peer_data, historical_events, forward_guidance

GRANULARITY: summary | detailed | comprehensive
PERSPECTIVE: factual | analytical | comparative | predictive
BREADTH: single_company | industry | market_wide | cross_industry
DEPTH: surface | moderate | deep | exhaustive

Return JSON:
{
  "dataTypes": ["business_description", "filing_content"],
  "granularity": "detailed",
  "perspective": "analytical",
  "breadth": "single_company",
  "depth": "moderate"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      return JSON.parse(content);

    } catch (error) {
      console.error('Scope determination failed:', error);
      return this.fallbackScopeAnalysis(query, intent);
    }
  }

  private extractConstraints(query: string): QueryConstraints {
    const lowerQuery = query.toLowerCase();
    
    return {
      timebound: /\b(since|until|between|from|to|last|recent|current|latest)\b/.test(lowerQuery),
      minimumConfidence: 0.7,
      requiredSources: [],
      excludeEstimates: lowerQuery.includes('actual') || lowerQuery.includes('filed'),
      includeForwardLooking: lowerQuery.includes('forecast') || lowerQuery.includes('guidance') || lowerQuery.includes('outlook'),
      maxAge: lowerQuery.includes('latest') || lowerQuery.includes('recent') ? 30 : 365,
      requireOfficialFilings: !lowerQuery.includes('estimate') && !lowerQuery.includes('projection')
    };
  }

  private determineComplexity(
    query: string, 
    intent: QueryIntent, 
    entities: EntitySet
  ): 'simple' | 'compound' | 'analytical' | 'research' {
    
    const indicators = {
      multipleCompanies: entities.companies.length > 1,
      multipleTimeRanges: entities.timeRanges.length > 1,
      multipleConcepts: entities.concepts.length > 2,
      requiresAnalysis: intent.requiresAnalysis,
      requiresComparison: intent.requiresComparison,
      requiresHistorical: intent.requiresHistorical,
      hasSecondaryIntents: intent.secondary.length > 0,
      complexWords: /\b(analyze|compare|trend|evolve|impact|correlation|pattern)\b/i.test(query)
    };

    const complexityScore = Object.values(indicators).filter(Boolean).length;

    if (complexityScore >= 6) return 'research';
    if (complexityScore >= 4) return 'analytical';
    if (complexityScore >= 2) return 'compound';
    return 'simple';
  }

  private calculateConfidence(
    entities: EntitySet, 
    intent: QueryIntent, 
    scope: QueryScope
  ): number {
    const scores = [
      entities.companies.reduce((sum, e) => sum + e.confidence, 0) / Math.max(entities.companies.length, 1),
      entities.concepts.reduce((sum, e) => sum + e.confidence, 0) / Math.max(entities.concepts.length, 1),
      entities.timeRanges.reduce((sum, e) => sum + e.confidence, 0) / Math.max(entities.timeRanges.length, 1),
      entities.metrics.reduce((sum, e) => sum + e.confidence, 0) / Math.max(entities.metrics.length, 1)
    ].filter(score => !isNaN(score));

    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.5;
  }

  // Fallback methods for when AI fails
  private fallbackEntityExtraction(query: string): EntitySet {
    const lowerQuery = query.toLowerCase();
    
    // Basic company detection
    const companies: CompanyEntity[] = [];
    const companyPatterns = [
      { pattern: /\btesla\b/gi, name: 'Tesla', ticker: 'TSLA', cik: '0001318605' },
      { pattern: /\bapple\b/gi, name: 'Apple', ticker: 'AAPL', cik: '0000320193' },
      { pattern: /\bmicrosoft\b/gi, name: 'Microsoft', ticker: 'MSFT', cik: '0000789019' },
      { pattern: /\bgoogle\b|alphabet/gi, name: 'Alphabet', ticker: 'GOOGL', cik: '0001652044' },
      { pattern: /\bamazon\b/gi, name: 'Amazon', ticker: 'AMZN', cik: '0001018724' },
      { pattern: /\bmeta\b|facebook/gi, name: 'Meta', ticker: 'META', cik: '0001326801' }
    ];

    companyPatterns.forEach(({ pattern, name, ticker, cik }) => {
      if (pattern.test(query)) {
        companies.push({
          name,
          ticker,
          cik,
          variations: [name, ticker],
          confidence: 0.8,
          context: 'pattern_match'
        });
      }
    });

    // Basic concept detection
    const concepts: ConceptEntity[] = [];
    if (/business|company|operations/i.test(query)) {
      concepts.push({
        concept: 'business',
        category: 'business',
        variations: ['business', 'operations', 'company'],
        confidence: 0.7
      });
    }

    // Filing type detection
    const filingTypes: any[] = [];
    if (/filing|10-k|10-q|8-k|document/i.test(query)) {
      filingTypes.push({
        formType: 'ALL',
        description: 'SEC Filings',
        category: 'periodic',
        confidence: 0.9
      });
    }

    // Time range detection
    const timeRanges: any[] = [];
    if (/last|recent|latest|past/i.test(query)) {
      timeRanges.push({
        description: 'recent',
        period: 'latest',
        confidence: 0.8
      });
    }

    return {
      companies,
      concepts,
      timeRanges,
      metrics: [],
      filingTypes,
      amounts: [],
      people: [],
      locations: []
    };
  }

  private fallbackIntentClassification(query: string, entities: EntitySet): QueryIntent {
    const lowerQuery = query.toLowerCase();
    
    let primary: PrimaryIntent = 'business_overview';
    
    if (/filing|10-k|10-q|8-k|document|last.*filing/i.test(query)) {
      primary = 'filing_lookup';
    } else if (/what.*business|what.*do|what.*company/i.test(query)) {
      primary = 'business_overview';
    } else if (/revenue|profit|income|financial/i.test(query)) {
      primary = 'financial_metrics';
    } else if (/compare|versus|vs\b/i.test(query)) {
      primary = 'comparative_analysis';
    }

    return {
      primary,
      secondary: [],
      requiresAnalysis: /analyze|analysis|trend|impact/i.test(query),
      requiresComparison: /compare|versus|vs\b/i.test(query),
      requiresHistorical: /history|historical|over time|since/i.test(query)
    };
  }

  private fallbackScopeAnalysis(query: string, intent: QueryIntent): QueryScope {
    return {
      dataTypes: ['company_profile', 'business_description'],
      granularity: 'summary',
      perspective: 'factual',
      breadth: 'single_company',
      depth: 'surface'
    };
  }
}