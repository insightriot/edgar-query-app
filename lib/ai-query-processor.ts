// AI-powered query processing using OpenAI o4-mini
import OpenAI from 'openai';
import { matchFilingTypes, isFilingQuery, getFormCodes } from './sec-filing-types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface QueryAnalysis {
  intent: 'company_info' | 'financial_metrics' | 'sec_filings' | 'comparison' | 'general';
  companies: string[];
  metrics: string[];
  timeframes: string[];
  filingTypes: string[];
  confidence: number;
  explanation: string;
}

export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback to basic pattern matching if no OpenAI key
    return fallbackAnalysis(query);
  }

  try {
    const prompt = `Analyze this SEC EDGAR database query and extract structured information.

Query: "${query}"

Please respond with ONLY a JSON object containing:
{
  "intent": "company_info" | "financial_metrics" | "sec_filings" | "comparison" | "general",
  "companies": ["company names or tickers mentioned"],
  "metrics": ["revenue", "profit", "assets", etc.],
  "timeframes": ["2023", "Q1", "latest", etc.],
  "filingTypes": ["10-K", "10-Q", "proxy", "comment letters", etc.],
  "confidence": 0.0-1.0,
  "explanation": "Brief explanation of what the user is asking"
}

Focus on:
- Intent: What type of information is being requested?
- Companies: Any company names, tickers, or references (be generous - include AAPL for Apple, TSLA for Tesla, etc.)
- Metrics: Financial metrics or data points
- Timeframes: Years, quarters, or time periods mentioned
- FilingTypes: Any SEC forms, reports, or document types mentioned (10-K, proxy, comment letters, etc.)
- Confidence: How confident you are in the analysis

Examples:
- "What was Apple's revenue in 2023?" → intent: "financial_metrics", companies: ["Apple", "AAPL"], metrics: ["revenue"], timeframes: ["2023"], filingTypes: []
- "Tell me about Tesla" → intent: "company_info", companies: ["Tesla", "TSLA"], filingTypes: []
- "Show me Microsoft's latest 10-K filing" → intent: "sec_filings", companies: ["Microsoft", "MSFT"], timeframes: ["latest"], filingTypes: ["10-K"]
- "Any SEC comment letters for Apple?" → intent: "sec_filings", companies: ["Apple", "AAPL"], filingTypes: ["comment letters"]
- "Find Tesla's proxy statement" → intent: "sec_filings", companies: ["Tesla", "TSLA"], filingTypes: ["proxy", "DEF 14A"]
- "Show me Netflix's 8-K reports from last year" → intent: "sec_filings", companies: ["Netflix", "NFLX"], timeframes: ["2024"], filingTypes: ["8-K"]

Return ONLY the JSON object, no other text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Parse the JSON response
    const analysis = JSON.parse(content);
    
    // Validate the response structure
    if (!analysis.intent || !Array.isArray(analysis.companies)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return analysis;

  } catch (error) {
    console.error('AI query analysis error:', error);
    // Fallback to basic pattern matching
    return fallbackAnalysis(query);
  }
}

function fallbackAnalysis(query: string): QueryAnalysis {
  const lowerQuery = query.toLowerCase();
  
  // Use intelligent filing type matching
  const matchedFilings = matchFilingTypes(query);
  const isFilingRelated = isFilingQuery(query) || matchedFilings.length > 0;
  
  // Basic intent classification
  let intent: QueryAnalysis['intent'] = 'general';
  if (lowerQuery.includes('revenue') || lowerQuery.includes('sales') || lowerQuery.includes('income') || lowerQuery.includes('profit')) {
    intent = 'financial_metrics';
  } else if (isFilingRelated) {
    intent = 'sec_filings';
  } else if (lowerQuery.includes('about') || lowerQuery.includes('company') || lowerQuery.includes('business')) {
    intent = 'company_info';
  } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
    intent = 'comparison';
  }

  // Basic company extraction
  const companies = [];
  const knownCompanies = [
    'apple', 'microsoft', 'google', 'alphabet', 'amazon', 'tesla', 'meta', 'netflix', 
    'nvidia', 'salesforce', 'adobe', 'intel', 'oracle', 'cisco', 'ibm',
    'aapl', 'msft', 'googl', 'amzn', 'tsla', 'meta', 'nflx', 'nvda'
  ];
  
  knownCompanies.forEach(company => {
    if (lowerQuery.includes(company)) {
      companies.push(company.charAt(0).toUpperCase() + company.slice(1));
    }
  });

  // Basic metric extraction
  const metrics = [];
  const knownMetrics = ['revenue', 'income', 'profit', 'sales', 'assets', 'debt', 'cash'];
  knownMetrics.forEach(metric => {
    if (lowerQuery.includes(metric)) {
      metrics.push(metric);
    }
  });

  // Basic timeframe extraction
  const timeframes = [];
  const yearMatch = query.match(/\b(20\d{2})\b/g);
  if (yearMatch) timeframes.push(...yearMatch);
  
  const quarterMatch = query.match(/\b(Q[1-4])\b/gi);
  if (quarterMatch) timeframes.push(...quarterMatch);
  
  if (lowerQuery.includes('latest') || lowerQuery.includes('recent') || lowerQuery.includes('current')) {
    timeframes.push('latest');
  }
  
  // Handle "last X years" patterns
  const lastYearsMatch = query.match(/last\s+(\d+)\s+year/i);
  if (lastYearsMatch) {
    const years = parseInt(lastYearsMatch[1]);
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < years; i++) {
      timeframes.push((currentYear - i).toString());
    }
  }

  return {
    intent,
    companies: [...new Set(companies)], // Remove duplicates
    metrics: [...new Set(metrics)],
    timeframes: [...new Set(timeframes)],
    filingTypes: getFormCodes(matchedFilings),
    confidence: 0.7,
    explanation: `Basic pattern matching analysis: Looking for ${intent} about ${companies.join(', ') || 'companies'}${matchedFilings.length > 0 ? ` (${matchedFilings.length} filing types matched)` : ''}`
  };
}

export async function generateResponse(analysis: QueryAnalysis, data: any): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackResponse(analysis, data);
  }

  try {
    const prompt = `Generate a natural, informative response based on this query analysis and data.

Query Analysis:
${JSON.stringify(analysis, null, 2)}

Retrieved Data:
${JSON.stringify(data, null, 2)}

You are a helpful financial data assistant. Please provide a clear, conversational response that:
1. Directly answers the user's question
2. Includes specific numbers and details from the data
3. Provides context and insights when data is missing or limited
4. Is easy to read and understand
5. Explains if data is not available for the requested timeframe

Keep the response concise but informative (2-3 sentences maximum). If asking about 2024 data but only 2022 data exists, explain this clearly.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    return content || fallbackResponse(analysis, data);

  } catch (error) {
    console.error('AI response generation error:', error);
    return fallbackResponse(analysis, data);
  }
}

function fallbackResponse(analysis: QueryAnalysis, data: any): string {
  if (analysis.intent === 'financial_metrics' && data.company && data.data?.length > 0) {
    const metric = data.data[0];
    const value = metric.value ? `$${(parseFloat(metric.value) / 1000000000).toFixed(1)}B` : 'N/A';
    return `${data.company.name}: ${analysis.metrics[0] || 'Revenue'} for ${metric.fiscal_year} was ${value}`;
  }
  
  if (analysis.intent === 'company_info' && data.company) {
    return `${data.company.name} is a ${data.company.industry || 'public'} company with ${data.company.employees?.toLocaleString() || 'many'} employees.`;
  }
  
  return 'I found some information about your query, but need more specific data to provide detailed insights.';
}