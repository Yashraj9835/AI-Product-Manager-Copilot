import { Request, Response, NextFunction } from 'express';
import { Feedback } from '../models/Feedback';
import { Upload } from '../models/Upload';

/**
 * GET /api/stats
 *
 * Dashboard statistics.
 *
 * If uploadId is supplied:
 *
 *   /api/stats?uploadId=XXXXXXXX
 *
 * ONLY that uploaded dataset is used.
 *
 * Without uploadId, statistics are calculated across all feedback.
 */
export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uploadId =
      typeof req.query.uploadId === 'string'
        ? req.query.uploadId.trim()
        : '';

    // ---------------------------------------------------------
    // Build dashboard filter
    // ---------------------------------------------------------

    const filter: Record<string, any> = {};

    if (uploadId) {
      filter.uploadId = uploadId;
    }

    // ---------------------------------------------------------
    // Load selected upload information
    // ---------------------------------------------------------

    let upload = null;

    if (uploadId) {
      upload = await Upload.findById(uploadId).lean();

      if (!upload) {
        res.status(404).json({
          success: false,
          error: `Upload "${uploadId}" not found`,
        });
        return;
      }
    }

    // ---------------------------------------------------------
    // Aggregate dashboard data
    // ---------------------------------------------------------

    const [
      total,
      byCategory,
      bySentiment,
      byPriority,
      bySource,
      byTheme,
    ] = await Promise.all([
      // Total feedback
      Feedback.countDocuments(filter),

      // Category
      Feedback.aggregate([
        { $match: filter },

        {
          $match: {
            category: {
              $nin: [null, ''],
            },
          },
        },

        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      // Sentiment
      Feedback.aggregate([
        { $match: filter },

        {
          $match: {
            sentiment: {
              $nin: [null, ''],
            },
          },
        },

        {
          $group: {
            _id: '$sentiment',
            count: { $sum: 1 },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      // Priority
      Feedback.aggregate([
        { $match: filter },

        {
          $match: {
            priority: {
              $nin: [null, ''],
            },
          },
        },

        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      // Source
      Feedback.aggregate([
        { $match: filter },

        {
          $match: {
            source: {
              $nin: [null, ''],
            },
          },
        },

        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      // Theme
      Feedback.aggregate([
        { $match: filter },

        {
          $match: {
            theme: {
              $nin: [null, ''],
            },
          },
        },

        {
          $group: {
            _id: '$theme',
            count: { $sum: 1 },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),
    ]);

    // ---------------------------------------------------------
    // Convert MongoDB aggregation format to Recharts format
    // ---------------------------------------------------------

    const formatForRecharts = (
      data: Array<{
        _id: string;
        count: number;
      }>,
    ) =>
      data.map((item) => ({
        name: item._id,
        value: item.count,
      }));

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    res.json({
      success: true,

      data: {
        total,

        byCategory:
          formatForRecharts(byCategory),

        bySentiment:
          formatForRecharts(bySentiment),

        byPriority:
          formatForRecharts(byPriority),

        bySource:
          formatForRecharts(bySource),

        byTheme:
          formatForRecharts(byTheme),

        upload: upload
          ? {
              id: String(upload._id),
              name: upload.name,
              items: upload.items,
              failed: upload.failed,
              status: upload.status,
              createdAt: upload.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}