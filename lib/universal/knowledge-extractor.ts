// Knowledge Extraction Engine - Extracts deep knowledge from SEC filings

import { 
  UniversalQuery,
  KnowledgeSet,
  CompanyKnowledge,
  FilingKnowledge,
  CompanyIdentity,
  BusinessProfile,
  FinancialProfile,
  RiskProfile,
  FilingContent,
  FilingMetadata,
  DataSource
} from './types';

export class KnowledgeExtractionEngine {
  
  async extractKnowledge(query: UniversalQuery): Promise<KnowledgeSet> {
    console.log('=== KNOWLEDGE EXTRACTION ===');
    console.log('Extracting knowledge for:', query.intent.primary);
    
    const knowledgeSet: KnowledgeSet = {
      companies: [],
      filings: [],
      relationships: [],
      industry: {} as any,
      market: {} as any,
      sources: [],
      confidence: 0,
      completeness: 0
    };

    // Extract knowledge based on query scope
    for (const company of query.entities.companies) {
      console.log('Extracting knowledge for company:', company.name);
      
      try {
        const companyKnowledge = await this.extractCompanyKnowledge(company, query);
        knowledgeSet.companies.push(companyKnowledge);
        
        // Add company filings to overall filing knowledge
        for (const filing of companyKnowledge.filings) {
          const detailedFiling = await this.extractFilingKnowledge(filing.accessionNumber, query);
          if (detailedFiling) {
            knowledgeSet.filings.push(detailedFiling);
          }
        }
        
      } catch (error) {
        console.error(`Failed to extract knowledge for ${company.name}:`, error);
      }
    }

    // Calculate overall confidence and completeness
    knowledgeSet.confidence = this.calculateKnowledgeConfidence(knowledgeSet);
    knowledgeSet.completeness = this.calculateKnowledgeCompleteness(knowledgeSet, query);

    console.log('Knowledge extraction complete:', {
      companies: knowledgeSet.companies.length,
      filings: knowledgeSet.filings.length,
      confidence: knowledgeSet.confidence,
      completeness: knowledgeSet.completeness
    });

    return knowledgeSet;
  }

  private async extractCompanyKnowledge(
    companyEntity: any, 
    query: UniversalQuery
  ): Promise<CompanyKnowledge> {
    
    // Get basic company identity
    const identity = await this.getCompanyIdentity(companyEntity);
    
    // Initialize knowledge structure
    const knowledge: CompanyKnowledge = {
      identity,
      business: await this.extractBusinessProfile(identity, query),
      financial: await this.extractFinancialProfile(identity, query),
      governance: {} as any,
      risk: await this.extractRiskProfile(identity, query),
      relationships: {} as any,
      timeline: {} as any,
      filings: await this.getRecentFilingSummary(identity.cik)
    };

    return knowledge;
  }

  private async getCompanyIdentity(companyEntity: any): Promise<CompanyIdentity> {
    // Try to resolve company to CIK if not provided
    let cik = companyEntity.cik;
    
    if (!cik) {
      cik = await this.resolveTicker(companyEntity.ticker || companyEntity.name);
    }

    // Get detailed company info from SEC API
    const companyData = await this.fetchCompanySubmissions(cik);
    
    return {
      cik,
      name: companyData.name || companyEntity.name,
      ticker: companyData.ticker || companyEntity.ticker,
      lei: companyData.lei,
      industry: {
        sic: companyData.sic || '',
        sicDescription: companyData.sicDescription || '',
        sector: this.getSectorFromSIC(companyData.sic),
        industry: companyData.sicDescription || ''
      },
      headquarters: {
        address: companyData.addresses?.business?.street1,
        city: companyData.addresses?.business?.city,
        state: companyData.addresses?.business?.stateOrCountry,
        country: companyData.addresses?.business?.stateOrCountryDescription
      },
      incorporation: {
        state: companyData.stateOfIncorporation,
        date: companyData.stateOfIncorporationDescription
      } as any,
      status: 'active',
      aliases: companyEntity.variations || [companyEntity.name]
    };
  }

