import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { companyApi } from '../services/api';
import { CompanySearchResult, Company, Filing } from '../types';
import LoadingSpinner from './LoadingSpinner';

const CompanySearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyFilings, setCompanyFilings] = useState<Filing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await companyApi.searchCompanies(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCompanySelect = async (result: CompanySearchResult) => {
    setIsLoadingCompany(true);
    try {
      const companyData = await companyApi.getCompany(result.cik);
      setSelectedCompany(companyData.company);
      setCompanyFilings(companyData.recent_filings);
    } catch (error) {
      console.error('Failed to load company data:', error);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Company Search
        </h1>
        <p className="text-lg text-gray-600">
          Search for public companies and explore their SEC filings
        </p>
      </div>

      {/* Search Form */}
      <div className="card mb-8">
        <div className="card-body">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company name or ticker symbol..."
                className="input pl-10 pr-4 py-3 text-lg"
                disabled={isSearching}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="btn-primary"
              >
                {isSearching ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Searching...
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

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results ({searchResults.length})
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleCompanySelect(result)}
                  className="w-full text-left p-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{result.name}</div>
                      <div className="text-sm text-gray-600">
                        CIK: {result.cik} • Ticker: {result.ticker}
                      </div>
                    </div>
                    <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Company Details */}
      {isLoadingCompany && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner className="w-8 h-8 mr-3" />
              <span className="text-gray-600">Loading company information...</span>
            </div>
          </div>
        </div>
      )}

      {selectedCompany && !isLoadingCompany && (
        <div className="space-y-6">
          {/* Company Profile */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center">
                <BuildingOfficeIcon className="w-5 h-5 mr-2 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Company Profile</h2>
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedCompany.name}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="text-sm font-medium text-gray-500 w-20">CIK:</span>
                      <span className="text-sm text-gray-900">{selectedCompany.cik}</span>
                    </div>
                    {selectedCompany.ticker && (
                      <div className="flex">
                        <span className="text-sm font-medium text-gray-500 w-20">Ticker:</span>
                        <span className="text-sm text-gray-900">{selectedCompany.ticker}</span>
                      </div>
                    )}
                    {selectedCompany.sic && (
                      <div className="flex">
                        <span className="text-sm font-medium text-gray-500 w-20">SIC:</span>
                        <span className="text-sm text-gray-900">{selectedCompany.sic}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    {selectedCompany.industry && (
                      <div className="flex">
                        <span className="text-sm font-medium text-gray-500 w-20">Industry:</span>
                        <span className="text-sm text-gray-900">{selectedCompany.industry}</span>
                      </div>
                    )}
                    {selectedCompany.exchange && (
                      <div className="flex">
                        <span className="text-sm font-medium text-gray-500 w-20">Exchange:</span>
                        <span className="text-sm text-gray-900">{selectedCompany.exchange}</span>
                      </div>
                    )}
                    {selectedCompany.employees && (
                      <div className="flex">
                        <span className="text-sm font-medium text-gray-500 w-20">Employees:</span>
                        <span className="text-sm text-gray-900">{selectedCompany.employees.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Filings */}
          {companyFilings.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Recent Filings</h2>
              </div>
              <div className="card-body">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Form
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Filing Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Report Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Document
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {companyFilings.map((filing, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {filing.form}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(filing.filingDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {filing.reportDate ? new Date(filing.reportDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate">
                              {filing.primaryDocDescription || filing.primaryDocument}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {filing.size ? `${Math.round(filing.size / 1024)} KB` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results Message */}
      {searchResults.length === 0 && searchQuery && !isSearching && (
        <div className="card">
          <div className="card-body">
            <div className="text-center py-8">
              <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                No companies found matching "{searchQuery}". Try searching with a different term.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySearch;