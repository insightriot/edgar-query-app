import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeQuery } from '../lib/ai-query-processor';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  
  try {
    console.log('Debug: Starting analysis for:', query);
    console.log('Debug: OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
    
    const analysis = await analyzeQuery(query || "What was Tesla's 2024 revenue?");
    
    res.status(200).json({
      query: query || "What was Tesla's 2024 revenue?",
      analysis,
      env: {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        keyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'none'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}