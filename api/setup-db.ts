import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/database';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic auth check (for security)
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.SETUP_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Read schema file
    const schemaPath = join(process.cwd(), 'lib', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    const results = [];
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await query(statement);
        results.push({ statement: statement.substring(0, 100) + '...', success: true });
      } catch (error) {
        results.push({ 
          statement: statement.substring(0, 100) + '...', 
          success: false, 
          error: error.message 
        });
      }
    }

    res.status(200).json({
      message: 'Database setup completed',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({
      error: 'Database setup failed',
      message: error.message
    });
  }
}