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
              <div className="card-header">Results</div>
              <div className="card-body">
                {result.success ? (
                  <div className="result-status success">
                    <span>✅</span>
                    <span>Query processed successfully</span>
                  </div>
                ) : (
                  <div className="result-status error">
                    <span>❌</span>
                    <span>Query failed</span>
                  </div>
                )}
                <div className="result-content">
                  {result.success ? (
                    <div>
                      <div className="result-message">
                        <strong>Query:</strong> "{result.data.query}"
                      </div>
                      <div className="result-message">
                        <strong>Response:</strong> {result.data.results.message}
                      </div>
                      <div className="result-message">
                        <strong>Status:</strong> {result.data.status}
                      </div>
                      <div className="result-message">
                        <strong>Query ID:</strong> {result.data.queryId}
                      </div>
                    </div>
                  ) : (
                    <div className="result-message">
                      <strong>Error:</strong> {result.error}
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