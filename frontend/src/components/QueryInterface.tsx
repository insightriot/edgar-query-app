import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';
import { queryApi } from '../services/api';
import type { QueryResult, QuerySuggestion } from '../types';
import QueryResults from './QueryResults';
import LoadingSpinner from './LoadingSpinner';

const QueryInterface: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [examples, setExamples] = useState<QuerySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Load example queries on component mount
    loadExamples();
  }, []);

  const loadExamples = async () => {
    try {
      const exampleData = await queryApi.getExamples();
      setExamples(exampleData);
    } catch (error) {
      console.error('Failed to load examples:', error);
    }
  };

  const handleQueryChange = async (value: string) => {
    setQuery(value);
    
    // Get suggestions for queries with more than 2 characters
    if (value.length > 2) {
      try {
        const suggestionData = await queryApi.getSuggestions(value);
        setSuggestions(suggestionData);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to get suggestions:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      const queryResult = await queryApi.processQuery(query);
      setResult(queryResult);
    } catch (error) {
      console.error('Query failed:', error);
      setResult({
        queryId: Date.now().toString(),
        status: 'failed',
        query,
        error: 'Failed to process query. Please try again.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    setShowSuggestions(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Query SEC EDGAR Database
        </h1>
        <p className="text-lg text-gray-600">
          Ask natural language questions about public companies and their filings
        </p>
      </div>

      {/* Query Input */}
      <div className="card mb-8">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="e.g., What was Apple's revenue in 2023?"
                  className="textarea pl-10 pr-4 py-3 min-h-[100px] text-lg"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <SparklesIcon className="inline w-4 h-4 mr-2 text-yellow-500" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Try natural language queries like "Show me Tesla's quarterly earnings"
              </div>
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="btn-primary"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Example Queries */}
      {!result && examples.length > 0 && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Example Queries</h2>
          </div>
          <div className="card-body">
            <div className="space-y-6">
              {examples.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {category.category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {category.queries.map((example, exampleIndex) => (
                      <button
                        key={exampleIndex}
                        onClick={() => handleExampleClick(example)}
                        className="text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Query Results */}
      {result && (
        <QueryResults result={result} />
      )}

      {/* Recent Queries */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <ClockIcon className="w-5 h-5 mr-2 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Queries</h2>
          </div>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray-500">
            Query history will appear here (not implemented yet)
          </p>
        </div>
      </div>
    </div>
  );
};

export default QueryInterface;