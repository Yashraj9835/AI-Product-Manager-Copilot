import { Request, Response, NextFunction } from 'express';
import { Feedback } from '../models/Feedback';

/**
 * GET /api/stats
 * Aggregate counts by category, sentiment, and priority for dashboard charts.
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     total: number,
 *     byCategory:  [{ _id: "Food", count: 120 }, ...],
 *     bySentiment: [{ _id: "Positive", count: 300 }, ...],
 *     byPriority:  [{ _id: "High", count: 80 }, ...],
 *   }
 * }
 */
export async function getStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [total, byCategory, bySentiment, byPriority] = await Promise.all([
      Feedback.countDocuments(),

      Feedback.aggregate([
        { $match: { category: { $ne: null } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Feedback.aggregate([
        { $match: { sentiment: { $ne: null } } },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Feedback.aggregate([
        { $match: { priority: { $ne: null } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byCategory,
        bySentiment,
        byPriority,
      },
    });
  } catch (error) {
    next(error);
  }
}
