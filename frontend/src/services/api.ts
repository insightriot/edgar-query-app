import axios from 'axios';
import type { ApiResponse, QueryResult, Company, Filing, QuerySuggestion, CompanySearchResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const queryApi = {
  // Process a natural language query
  processQuery: async (query: string, context?: any): Promise<QueryResult> => {
    const response = await api.post<ApiResponse<QueryResult>>('/queries', {
      query,
      context,
    });
    return response.data.data;
  },

  // Get query suggestions
  getSuggestions: async (partialQuery: string): Promise<string[]> => {
    const response = await api.get<ApiResponse<{ suggestions: string[] }>>(
      `/queries/suggestions?q=${encodeURIComponent(partialQuery)}`
    );
    return response.data.data.suggestions;
  },

  // Get example queries
  getExamples: async (): Promise<QuerySuggestion[]> => {
    const response = await api.get<ApiResponse<QuerySuggestion[]>>('/queries/examples');
    return response.data.data;
  },
};

export const companyApi = {
  // Get company by CIK
  getCompany: async (cik: string): Promise<{ company: Company; recent_filings: Filing[] }> => {
    const response = await api.get<ApiResponse<{ company: Company; recent_filings: Filing[] }>>(
      `/companies/${cik}`
    );
    return response.data.data;
  },

  // Get company filings
  getFilings: async (cik: string, limit?: number, form?: string): Promise<Filing[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (form) params.append('form', form);
    
    const response = await api.get<ApiResponse<{ filings: Filing[] }>>(
      `/companies/${cik}/filings?${params.toString()}`
    );
    return response.data.data.filings;
  },

  // Get company facts
  getCompanyFacts: async (cik: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/companies/${cik}/facts`);
    return response.data.data;
  },

  // Get specific concept data
  getConceptData: async (cik: string, concept: string, taxonomy = 'us-gaap'): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(
      `/companies/${cik}/concepts/${concept}?taxonomy=${taxonomy}`
    );
    return response.data.data;
  },

  // Search companies
  searchCompanies: async (query: string): Promise<CompanySearchResult[]> => {
    const response = await api.get<ApiResponse<{ results: CompanySearchResult[] }>>(
      `/companies/search?q=${encodeURIComponent(query)}`
    );
    return response.data.data.results;
  },
};

export const filingApi = {
  // Search filings
  searchFilings: async (filters: {
    company?: string;
    form?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    page?: number;
  }): Promise<{ filings: Filing[]; pagination: any }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });

    const response = await api.get<ApiResponse<{ filings: Filing[]; pagination: any }>>(
      `/filings/search?${params.toString()}`
    );
    return response.data.data;
  },

  // Get filing by accession number
  getFiling: async (accessionNumber: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/filings/${accessionNumber}`);
    return response.data.data;
  },

  // Get available filing forms
  getFilingForms: async (): Promise<Array<{ form: string; description: string; frequency: string }>> => {
    const response = await api.get<ApiResponse<{ forms: Array<{ form: string; description: string; frequency: string }> }>>(
      '/filings/forms'
    );
    return response.data.data.forms;
  },
};

export default api;