import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    message: 'SEC EDGAR Query API is running'
  });
});

// Test endpoint
app.get('/api/v1/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Import and use MCP routes
import mcpRoutes from './routes/mcp-routes';
app.use('/api/v1/mcp', mcpRoutes);

// Enhanced query endpoint using Universal EDGAR Engine with MCP
app.post('/api/v1/queries', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({
      error: 'Query is required',
      statusCode: 400
    });
  }

  try {
    // Import and use the Universal EDGAR Engine
    const { UniversalEdgarEngine } = await import('../../lib/universal/universal-edgar-engine');
    const engine = new UniversalEdgarEngine();
    
    console.log(`🔍 Processing query: "${query}"`);
    const result = await engine.processQuery(query);
    
    res.json({
      success: true,
      data: {
        queryId: Date.now().toString(),
        status: 'completed',
        query,
        results: result
      }
    });
    
  } catch (error: any) {
    console.error('Query processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Query processing failed',
      details: error.message,
      statusCode: 500,
      fallback: {
        type: 'mcp_integration_ready',
        message: `Query: "${query}" - MCP integration is active but processing failed. Check server logs for details.`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404
  });
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message || 'Something went wrong',
    statusCode: 500
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 API test: http://localhost:${PORT}/api/v1/test`);
  console.log(`💡 Try POST to: http://localhost:${PORT}/api/v1/queries`);
});

export default app;