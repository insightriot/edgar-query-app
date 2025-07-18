import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ClockIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { QueryResult } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface QueryResultsProps {
  result: QueryResult;
}

const QueryResults: React.FC<QueryResultsProps> = ({ result }) => {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <LoadingSpinner className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (result.status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing...';
      default:
        return 'Pending';
    }
  };

  const renderResultContent = () => {
    if (result.status === 'failed') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Query Failed</h3>
              <p className="text-sm text-red-700 mt-1">
                {result.error || 'An unknown error occurred'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (result.status === 'processing') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <LoadingSpinner className="w-5 h-5 mr-2" />
            <span className="text-sm text-blue-700">Processing your query...</span>
          </div>
        </div>
      );
    }

    if (!result.results) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <p className="text-sm text-gray-600">No results available</p>
        </div>
      );
    }

    return renderResults(result.results);
  };

  const renderResults = (results: any) => {
    const { type } = results;

    switch (type) {
      case 'company_profile':
        return renderCompanyProfile(results);
      case 'financial_data':
        return renderFinancialData(results);
      case 'filing_search':
        return renderFilingResults(results);
      case 'company_comparison':
        return renderCompanyComparison(results);
      case 'historical_data':
        return renderHistoricalData(results);
      case 'suggestions':
        return renderSuggestions(results);
      default:
        return renderRawData(results);
    }
  };

  const renderCompanyProfile = (results: any) => {
    const { company, recent_filings } = results;

    return (
      <div className="space-y-6">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <BuildingOfficeIcon className="w-5 h-5 mr-2 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Company Profile</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">{company.name}</h4>
                <p className="text-sm text-gray-600">CIK: {company.cik}</p>
                {company.ticker && (
                  <p className="text-sm text-gray-600">Ticker: {company.ticker}</p>
                )}
              </div>
              <div>
                {company.industry && (
                  <p className="text-sm text-gray-600">Industry: {company.industry}</p>
                )}
                {company.exchange && (
                  <p className="text-sm text-gray-600">Exchange: {company.exchange}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {recent_filings && recent_filings.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Recent Filings</h3>
            </div>
            <div className="card-body">
              <div className="space-y-2">
                {recent_filings.slice(0, 5).map((filing: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <span className="font-medium text-gray-900">{filing.form}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        Filed: {new Date(filing.filingDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {filing.primaryDocDescription || filing.primaryDocument}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFinancialData = (results: any) => {
    const { metric, company, data } = results;

    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                {metric} - {company.name}
              </h3>
            </div>
            <button className="btn-outline">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
        <div className="card-body">
          {data && data.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.slice(0, 6).map((item: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-md">
                    <div className="text-sm text-gray-600">
                      {new Date(item.period).toLocaleDateString()}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      ${item.value?.toLocaleString() || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.form} • FY {item.fiscalYear}
                    </div>
                  </div>
                ))}
              </div>
              {data.length > 6 && (
                <div className="text-sm text-gray-600">
                  Showing 6 of {data.length} results
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No financial data available</p>
          )}
        </div>
      </div>
    );
  };

  const renderFilingResults = (results: any) => {
    const { company, filings } = results;

    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Filings - {company.name}
            </h3>
          </div>
        </div>
        <div className="card-body">
          {filings && filings.length > 0 ? (
            <div className="space-y-3">
              {filings.map((filing: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="font-medium text-gray-900">{filing.form}</div>
                    <div className="text-sm text-gray-600">
                      Filed: {new Date(filing.filingDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {filing.primaryDocDescription || filing.primaryDocument}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {filing.size && `${Math.round(filing.size / 1024)} KB`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No filings found</p>
          )}
        </div>
      </div>
    );
  };

  const renderCompanyComparison = (results: any) => {
    const { companies, metric } = results;

    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {metric} Comparison
            </h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {companies.map((companyData: any, index: number) => (
              <div key={index} className="space-y-4">
                <h4 className="font-medium text-gray-900">{companyData.company.name}</h4>
                <div className="space-y-2">
                  {companyData.revenue?.slice(0, 3).map((item: any, itemIndex: number) => (
                    <div key={itemIndex} className="flex justify-between items-center py-2 bg-gray-50 rounded px-3">
                      <span className="text-sm text-gray-600">
                        {new Date(item.period).toLocaleDateString()}
                      </span>
                      <span className="font-medium text-gray-900">
                        ${item.value?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderHistoricalData = (results: any) => {
    const { metric, company, data } = results;

    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {metric} History - {company.name}
            </h3>
          </div>
        </div>
        <div className="card-body">
          {data && data.length > 0 ? (
            <div className="space-y-2">
              {data.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <span className="font-medium text-gray-900">
                      {new Date(item.period).toLocaleDateString()}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      {item.form} • FY {item.fiscalYear}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    ${item.value?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No historical data available</p>
          )}
        </div>
      </div>
    );
  };

  const renderSuggestions = (results: any) => {
    const { message, suggestions } = results;

    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Suggestions</h3>
        </div>
        <div className="card-body">
          <p className="text-gray-600 mb-4">{message}</p>
          <div className="space-y-2">
            {suggestions.map((suggestion: string, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-gray-700">{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRawData = (results: any) => {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Raw Results</h3>
        </div>
        <div className="card-body">
          <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Query Status */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getStatusIcon()}
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">
                  {getStatusText()}
                </div>
                <div className="text-sm text-gray-600">
                  Query: "{result.query}"
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {result.executionTime && `${result.executionTime}ms`}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {renderResultContent()}
    </div>
  );
};

export default QueryResults;