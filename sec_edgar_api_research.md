# SEC EDGAR API Research Summary

## Overview
The SEC provides official RESTful APIs through `data.sec.gov` that deliver JSON-formatted data without requiring authentication or API keys.

## Key API Endpoints

### 1. Company Submissions API
- **Endpoint**: `https://data.sec.gov/submissions/CIK##########.json`
- **Format**: 10-digit CIK with leading zeros
- **Content**: Company metadata, filing history, ticker symbols, exchanges
- **Example**: Apple Inc. (CIK: 0000320193)

### 2. Company Facts API
- **Endpoint**: `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`
- **Content**: All XBRL company concepts in single API call
- **Format**: Structured financial data from filings

### 3. Company Concept API
- **Endpoint**: `https://data.sec.gov/api/xbrl/companyconcept/CIK##########/us-gaap/[ConceptName].json`
- **Content**: Specific XBRL concept data across time periods
- **Example**: `AccountsPayableCurrent`, `Revenues`, `Assets`

### 4. Frames API
- **Endpoint**: `https://data.sec.gov/api/xbrl/frames/us-gaap/[ConceptName]/USD/[TimeFrame].json`
- **Content**: Aggregated fact data across all entities for specific time periods

## Data Coverage
- **Filing Types**: 10-Q, 10-K, 8-K, 20-F, 40-F, 6-K and variants
- **Data Formats**: JSON, XBRL
- **Taxonomies**: US-GAAP, IFRS-FULL, DEI, SRT
- **Update Frequency**: Real-time (submissions: <1s delay, XBRL: <1min delay)

## Rate Limiting & Compliance
- **Rate Limit**: 10 requests per second maximum
- **User-Agent**: Must provide proper identification
- **Fair Access**: SEC reserves right to block excessive requests
- **No Authentication**: APIs are publicly accessible

## CIK Format Rules
- **API Calls**: Use 10-digit CIK with leading zeros (e.g., 0000320193)
- **Search**: Remove leading zeros (e.g., 320193)
- **Uniqueness**: CIK numbers are unique and not recycled

## JSON Data Structure Example
```json
{
  "cik": "320193",
  "entityType": "operating",
  "sic": "3571",
  "sicDescription": "Electronic Computers", 
  "name": "Apple Inc.",
  "tickers": ["AAPL"],
  "exchanges": ["Nasdaq"],
  "filings": {
    "recent": {
      "accessionNumber": [...],
      "filingDate": [...],
      "reportDate": [...],
      "form": [...],
      "size": [...],
      "isXBRL": [...],
      "primaryDocument": [...]
    }
  }
}
```

## Bulk Data Access
- **ZIP Files**: Nightly bulk downloads available
- **Update Schedule**: Approximately 3:00 AM daily
- **Content**: All JSON structures for APIs

## Technical Implementation Notes
- **Real-time Updates**: APIs updated as filings are disseminated
- **Processing Delays**: Minimal (submissions <1s, XBRL <1min)
- **Data Retention**: At least 1 year or 1,000 most recent filings
- **Format**: Compact columnar data arrays for efficiency

## API Usage Examples

### Get Apple's Company Information
```
GET https://data.sec.gov/submissions/CIK0000320193.json
```

### Get Apple's Financial Facts
```
GET https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json
```

### Get Apple's Revenue Data
```
GET https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/Revenues.json
```

## Implementation Considerations
1. **Rate Limiting**: Implement request queuing to stay under 10 req/sec
2. **Error Handling**: Handle 403 (rate limit) and 404 (not found) responses
3. **Caching**: Cache responses to reduce API calls
4. **User-Agent**: Set appropriate User-Agent header
5. **Data Validation**: Validate CIK format and API responses
6. **Bulk Processing**: Use bulk ZIP files for large-scale data processing

## Available Python Libraries
- `sec-edgar-api`: Lightweight unofficial wrapper
- `edgartools`: Comprehensive SEC EDGAR API access
- `sec-api`: Full-featured API with additional services
- `edgar`: Command-line and Python library access