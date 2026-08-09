import { Request, Response, NextFunction } from 'express';

/**
 * POST /api/analyze
 *
 * Proxies to Yash's FastAPI service when FASTAPI_URL is configured and
 * falls back to a clearly marked mock response while that endpoint is unavailable.
 *
 * Expected request body: { text: string }
 * Expected response shape matches Yash's planned output:
 *   { category, sentiment, theme, pain_point, priority, recommendation }
 */
export async function analyzeFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { text } = req.body;
    let mockAnalysis;

    // Default mock response — matches Yash's planned FastAPI output shape
    const defaultMockAnalysis = {
      category: 'Food',
      sentiment: 'Positive',
      theme: 'Quality',
      pain_point: 'None identified',
      priority: 'Medium',
      recommendation:
        'No immediate action required. Continue monitoring for trends.',
    };

    try {
      const fastApiUrl = process.env.FASTAPI_URL?.trim();
      if (!fastApiUrl) {
        throw new Error('FASTAPI_URL is not configured');
      }

      const response = await fetch(`${fastApiUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error(`FastAPI responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      res.json({ success: true, data: result, mock: false });
      return;
    } catch (fetchError) {
      console.warn(
        `/api/analyze called with ${text.length} chars. FastAPI service unreachable or not configured. Falling back to MOCK response.`,
        fetchError
      );
      mockAnalysis = defaultMockAnalysis;
    }

    res.json({
      success: true,
      mock: true, // Flag so frontend knows this isn't real analysis
      data: mockAnalysis,
    });
  } catch (error) {
    next(error);
  }
}