  private async extractBusinessProfile(
    identity: CompanyIdentity, 
    query: UniversalQuery
  ): Promise<BusinessProfile> {
    
    // For business-focused queries, we need to extract from 10-K Item 1
    if (query.scope.dataTypes.includes('business_description')) {
      const latest10K = await this.getLatest10K(identity.cik);
      if (latest10K) {
        const businessDescription = await this.extractBusinessDescriptionFrom10K(latest10K);
        
        return {
          description: businessDescription,
          segments: await this.extractBusinessSegments(latest10K),
          products: await this.extractProducts(latest10K),
          services: await this.extractServices(latest10K),
          markets: await this.extractMarkets(latest10K),
          strategy: await this.extractStrategy(latest10K),
          competitive_position: {} as any,
          key_strengths: [],
          growth_drivers: []
        };
      }
    }

    // Fallback to basic industry description
    return {
      description: `${identity.name} operates in the ${identity.industry.sicDescription} industry.`,
      segments: [],
      products: [],
      services: [],
      markets: [],
      strategy: [],
      competitive_position: {} as any,
      key_strengths: [],
      growth_drivers: []
    };
  }

  private async extractFinancialProfile(
    identity: CompanyIdentity, 
    query: UniversalQuery
  ): Promise<FinancialProfile> {
    
    // Get financial data from XBRL facts
    const facts = await this.getCompanyFacts(identity.cik);
    
    return {
      metrics: await this.extractLatestMetrics(facts),
      trends: await this.extractFinancialTrends(facts),
      ratios: await this.calculateFinancialRatios(facts),
      segments: [],
      guidance: [],
      accounting_policies: []
    };
  }

  private async extractRiskProfile(
    identity: CompanyIdentity, 
    query: UniversalQuery
  ): Promise<RiskProfile> {
    
    // Extract risk factors from latest 10-K
    if (query.scope.dataTypes.includes('risk_factors')) {
      const latest10K = await this.getLatest10K(identity.cik);
      if (latest10K) {
        const riskFactors = await this.extractRiskFactorsFrom10K(latest10K);
        
        return {
          risk_factors: riskFactors,
          risk_trends: [],
          material_litigation: [],
          regulatory_risks: [],
          operational_risks: [],
          financial_risks: []
        };
      }
    }

    return {
      risk_factors: [],
      risk_trends: [],
      material_litigation: [],
      regulatory_risks: [],
      operational_risks: [],
      financial_risks: []
    };
  }

  private async extractFilingKnowledge(
    accessionNumber: string, 
    query: UniversalQuery
  ): Promise<FilingKnowledge | null> {
    
    try {
      // Get filing metadata
      const metadata = await this.getFilingMetadata(accessionNumber);
      
      // Parse filing content based on query needs
      const content = await this.parseFilingContent(accessionNumber, query);
      
      return {
        metadata,
        structure: {} as any,
        content,
        intelligence: {} as any,
        relationships: {} as any,
        changes: []
      };
      
    } catch (error) {
      console.error('Failed to extract filing knowledge:', error);
      return null;
    }
  }

  // SEC API integration methods
  private async resolveTicker(identifier: string): Promise<string> {
    // Map common tickers to CIKs
    const tickerMap: { [key: string]: string } = {
      'TESLA': '0001318605',
      'TSLA': '0001318605',
      'APPLE': '0000320193',
      'AAPL': '0000320193',
      'MICROSOFT': '0000789019',
      'MSFT': '0000789019',
      'GOOGLE': '0001652044',
      'GOOGL': '0001652044',
      'ALPHABET': '0001652044',
      'AMAZON': '0001018724',
      'AMZN': '0001018724',
      'META': '0001326801',
      'FACEBOOK': '0001326801'
    };

    const cik = tickerMap[identifier.toUpperCase()];
    if (cik) return cik;
    
    throw new Error(`Cannot resolve identifier: ${identifier}`);
  }

