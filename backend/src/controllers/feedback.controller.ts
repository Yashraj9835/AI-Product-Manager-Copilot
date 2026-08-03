import { Request, Response, NextFunction } from 'express';
import { Feedback } from '../models/Feedback';

/**
 * Generate a unique feedback ID when one is missing or blank.
 */
function generateFeedbackId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `FB_GEN_${ts}_${rand}`;
}

/**
 * POST /api/feedback
 * Create a single feedback record or bulk-insert an array.
 */
export async function createFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const isBulk = Array.isArray(req.body);
    const items = isBulk ? req.body : [req.body];

    // Auto-generate feedbackId for any item missing one
    for (const item of items) {
      if (!item.feedbackId || item.feedbackId.trim() === '') {
        item.feedbackId = generateFeedbackId();
      }
    }

    if (isBulk) {
      const docs = await Feedback.insertMany(items, { ordered: false });
      res.status(201).json({
        success: true,
        message: `${docs.length} feedback records created`,
        count: docs.length,
        data: docs,
      });
    } else {
      const doc = await Feedback.create(items[0]);
      res.status(201).json({
        success: true,
        data: doc,
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feedback
 * List feedback with pagination and optional filters.
 *
 * Query params:
 *   page, limit, category, sentiment, priority, source,
 *   startDate, endDate, restaurantId, city
 */
export async function getFeedbackList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Build filter object from query params
    const filter: Record<string, any> = {};

    if (req.query.category)     filter.category = req.query.category;
    if (req.query.sentiment)    filter.sentiment = req.query.sentiment;
    if (req.query.priority)     filter.priority = req.query.priority;
    if (req.query.source)       filter.source = req.query.source;
    if (req.query.restaurantId) filter.restaurantId = req.query.restaurantId;
    if (req.query.city)         filter.city = req.query.city;

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate as string);
      }
    }

    const [data, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feedback/:id
 * Get a single feedback record by feedbackId.
 */
export async function getFeedbackById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await Feedback.findOne({ feedbackId: req.params.id }).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `Feedback with id "${req.params.id}" not found`,
      });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/feedback/:id
 * Update a feedback record by feedbackId (for manual corrections).
 */
export async function updateFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await Feedback.findOneAndUpdate(
      { feedbackId: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `Feedback with id "${req.params.id}" not found`,
      });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/feedback/:id
 * Delete a feedback record by feedbackId.
 */
export async function deleteFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await Feedback.findOneAndDelete({ feedbackId: req.params.id }).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `Feedback with id "${req.params.id}" not found`,
      });
      return;
    }

    res.json({
      success: true,
      message: `Feedback "${req.params.id}" deleted`,
    });
  } catch (error) {
    next(error);
  }
}
