# SEC EDGAR Natural Language Query App

A modern web application that enables natural language querying of the SEC EDGAR database, making public company financial data accessible through conversational interfaces.

## Features

- **Natural Language Processing**: Ask questions in plain English about public companies and their financials
- **SEC EDGAR Integration**: Direct access to official SEC filing data via the data.sec.gov API
- **Real-time Data**: Up-to-date information with minimal processing delay
- **Smart Caching**: Optimized performance with multi-level caching strategy
- **Rate Limit Compliant**: Fully compliant with SEC API rate limits (10 requests/second)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Export Capabilities**: Export query results in various formats (CSV, PDF, JSON)

## Architecture

### Backend (Node.js + TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis for query and API response caching
- **NLP**: Custom natural language processing service
- **Rate Limiting**: Built-in rate limiting for SEC API compliance

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React hooks and context
- **Charts**: Chart.js for data visualization
- **Routing**: React Router for navigation

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd edgar_mcp
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database and Redis configuration
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Edit .env with your API URL
   ```

4. **Database setup**
   ```bash
   # Create PostgreSQL database
   createdb edgar_db
   
   # Run migrations (TypeORM will auto-create tables in development)
   cd backend
   npm run dev
   ```

5. **Start the services**
   ```bash
   # Terminal 1: Start Redis
   redis-server
   
   # Terminal 2: Start backend
   cd backend
   npm run dev
   
   # Terminal 3: Start frontend
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health

## API Endpoints

### Query Processing
- `POST /api/v1/queries` - Process natural language queries
- `GET /api/v1/queries/suggestions` - Get query suggestions
- `GET /api/v1/queries/examples` - Get example queries

### Company Data
- `GET /api/v1/companies/:cik` - Get company information
- `GET /api/v1/companies/:cik/filings` - Get company filings
- `GET /api/v1/companies/:cik/facts` - Get company XBRL facts
- `GET /api/v1/companies/:cik/concepts/:concept` - Get specific concept data
- `GET /api/v1/companies/search` - Search companies

### Filing Data
- `GET /api/v1/filings/search` - Search filings with filters
- `GET /api/v1/filings/:accession_number` - Get specific filing
- `GET /api/v1/filings/forms` - Get available filing forms

## Usage Examples

### Natural Language Queries

**Company Information**
- "Tell me about Apple Inc."
- "What is Tesla's business description?"
- "Find information about Microsoft"

**Financial Data**
- "What was Apple's revenue in 2023?"
- "Show me Google's profit margins"
- "Tesla's cash flow for the last quarter"

**Filing Search**
- "Find Apple's latest 10-K filing"
- "Show me Microsoft's recent 10-Q reports"
- "Netflix's 8-K filings from 2023"

**Comparisons**
- "Compare Apple and Microsoft revenue"
- "Google vs Amazon profit margins"
- "Tesla vs Ford quarterly earnings"

**Historical Analysis**
- "Apple's revenue growth over the last 5 years"
- "Microsoft's quarterly trends"
- "Amazon's profit history"

### API Usage

**Process a Query**
```bash
curl -X POST http://localhost:3000/api/v1/queries \
  -H "Content-Type: application/json" \
  -d '{"query": "What was Apple'\''s revenue in 2023?"}'
```

**Get Company Data**
```bash
curl http://localhost:3000/api/v1/companies/0000320193
```

**Search Filings**
```bash
curl "http://localhost:3000/api/v1/filings/search?company=0000320193&form=10-K"
```

## Configuration

### Environment Variables

**Backend (.env)**
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=edgar_db
REDIS_HOST=localhost
REDIS_PORT=6379
SEC_API_USER_AGENT=YourAppName/1.0 (your-email@example.com)
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=SEC EDGAR Query
```

## Data Sources

All data is sourced from the official SEC EDGAR database:
- **Base URL**: https://data.sec.gov
- **Documentation**: https://www.sec.gov/edgar/sec-api-documentation
- **Data Format**: JSON (REST API)
- **Update Frequency**: Real-time (< 1 minute delay)

## Supported Filing Types

- **10-K**: Annual reports
- **10-Q**: Quarterly reports
- **8-K**: Current reports
- **DEF 14A**: Proxy statements
- **20-F**: Foreign private issuers annual reports
- **6-K**: Foreign private issuers interim reports
- **Forms 3, 4, 5**: Insider trading reports

## Development

### Backend Development
```bash
cd backend
npm run dev     # Start development server
npm run build   # Build for production
npm start       # Start production server
```

### Frontend Development
```bash
cd frontend
npm run dev     # Start development server
npm run build   # Build for production
npm run preview # Preview production build
```

### Database Management
```bash
# TypeORM CLI commands
npm run typeorm migration:generate -- -n MigrationName
npm run typeorm migration:run
npm run typeorm migration:revert
```

## Testing

### Backend Testing
```bash
cd backend
npm test        # Run tests
npm run test:watch # Watch mode
npm run test:coverage # Coverage report
```

### Frontend Testing
```bash
cd frontend
npm test        # Run tests
npm run test:ui # Test UI
```

## Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment
1. Build frontend: `npm run build`
2. Build backend: `npm run build`
3. Set production environment variables
4. Start services with PM2 or similar process manager

## Performance Optimization

### Caching Strategy
- **Level 1**: Browser cache (5 minutes for queries)
- **Level 2**: Redis cache (1 hour for financial data)
- **Level 3**: Database query optimization
- **Level 4**: SEC API response caching (24 hours for historical data)

### Rate Limiting
- **SEC API**: 10 requests/second (compliant with SEC guidelines)
- **Application API**: 100 requests/15 minutes per IP
- **Query Processing**: 10 requests/minute per IP

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is provided for informational purposes only. The data presented is sourced from public SEC filings and is provided "as is" without warranty of any kind. Users should verify information independently and consult with qualified professionals for investment decisions.

This application is not affiliated with, endorsed by, or connected to the U.S. Securities and Exchange Commission. All SEC data is publicly available and accessed through official SEC APIs.

## Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Check the documentation
- Review the API documentation at `/api/v1/docs` (when available)

## Roadmap

- [ ] Advanced data visualization with interactive charts
- [ ] User authentication and saved queries
- [ ] Email alerts for new filings
- [ ] Advanced financial analysis tools
- [ ] Export to Excel with formatting
- [ ] Mobile application
- [ ] API rate limiting dashboard
- [ ] Advanced NLP with machine learning models