  private async fetchCompanySubmissions(cik: string): Promise<any> {
    const paddedCIK = cik.padStart(10, '0');
    const url = `https://data.sec.gov/submissions/CIK${paddedCIK}.json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.SEC_API_USER_AGENT || 'SEC Query App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status}`);
    }
    
    return await response.json();
  }

  private async getCompanyFacts(cik: string): Promise<any> {
    const paddedCIK = cik.padStart(10, '0');
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCIK}.json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.SEC_API_USER_AGENT || 'SEC Query App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SEC Facts API error: ${response.status}`);
    }
    
    return await response.json();
  }

  private async getLatest10K(cik: string): Promise<any> {
    const submissions = await this.fetchCompanySubmissions(cik);
    const filings = submissions.filings?.recent;
    
    if (!filings) return null;
    
    // Find most recent 10-K
    for (let i = 0; i < filings.form.length; i++) {
      if (filings.form[i] === '10-K') {
        return {
          accessionNumber: filings.accessionNumber[i],
          filingDate: filings.filingDate[i],
          primaryDocument: filings.primaryDocument[i]
        };
      }
    }
    
    return null;
  }

  private async getRecentFilingSummary(cik: string): Promise<any[]> {
    const submissions = await this.fetchCompanySubmissions(cik);
    const filings = submissions.filings?.recent;
    
    if (!filings) return [];
    
    const recentFilings = [];
    for (let i = 0; i < Math.min(5, filings.accessionNumber.length); i++) {
      recentFilings.push({
        accessionNumber: filings.accessionNumber[i],
        form: filings.form[i],
        filingDate: filings.filingDate[i],
        primaryDocument: filings.primaryDocument[i]
      });
    }
    
    return recentFilings;
  }

  // Content extraction methods - actual SEC filing parsing
  private async extractBusinessDescriptionFrom10K(filing: any): Promise<string> {
    try {
      const filingContent = await this.fetchFilingContent(filing.accessionNumber, filing.primaryDocument);
      return await this.parseBusinessSection(filingContent);
    } catch (error) {
      console.error('Failed to extract business description:', error);
      return `Business description extraction failed for ${filing.accessionNumber}`;
    }
  }

  private async extractBusinessSegments(filing: any): Promise<any[]> {
    // TODO: Implement segment extraction
    return [];
  }

  private async extractProducts(filing: any): Promise<any[]> {
    // TODO: Implement product extraction
    return [];
  }

  private async extractServices(filing: any): Promise<any[]> {
    // TODO: Implement service extraction
    return [];
  }

  private async extractMarkets(filing: any): Promise<any[]> {
    // TODO: Implement market extraction
    return [];
  }

  private async extractStrategy(filing: any): Promise<any[]> {
    // TODO: Implement strategy extraction
    return [];
  }

  private async extractRiskFactorsFrom10K(filing: any): Promise<any[]> {
    try {
      const filingContent = await this.fetchFilingContent(filing.accessionNumber, filing.primaryDocument);
      return await this.parseRiskFactors(filingContent);
    } catch (error) {
      console.error('Failed to extract risk factors:', error);
      return [];
    }
  }

  private async extractLatestMetrics(facts: any): Promise<any> {
    // Extract latest financial metrics from XBRL facts
    const usGaap = facts.facts?.['us-gaap'];
    if (!usGaap) return {};

    const metrics: any = {};
    
    // Revenue
    if (usGaap.Revenues || usGaap.Revenue) {
      const revenueData = usGaap.Revenues || usGaap.Revenue;
      const latestRevenue = this.getLatestValue(revenueData);
      if (latestRevenue) metrics.revenue = latestRevenue.val;
    }

    // Net Income
    if (usGaap.NetIncomeLoss) {
      const netIncomeData = usGaap.NetIncomeLoss;
      const latestNetIncome = this.getLatestValue(netIncomeData);
      if (latestNetIncome) metrics.net_income = latestNetIncome.val;
    }

    return metrics;
  }

  private async extractFinancialTrends(facts: any): Promise<any[]> {
    // TODO: Implement trend analysis
    return [];
  }

  private async calculateFinancialRatios(facts: any): Promise<any[]> {
    // TODO: Implement ratio calculations
    return [];
  }

  private getLatestValue(conceptData: any): any {
    if (!conceptData.units) return null;
    
    const units = Object.keys(conceptData.units)[0];
    if (!conceptData.units[units]) return null;
    
    return conceptData.units[units]
      .filter((item: any) => item.form === '10-K')
      .sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime())[0];
  }

  private async getFilingMetadata(accessionNumber: string): Promise<FilingMetadata> {
    // TODO: Implement filing metadata extraction
    return {} as FilingMetadata;
  }

  private async parseFilingContent(accessionNumber: string, query: UniversalQuery): Promise<FilingContent> {
    // TODO: Implement content parsing based on query needs
    return {};
  }

  private getSectorFromSIC(sic: string): string {
    if (!sic) return 'Unknown';
    
    const sicCode = parseInt(sic);
    if (sicCode >= 3700 && sicCode <= 3799) return 'Automotive';
    if (sicCode >= 7370 && sicCode <= 7379) return 'Technology';
    if (sicCode >= 2800 && sicCode <= 2899) return 'Chemicals';
    
    return 'Other';
  }

  private calculateKnowledgeConfidence(knowledgeSet: KnowledgeSet): number {
    // Calculate based on data availability and quality
    return 0.8; // Placeholder
  }

  private calculateKnowledgeCompleteness(knowledgeSet: KnowledgeSet, query: UniversalQuery): number {
    // Calculate based on query requirements vs available data
    return 0.7; // Placeholder
  }

  // SEC Filing Content Fetching and Parsing
  private async fetchFilingContent(accessionNumber: string, primaryDocument: string): Promise<string> {
    const cleanAccession = accessionNumber.replace(/-/g, '');
    const url = `https://www.sec.gov/Archives/edgar/data/${cleanAccession}/${accessionNumber}/${primaryDocument}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.SEC_API_USER_AGENT || 'SEC Query App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch filing content: ${response.status}`);
    }
    
    return await response.text();
  }

  private async parseBusinessSection(htmlContent: string): Promise<string> {
    // Parse HTML content to extract Item 1 - Business section
    try {
      // Look for Item 1 or Business section headers
      const businessSectionRegex = /(?:item\s*1\s*[.\-\s]*business|business\s*overview|our\s*business)(.*?)(?:item\s*1a|item\s*2|risk\s*factors)/is;
      const match = htmlContent.match(businessSectionRegex);
      
      if (match && match[1]) {
        let businessText = match[1];
        
        // Clean HTML tags and excessive whitespace
        businessText = businessText
          .replace(/<[^>]*>/g, ' ') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace HTML entities
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
          
        // Extract first substantial paragraph (usually contains main business description)
        const paragraphs = businessText.split(/\n\s*\n/).filter(p => p.length > 100);
        
        if (paragraphs.length > 0) {
          // Return first substantial paragraph with some context
          return paragraphs.slice(0, 3).join('\n\n').substring(0, 2000);
        }
        
        return businessText.substring(0, 1500);
      }
      
      // Fallback: Look for company description patterns
      const descriptionPatterns = [
        /we\s+(?:are|operate|provide|manufacture|develop)(.*?)(?:\.|we\s+also)/is,
        /the\s+company\s+(?:is|operates|provides)(.*?)(?:\.|the\s+company)/is,
        /(?:^|\.)\s*[A-Z][^.]*?(?:operates|provides|manufactures|develops|offers)[^.]*?\./gm
      ];
      
      for (const pattern of descriptionPatterns) {
        const match = htmlContent.match(pattern);
        if (match) {
          return this.cleanText(match[0]).substring(0, 1000);
        }
      }
      
      return 'Business description could not be extracted from filing content.';
      
    } catch (error) {
      console.error('Error parsing business section:', error);
      return 'Error parsing business section from filing.';
    }
  }

  private async parseRiskFactors(htmlContent: string): Promise<any[]> {
    try {
      // Look for Item 1A - Risk Factors section
      const riskSectionRegex = /(?:item\s*1a\s*[.\-\s]*risk\s*factors|risk\s*factors)(.*?)(?:item\s*1b|item\s*2|unresolved\s*staff\s*comments)/is;
      const match = htmlContent.match(riskSectionRegex);
      
      if (!match || !match[1]) {
        return [];
      }
      
      let riskContent = match[1];
      
      // Clean HTML and extract individual risk factors
      riskContent = this.cleanText(riskContent);
      
      // Split into individual risk factors (often separated by bullet points or headers)
      const riskFactors: any[] = [];
      
      // Look for common risk factor patterns
      const riskPatterns = [
        // Bullet points or numbered lists
        /(?:^|\n)\s*[•·\-\*]\s*([^\n]{50,})/gm,
        // Bold headers followed by descriptions
        /(?:^|\n)\s*([A-Z][^\n]{20,100})\s*[\n\r]\s*([^\n]{100,})/gm,
        // Paragraph starting with risk keywords
        /(?:^|\.)\s*([^.]*?(?:risk|uncertainty|challenge|threat|adverse|negative|decline|volatility)[^.]*?\.[^.]*?\.[^.]*?\.)/gim
      ];
      
      let factorCount = 0;
      for (const pattern of riskPatterns) {
        let match;
        while ((match = pattern.exec(riskContent)) !== null && factorCount < 10) {
          const riskText = match[1] || match[0];
          if (riskText.length > 50) {
            riskFactors.push({
              category: this.categorizeRiskFactor(riskText),
              description: riskText.substring(0, 500),
              severity: this.assessRiskSeverity(riskText),
              likelihood: 'unknown',
              trend: 'unknown'
            });
            factorCount++;
          }
        }
      }
      
      return riskFactors;
      
    } catch (error) {
      console.error('Error parsing risk factors:', error);
      return [];
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, ' ') // Remove numeric HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n') // Remove extra line breaks
      .trim();
  }

  private categorizeRiskFactor(riskText: string): string {
    const lowerText = riskText.toLowerCase();
    
    if (lowerText.includes('cyber') || lowerText.includes('data') || lowerText.includes('security')) {
      return 'Cybersecurity & Data Protection';
    }
    if (lowerText.includes('regulatory') || lowerText.includes('compliance') || lowerText.includes('legal')) {
      return 'Regulatory & Legal';
    }
    if (lowerText.includes('market') || lowerText.includes('competition') || lowerText.includes('customer')) {
      return 'Market & Competition';
    }
    if (lowerText.includes('financial') || lowerText.includes('credit') || lowerText.includes('liquidity')) {
      return 'Financial';
    }
    if (lowerText.includes('operational') || lowerText.includes('supply') || lowerText.includes('manufacturing')) {
      return 'Operational';
    }
    if (lowerText.includes('technology') || lowerText.includes('innovation') || lowerText.includes('intellectual')) {
      return 'Technology & IP';
    }
    if (lowerText.includes('human') || lowerText.includes('talent') || lowerText.includes('employee')) {
      return 'Human Capital';
    }
    if (lowerText.includes('environmental') || lowerText.includes('climate') || lowerText.includes('sustainability')) {
      return 'Environmental & Climate';
    }
    
    return 'General Business';
  }

  private assessRiskSeverity(riskText: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerText = riskText.toLowerCase();
    
    // Critical risk indicators
    if (lowerText.includes('material adverse') || lowerText.includes('significant harm') || 
        lowerText.includes('going concern') || lowerText.includes('bankruptcy')) {
      return 'critical';
    }
    
    // High risk indicators
    if (lowerText.includes('substantial') || lowerText.includes('significant') || 
        lowerText.includes('materially') || lowerText.includes('severe')) {
      return 'high';
    }
    
    // Medium risk indicators
    if (lowerText.includes('adverse') || lowerText.includes('negative') || 
        lowerText.includes('harm') || lowerText.includes('impact')) {
      return 'medium';
    }
    
    // Default to low
    return 'low';
  }
}