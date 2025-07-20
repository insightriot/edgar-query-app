import React, { useState } from 'react';
import './index.css';

const API_BASE_URL = '/api';

function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Query failed:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process query',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  const formatResponse = (data: any) => {
    if (!data) return 'No response data available';
    
    // Check for Universal EDGAR Engine response first
    if (data.answer && data.answer.narrative) {
      return data.answer.narrative;
    }
    
    // Check for legacy results format
    if (data.results) {
      const results = data.results;
      
      // If we have an AI response, use that first!
      if (results.ai_response) {
        return results.ai_response;
      }

      // If we have a narrative from universal answer
      if (results.narrative) {
        return results.narrative;
      }

      // If we have a message field
      if (results.message) {
        return results.message;
      }
      
      switch (results.type) {
        case 'live_earnings_data':
          if (results.filing) {
            return `🔴 LIVE EARNINGS: ${results.company?.name || 'Company'} filed an 8-K on ${results.filing.filingDate} with latest financial results. View filing: ${results.documentUrl}`;
          }
          break;
          
        case 'live_recent_filings':
          if (results.filings && results.filings.length > 0) {
            const latest = results.filings[0];
            return `🔴 LIVE: ${results.company?.name || 'Company'}'s most recent filing is a ${latest.form} filed on ${latest.filingDate}. ${latest.primaryDocDescription || ''}`;
          }
          break;
          
        case 'live_financial_data':
          if (results.company && results.data && results.data.length > 0) {
            const company = results.company;
            const financialData = results.data[0];
            const value = financialData.value ? `$${(parseFloat(financialData.value) / 1000000000).toFixed(1)}B` : 'N/A';
            return `🔴 LIVE DATA: ${company.name}: ${results.metric} for ${financialData.fiscal_year} was ${value}`;
          }
          break;

        case 'live_company_profile':
          if (results.company) {
            const company = results.company;
            return `🔴 LIVE DATA: ${company.name} (CIK: ${company.cik}) - ${company.sicDescription || 'Public Company'}`;
          }
          break;
          
        case 'filing_list':
          return results.message || 'Filing list processed';
          
        case 'financial_data':
          if (results.company && results.data && results.data.length > 0) {
            const company = results.company;
            const financialData = results.data[0];
            const value = financialData.value ? `$${(parseFloat(financialData.value) / 1000000000).toFixed(1)}B` : 'N/A';
            return `${company.name} (${company.ticker}): ${results.metric} for ${financialData.fiscal_year} was ${value}`;
          }
          break;
          
        case 'company_profile':
          if (results.company) {
            const company = results.company;
            return `${company.name} (${company.ticker}) is in the ${company.industry} industry with ${company.employees?.toLocaleString()} employees. ${company.description?.substring(0, 150)}...`;
          }
          break;
          
        case 'filing_search':
          if (results.company && results.filings) {
            return `Found ${results.filings.length} filings for ${results.company.name}`;
          }
          break;

        case 'ai_response':
          return results.message || 'AI processing completed';
          
        default:
          return results.message || 'Query processed - no detailed response available';
      }
    }
    
    return 'Unable to format response - no recognized data structure';
  };

  const examples = [
    {
      category: 'Company Information',
      queries: [
        'Tell me about Apple Inc.',
        'What is Tesla\'s business?',
        'Find information about Microsoft',
      ],
    },
    {
      category: 'Financial Data',
      queries: [
        'What was Apple\'s revenue in 2023?',
        'Show me Google\'s profit margins',
        'Tesla\'s quarterly earnings',
      ],
    },
    {
      category: 'SEC Filings',
      queries: [
        'Find Apple\'s latest 10-K filing',
        'Show me Microsoft\'s recent reports',
        'Netflix\'s 8-K filings',
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">SEC EDGAR Query</div>
            <nav className="nav">
              <a href="#" className="nav-link active">
                Query
              </a>
              <a href="#" className="nav-link">
                Companies
              </a>
              <a href="#" className="nav-link">
                About
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Title */}
          <h1 className="title">Query SEC EDGAR Database</h1>
          <p className="subtitle">
            Ask natural language questions about public companies and their filings
          </p>

          {/* Query Form */}
          <div className="card">
            <div className="card-header">Ask a Question</div>
            <div className="card-body">
              <form onSubmit={handleSubmit} className="query-form">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., What was Apple's revenue in 2023?"
                  className="query-input"
                  disabled={isLoading}
                />
                <div className="form-actions">
                  <span className="form-hint">
                    Try natural language queries about public companies
                  </span>
                  <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="btn btn-primary"
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner"></span>
                        Processing...
                      </>
                    ) : (
                      'Search'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="card">
              <div className="card-header">Answer</div>
              <div className="card-body">
                <div className="result-content">
                  {result.success ? (
                    <div>
                      <div className="result-message" style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                        <div dangerouslySetInnerHTML={{ __html: formatResponse(result.data).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">$1</a>') }} />
                      </div>
                      
                      {/* Source Links Section */}
                      {(result.data.answer?.citations?.length > 0 || result.data.results?.filings?.length > 0) && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '14px', fontWeight: '600', color: '#495057' }}>📚 Sources & References</h4>
                          
                          {/* Universal EDGAR Engine Citations */}
                          {result.data.answer?.citations?.map((citation: any, index: number) => (
                            <div key={index} style={{ marginBottom: '0.5rem', fontSize: '13px' }}>
                              {citation.url ? (
                                <a href={citation.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>
                                  📄 {citation.source.name}
                                </a>
                              ) : (
                                <span>📄 {citation.source.name}</span>
                              )}
                              {citation.filing && (
                                <span style={{ color: '#6c757d', marginLeft: '0.5rem' }}>
                                  (Accession: {citation.filing.accessionNumber})
                                </span>
                              )}
                            </div>
                          ))}
                          
                          {/* Simple Filing Handler Results */}
                          {result.data.results?.filings?.map((filing: any, index: number) => (
                            <div key={index} style={{ marginBottom: '0.5rem', fontSize: '13px' }}>
                              {filing.url ? (
                                <a href={filing.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>
                                  📄 {filing.form} - {filing.filingDate}
                                </a>
                              ) : (
                                <span>📄 {filing.form} - {filing.filingDate}</span>
                              )}
                              <span style={{ color: '#6c757d', marginLeft: '0.5rem' }}>
                                (Accession: {filing.accessionNumber})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <details style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
                        <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Technical Details</summary>
                        <div className="result-message">
                          <strong>Query:</strong> "{result.data.query}"
                        </div>
                        <div className="result-message">
                          <strong>Status:</strong> {result.data.status}
                        </div>
                        <div className="result-message">
                          <strong>Query ID:</strong> {result.data.queryId}
                        </div>
                        {result.data.answer && result.data.answer.assessment && (
                          <div className="result-message">
                            <strong>Confidence:</strong> {(result.data.answer.assessment.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                      </details>
                    </div>
                  ) : (
                    <div>
                      <div className="result-status error">
                        <span>❌</span>
                        <span>Query failed</span>
                      </div>
                      <div className="result-message">
                        <strong>Error:</strong> {result.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Examples */}
          {!result && (
            <div className="card">
              <div className="card-header">Example Queries</div>
              <div className="card-body">
                {examples.map((category, categoryIndex) => (
                  <div key={categoryIndex} style={{ marginBottom: '1.5rem' }}>
                    <h3 className="example-category">{category.category}</h3>
                    <div className="examples">
                      {category.queries.map((exampleQuery, exampleIndex) => (
                        <div
                          key={exampleIndex}
                          className="example"
                          onClick={() => handleExampleClick(exampleQuery)}
                        >
                          <div className="example-query">"{exampleQuery}"</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="card">
            <div className="card-header">System Status</div>
            <div className="card-body">
              <div className="result-status success">
                <span>🟢</span>
                <span>
                  Backend API: Connected (
                  <a href="http://localhost:3000/health" target="_blank" rel="noopener noreferrer">
                    Test Health
                  </a>
                  )
                </span>
              </div>
              <div className="result-message">
                <strong>Demo Mode:</strong> Currently running with test responses.
                Connect PostgreSQL and Redis for full SEC EDGAR integration.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;