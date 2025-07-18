import React from 'react';
import { 
  MagnifyingGlassIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  ClockIcon,
  ShieldCheckIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const About: React.FC = () => {
  const features = [
    {
      icon: MagnifyingGlassIcon,
      title: 'Natural Language Queries',
      description: 'Ask questions in plain English about public companies, their financials, and SEC filings.'
    },
    {
      icon: ChartBarIcon,
      title: 'Financial Data Analysis',
      description: 'Access revenue, profit, balance sheet, and cash flow data from SEC EDGAR filings.'
    },
    {
      icon: DocumentTextIcon,
      title: 'SEC Filing Search',
      description: 'Search and browse 10-K, 10-Q, 8-K, and other SEC filings with advanced filtering.'
    },
    {
      icon: ClockIcon,
      title: 'Real-time Data',
      description: 'Get up-to-date information directly from the SEC EDGAR database.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Rate Limit Compliant',
      description: 'Fully compliant with SEC API rate limits and usage guidelines.'
    },
    {
      icon: GlobeAltIcon,
      title: 'Public Data Access',
      description: 'Access to public company data with no registration or API keys required.'
    }
  ];

  const examples = [
    "What was Apple's revenue in 2023?",
    "Show me Tesla's latest 10-K filing",
    "Compare Google and Microsoft profit margins",
    "Find Netflix's quarterly earnings trends",
    "What are Amazon's biggest risk factors?"
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          About SEC EDGAR Query
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A natural language interface for querying the SEC EDGAR database, 
          making public company financial data accessible to everyone.
        </p>
      </div>

      {/* What is SEC EDGAR */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">What is SEC EDGAR?</h2>
        </div>
        <div className="card-body">
          <p className="text-gray-700 mb-4">
            The SEC's Electronic Data Gathering, Analysis, and Retrieval (EDGAR) system is a comprehensive database 
            of corporate filings submitted to the U.S. Securities and Exchange Commission. It contains financial 
            statements, annual reports, quarterly reports, and other regulatory filings from public companies.
          </p>
          <p className="text-gray-700">
            Our application provides a natural language interface to this wealth of information, allowing users to 
            ask questions in plain English rather than navigating complex database queries or parsing dense regulatory documents.
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">Key Features</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-start space-x-3">
                  <Icon className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* How to Use */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">How to Use</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ask a Question</h3>
                <p className="text-sm text-gray-600">
                  Type your question in natural language. You can ask about financial data, company information, 
                  or SEC filings.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Get Results</h3>
                <p className="text-sm text-gray-600">
                  Our AI processes your query and retrieves relevant data from the SEC EDGAR database.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Explore & Export</h3>
                <p className="text-sm text-gray-600">
                  View the results in an easy-to-read format and export data for further analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Example Queries */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">Example Queries</h2>
        </div>
        <div className="card-body">
          <p className="text-gray-700 mb-4">
            Here are some examples of the types of questions you can ask:
          </p>
          <div className="space-y-2">
            {examples.map((example, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-md">
                <span className="text-sm text-gray-700">"{example}"</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">Data Sources</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">SEC EDGAR Database</h3>
              <p className="text-sm text-gray-600">
                All data is sourced directly from the official SEC EDGAR database at data.sec.gov. 
                This ensures accuracy and compliance with SEC regulations.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Filing Types Supported</h3>
              <p className="text-sm text-gray-600">
                We support all major filing types including 10-K (annual reports), 10-Q (quarterly reports), 
                8-K (current reports), DEF 14A (proxy statements), and many others.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Data Freshness</h3>
              <p className="text-sm text-gray-600">
                Data is updated in real-time as new filings are submitted to the SEC. 
                Our system typically reflects new filings within minutes of their availability.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">Disclaimer</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray-700 mb-4">
            This application is provided for informational purposes only. The data presented is sourced from 
            public SEC filings and is provided "as is" without warranty of any kind. Users should verify 
            information independently and consult with qualified professionals for investment decisions.
          </p>
          <p className="text-sm text-gray-700">
            This application is not affiliated with, endorsed by, or connected to the U.S. Securities and 
            Exchange Commission. All SEC data is publicly available and accessed through official SEC APIs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;