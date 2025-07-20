// Universal EDGAR Intelligence - Core Types

// ============= QUERY TYPES =============

export interface UniversalQuery {
  originalQuery: string;
  entities: EntitySet;
  intent: QueryIntent;
  scope: QueryScope;
  constraints: QueryConstraints;
  confidence: number;
  complexity: 'simple' | 'compound' | 'analytical' | 'research';
}

export interface EntitySet {
  companies: CompanyEntity[];
  people: PersonEntity[];
  concepts: ConceptEntity[];
  timeRanges: TimeRange[];
  amounts: FinancialAmount[];
  locations: LocationEntity[];
  metrics: MetricEntity[];
  filingTypes: FilingTypeEntity[];
}

export interface CompanyEntity {
  name: string;
  ticker?: string;
  cik?: string;
  variations: string[]; // ["Tesla", "TSLA", "Tesla Inc", "Tesla Motors"]
  confidence: number;
  context: string; // How it was mentioned in query
}

export interface PersonEntity {
  name: string;
  role?: string; // "CEO", "CFO", etc.
  company?: string;
  confidence: number;
}

export interface ConceptEntity {
  concept: string;
  category: 'business' | 'financial' | 'risk' | 'regulatory' | 'operational';
  variations: string[];
  confidence: number;
}

export interface TimeRange {
  start?: Date;
  end?: Date;
  period?: 'current' | 'latest' | 'annual' | 'quarterly';
  description: string; // "last 3 years", "since IPO", "Q1 2024"
  confidence: number;
}

export interface FinancialAmount {
  value?: number;
  currency: string;
  unit: 'thousands' | 'millions' | 'billions' | 'actual';
  comparison?: 'greater' | 'less' | 'equal' | 'between';
  confidence: number;
}

export interface LocationEntity {
  location: string;
  type: 'country' | 'state' | 'city' | 'region';
  confidence: number;
}

export interface MetricEntity {
  metric: string;
  category: 'revenue' | 'profitability' | 'efficiency' | 'liquidity' | 'leverage' | 'growth';
  standardName: string; // Normalized metric name
  confidence: number;
}

export interface FilingTypeEntity {
  formType: string;
  description: string;
  category: 'periodic' | 'proxy' | 'insider' | 'registration' | 'other';
  confidence: number;
}

// ============= INTENT TYPES =============

export interface QueryIntent {
  primary: PrimaryIntent;
  secondary: SecondaryIntent[];
  requiresAnalysis: boolean;
  requiresComparison: boolean;
  requiresHistorical: boolean;
}

export type PrimaryIntent = 
  | 'business_overview'      // "What does Tesla do?"
  | 'financial_metrics'      // "What is Apple's revenue?"
  | 'comparative_analysis'   // "Compare Google vs Meta"
  | 'trend_analysis'         // "How has Amazon's profit changed?"
  | 'content_search'         // "Which companies mention AI?"
  | 'filing_lookup'          // "Show me Tesla's latest 10-K"
  | 'risk_analysis'          // "What are Tesla's main risks?"
  | 'regulatory_analysis'    // "How do new regulations affect banks?"
  | 'market_analysis'        // "Which tech companies went public in 2023?"
  | 'relationship_analysis'  // "Who are Apple's competitors?"
  | 'pattern_analysis'       // "How often do companies restate earnings?"
  | 'predictive_analysis'    // "Which companies might face bankruptcy?"
  | 'meta_analysis';         // "How many companies are in the database?"

export type SecondaryIntent =
  | 'geographic_focus'
  | 'industry_focus'
  | 'size_focus'
  | 'time_series'
  | 'benchmarking'
  | 'correlation'
  | 'causation'
  | 'ranking'
  | 'aggregation'
  | 'summarization';

// ============= SCOPE TYPES =============

export interface QueryScope {
  dataTypes: DataType[];
  granularity: 'summary' | 'detailed' | 'comprehensive';
  perspective: 'factual' | 'analytical' | 'comparative' | 'predictive';
  breadth: 'single_company' | 'industry' | 'market_wide' | 'cross_industry';
  depth: 'surface' | 'moderate' | 'deep' | 'exhaustive';
}

export type DataType = 
  | 'company_profile'
  | 'financial_statements'
  | 'filing_content'
  | 'risk_factors'
  | 'business_description'
  | 'management_discussion'
  | 'legal_proceedings'
  | 'corporate_governance'
  | 'insider_transactions'
  | 'market_data'
  | 'regulatory_context'
  | 'industry_context'
  | 'peer_data'
  | 'historical_events'
  | 'forward_guidance';

export interface QueryConstraints {
  timebound: boolean;
  minimumConfidence: number;
  requiredSources: string[];
  excludeEstimates: boolean;
  includeForwardLooking: boolean;
  maxAge: number; // Days
  requireOfficialFilings: boolean;
}

// ============= KNOWLEDGE TYPES =============

export interface KnowledgeSet {
  companies: CompanyKnowledge[];
  filings: FilingKnowledge[];
  relationships: RelationshipKnowledge[];
  industry: IndustryKnowledge;
  market: MarketKnowledge;
  sources: DataSource[];
  confidence: number;
  completeness: number;
}

