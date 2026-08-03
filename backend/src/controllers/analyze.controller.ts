import { Request, Response, NextFunction } from 'express';

/**
 * POST /api/analyze
 *
 * TODO: Proxy to Yash's FastAPI service at ${FASTAPI_URL}/analyze
 *       once the endpoint is available.
 *
 * For now, returns a mock response so the frontend team (Arpita) can
 * integrate against this endpoint without being blocked.
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

    // ──────────────────────────────────────────────────────────────────
    // TODO: Replace mock with actual proxy to Yash's FastAPI service.
    //
    //   const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    //   const response = await fetch(`${fastApiUrl}/analyze`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ text }),
    //   });
    //   const result = await response.json();
    //   res.json({ success: true, data: result });
    //
    // ──────────────────────────────────────────────────────────────────

    // Mock response — matches Yash's planned FastAPI output shape
    const mockAnalysis = {
      category: 'Food',
      sentiment: 'Positive',
      theme: 'Quality',
      pain_point: 'None identified',
      priority: 'Medium',
      recommendation:
        'No immediate action required. Continue monitoring for trends.',
    };

    console.log(
      `⚠️  /api/analyze called with ${text.length} chars — returning MOCK response. ` +
      `Wire up FASTAPI_URL once Yash's service is live.`
    );

    res.json({
      success: true,
      mock: true, // Flag so frontend knows this isn't real analysis
      data: mockAnalysis,
    });
  } catch (error) {
    next(error);
  }
}