export interface CompanyKnowledge {
  identity: CompanyIdentity;
  business: BusinessProfile;
  financial: FinancialProfile;
  governance: GovernanceProfile;
  risk: RiskProfile;
  relationships: CompanyRelationships;
  timeline: CompanyTimeline;
  filings: FilingSummary[];
}

export interface CompanyIdentity {
  cik: string;
  name: string;
  ticker?: string;
  lei?: string;
  industry: IndustryClassification;
  headquarters: Location;
  incorporation: IncorporationInfo;
  status: 'active' | 'inactive' | 'merged' | 'acquired';
  aliases: string[];
}

export interface BusinessProfile {
  description: string;
  segments: BusinessSegment[];
  products: Product[];
  services: Service[];
  markets: Market[];
  strategy: StrategicTheme[];
  competitive_position: CompetitivePosition;
  key_strengths: string[];
  growth_drivers: string[];
}

export interface FinancialProfile {
  metrics: FinancialMetrics;
  trends: FinancialTrend[];
  ratios: FinancialRatio[];
  segments: SegmentFinancials[];
  guidance: ForwardGuidance[];
  accounting_policies: AccountingPolicy[];
}

export interface RiskProfile {
  risk_factors: RiskFactor[];
  risk_trends: RiskTrend[];
  material_litigation: Litigation[];
  regulatory_risks: RegulatoryRisk[];
  operational_risks: OperationalRisk[];
  financial_risks: FinancialRisk[];
}

export interface FilingKnowledge {
  metadata: FilingMetadata;
  structure: FilingStructure;
  content: FilingContent;
  intelligence: FilingIntelligence;
  relationships: FilingRelationships;
  changes: FilingChange[];
}

export interface FilingMetadata {
  accessionNumber: string;
  formType: string;
  filingDate: Date;
  reportingPeriod: DateRange;
  company: CompanyIdentity;
  size: number;
  items: string[];
  amendments: Amendment[];
}

export interface FilingContent {
  business_description?: string;
  risk_factors?: RiskFactor[];
  financial_statements?: FinancialStatement[];
  management_discussion?: string;
  legal_proceedings?: LegalProceeding[];
  exhibits?: Exhibit[];
  full_text?: string;
  structured_data?: any;
}

// ============= ANSWER TYPES =============

export interface UniversalAnswer {
  narrative: string;
  data: AnswerData;
  citations: Citation[];
  assessment: AnswerAssessment;
  followUp: FollowUpSuggestions;
  metadata: AnswerMetadata;
}

export interface AnswerData {
  tables?: Table[];
  charts?: ChartConfig[];
  timelines?: Timeline[];
  comparisons?: Comparison[];
  lists?: List[];
  summaries?: Summary[];
}

export interface Citation {
  source: DataSource;
  filing?: FilingReference;
  content?: string;
  url?: string;
  confidence: number;
  relevance: number;
}

export interface DataSource {
  type: 'sec_filing' | 'sec_api' | 'calculated' | 'aggregated' | 'industry_data';
  name: string;
  timestamp: Date;
  reliability: number;
  isOfficial: boolean;
}

export interface AnswerAssessment {
  confidence: number;
  completeness: number;
  limitations: string[];
  assumptions: string[];
  dataFreshness: DataFreshness;
  bias_risks: string[];
}

export interface DataFreshness {
  overall_age_days: number;
  oldest_data_date: Date;
  newest_data_date: Date;
  has_realtime_data: boolean;
  coverage_gaps: CoverageGap[];
}

// ============= UTILITY TYPES =============

export interface DateRange {
  start: Date;
  end: Date;
  description?: string;
}

export interface Location {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: [number, number];
}

export interface IndustryClassification {
  sic: string;
  sicDescription: string;
  naics?: string;
  naicsDescription?: string;
  sector: string;
  industry: string;
}

export interface Table {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  source: string;
  notes?: string[];
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  title: string;
  data: any;
  labels: string[];
  source: string;
}

// Add more specific types as needed...
export interface BusinessSegment {
  name: string;
  description: string;
  revenue?: number;
  profit?: number;
  assets?: number;
  percentage_of_total?: number;
}

export interface RiskFactor {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'remote' | 'possible' | 'likely' | 'certain';
  trend: 'increasing' | 'stable' | 'decreasing';
  first_mentioned?: Date;
  evolution?: string;
}

export interface FinancialMetrics {
  revenue?: number;
  net_income?: number;
  total_assets?: number;
  total_equity?: number;
  cash?: number;
  debt?: number;
  operating_cash_flow?: number;
  free_cash_flow?: number;
  period: DateRange;
  currency: string;
}

export interface FilingReference {
  accessionNumber: string;
  formType: string;
  filingDate: Date;
  section?: string;
  page?: number;
  item?: string;
}

export interface CoverageGap {
  area: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

export interface FollowUpSuggestions {
  suggested_queries: string[];
  related_topics: string[];
  deeper_analysis: string[];
  comparison_opportunities: string[];
}

export interface AnswerMetadata {
  queryId: string;
  timestamp: Date;
  processingTimeMs: number;
  sources: DataSource[];
  complexity: 'simple' | 'compound' | 'analytical' | 'research';
  confidence: number;
}