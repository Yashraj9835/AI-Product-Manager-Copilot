import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Feedback } from '../models/Feedback';
import { feedbackBodySchema } from '../validators/feedback.validator';

/**
 * One validation or database-write failure tied to the
 * original row position in a bulk request.
 */
interface RowError {
  index: number;
  field: string;
  message: string;
}

/**
 * Convert Zod errors into row-specific errors.
 */
function toRowErrors(
  error: ZodError,
  index: number,
): RowError[] {
  return error.errors.map((issue) => ({
    index,
    field: issue.path.join('.') || '(row)',
    message: issue.message,
  }));
}

/**
 * Generate a unique feedback ID when one is missing.
 */
function generateFeedbackId(): string {
  const timestamp = Date.now();

  const random = Math.random()
    .toString(36)
    .substring(2, 8);

  return `FB_GEN_${timestamp}_${random}`;
}

/**
 * Add generated feedbackId when missing or blank.
 */
function withGeneratedId<T extends { feedbackId?: string }>(
  item: T,
): T {
  if (
    !item.feedbackId ||
    item.feedbackId.trim() === ''
  ) {
    item.feedbackId = generateFeedbackId();
  }

  return item;
}

/**
 * Normalize uploadId.
 *
 * This is deliberately kept separate from Zod validation so that
 * uploadId is explicitly preserved before MongoDB insertion.
 */
function normalizeUploadId(
  uploadId: unknown,
): string | undefined {
  if (
    typeof uploadId !== 'string'
  ) {
    return undefined;
  }

  const value = uploadId.trim();

  return value.length > 0
    ? value
    : undefined;
}

/**
 * POST /api/feedback
 *
 * Creates either:
 *
 * 1. One feedback record
 * 2. A bulk array of feedback records
 *
 * Uploaded records contain uploadId so that the Dashboard can
 * identify which feedback belongs to which uploaded dataset.
 */
export async function createFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // =========================================================
    // SINGLE RECORD
    // =========================================================

    if (!Array.isArray(req.body)) {
      const parsed =
        feedbackBodySchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        next(parsed.error);
        return;
      }

      const record =
        withGeneratedId(
          parsed.data,
        );

      /*
       * Explicitly preserve uploadId.
       *
       * Even though the validator contains uploadId,
       * we normalize it here before MongoDB insertion.
       */
      const document = {
        ...record,

        uploadId:
          normalizeUploadId(
            (req.body as any).uploadId,
          ),
      };

      const doc =
        await Feedback.create(
          document,
        );

      res.status(201).json({
        success: true,
        data: doc,
      });

      return;
    }

    // =========================================================
    // BULK RECORDS
    // =========================================================

    const submitted =
      req.body as unknown[];

    const errors: RowError[] = [];

    const valid: Array<
      Record<string, any>
    > = [];

    /*
     * Maps the index inside `valid` back to
     * the original submitted array.
     */
    const originalIndex: number[] = [];

    submitted.forEach(
      (row, index) => {
        const parsed =
          feedbackBodySchema.safeParse(
            row,
          );

        if (!parsed.success) {
          errors.push(
            ...toRowErrors(
              parsed.error,
              index,
            ),
          );

          return;
        }

        /*
         * Generate ID if necessary.
         */
        const record =
          withGeneratedId(
            parsed.data,
          );

        /*
         * IMPORTANT FIX
         *
         * Take uploadId directly from the ORIGINAL
         * submitted row and explicitly add it to the
         * MongoDB document.
         *
         * This prevents uploadId from disappearing
         * during validation/transformation.
         */
        const originalRow =
          row as Record<string, any>;

        const uploadId =
          normalizeUploadId(
            originalRow.uploadId,
          );

        const document = {
          ...record,

          uploadId,
        };

        originalIndex.push(
          index,
        );

        valid.push(
          document,
        );
      },
    );

    // =========================================================
    // NOTHING VALID
    // =========================================================

    if (
      valid.length === 0
    ) {
      res.status(400).json({
        success: false,

        error:
          `All ${submitted.length} rows failed validation; nothing was inserted`,

        inserted: 0,

        failed:
          submitted.length,

        errors,
      });

      return;
    }

    // =========================================================
    // INSERT INTO MONGODB
    // =========================================================

    let insertedDocs: any[] = [];

    try {
      insertedDocs =
        await Feedback.insertMany(
          valid,
          {
            ordered: false,
          },
        );
    } catch (
      bulkError: any
    ) {
      /*
       * MongoDB can insert valid documents and still
       * throw when another document fails.
       */
      insertedDocs =
        bulkError.insertedDocs ??
        [];

      for (
        const writeError of
          bulkError.writeErrors ??
          []
      ) {
        const position =
          writeError.index ??
          writeError.err?.index;

        errors.push({
          index:
            originalIndex[
              position
            ] ??
            position ??
            -1,

          field:
            writeError.err?.code ===
            11000
              ? 'feedbackId'
              : '(row)',

          message:
            writeError.errmsg ??
            writeError.err?.errmsg ??
            'Database write failed',
        });
      }
    }

    const inserted =
      insertedDocs.length;

    // =========================================================
    // COMPLETE SUCCESS
    // =========================================================

    if (
      errors.length === 0
    ) {
      res.status(201).json({
        success: true,

        message:
          `${inserted} feedback records created`,

        count:
          inserted,

        data:
          insertedDocs,
      });

      return;
    }

    // =========================================================
    // NOTHING INSERTED
    // =========================================================

    if (
      inserted === 0
    ) {
      res.status(400).json({
        success: false,

        error:
          `All ${submitted.length} rows failed; nothing was inserted`,

        inserted: 0,

        failed:
          submitted.length,

        errors,
      });

      return;
    }

    // =========================================================
    // PARTIAL SUCCESS
    // =========================================================

    res.status(207).json({
      success: true,

      message:
        `${inserted} of ${submitted.length} feedback records created`,

      inserted,

      failed:
        submitted.length -
        inserted,

      count:
        inserted,

      errors,

      data:
        insertedDocs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feedback
 *
 * Supports pagination and filtering.
 *
 * Supported filters:
 *
 * page
 * limit
 * category
 * sentiment
 * priority
 * source
 * startDate
 * endDate
 * restaurantId
 * city
 * featureCategory
 * uploadId
 */
export async function getFeedbackList(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // =========================================================
    // PAGINATION
    // =========================================================

    const page = Math.max(
      1,
      parseInt(
        req.query.page as string,
      ) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(
          req.query.limit as string,
        ) || 20,
      ),
    );

    const skip =
      (page - 1) *
      limit;

    // =========================================================
    // FILTERS
    // =========================================================

    const filter: Record<
      string,
      any
    > = {};

    if (
      req.query.category
    ) {
      filter.category =
        String(
          req.query.category,
        ).trim();
    }

    if (
      req.query.sentiment
    ) {
      filter.sentiment =
        String(
          req.query.sentiment,
        ).trim();
    }

    if (
      req.query.priority
    ) {
      filter.priority =
        String(
          req.query.priority,
        ).trim();
    }

    if (
      req.query.source
    ) {
      filter.source =
        String(
          req.query.source,
        ).trim();
    }

    if (
      req.query.restaurantId
    ) {
      filter.restaurantId =
        String(
          req.query.restaurantId,
        ).trim();
    }

    if (
      req.query.city
    ) {
      filter.city =
        String(
          req.query.city,
        ).trim();
    }

    if (
      req.query.featureCategory
    ) {
      filter.featureCategory =
        String(
          req.query.featureCategory,
        ).trim();
    }

    // =========================================================
    // UPLOAD FILTER
    // =========================================================

    /*
     * THIS IS THE IMPORTANT DASHBOARD FILTER.
     *
     * Example:
     *
     * /api/feedback?uploadId=6a8219e597c0860f9aac9065
     *
     * will return ONLY feedback belonging to that upload.
     */
    if (
      req.query.uploadId
    ) {
      const uploadId =
        normalizeUploadId(
          req.query.uploadId,
        );

      if (uploadId) {
        filter.uploadId =
          uploadId;
      }
    }

    // =========================================================
    // DATE FILTER
    // =========================================================

    if (
      req.query.startDate ||
      req.query.endDate
    ) {
      filter.createdAt = {};

      if (
        req.query.startDate
      ) {
        const startDate =
          new Date(
            req.query.startDate as string,
          );

        if (
          !Number.isNaN(
            startDate.getTime(),
          )
        ) {
          filter.createdAt.$gte =
            startDate;
        }
      }

      if (
        req.query.endDate
      ) {
        const endDate =
          new Date(
            req.query.endDate as string,
          );

        if (
          !Number.isNaN(
            endDate.getTime(),
          )
        ) {
          /*
           * Include the entire end date.
           */
          endDate.setHours(
            23,
            59,
            59,
            999,
          );

          filter.createdAt.$lte =
            endDate;
        }
      }
    }

    // =========================================================
    // QUERY DATABASE
    // =========================================================

    const [
      data,
      total,
    ] = await Promise.all([
      Feedback.find(
        filter,
      )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Feedback.countDocuments(
        filter,
      ),
    ]);

    // =========================================================
    // RESPONSE
    // =========================================================

    res.json({
      success: true,

      data,

      pagination: {
        page,

        limit,

        total,

        totalPages:
          Math.ceil(
            total / limit,
          ),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feedback/:id
 */
export async function getFeedbackById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const doc =
      await Feedback.findOne({
        feedbackId:
          req.params.id,
      }).lean();

    if (!doc) {
      res.status(404).json({
        success: false,

        error:
          `Feedback with id "${req.params.id}" not found`,
      });

      return;
    }

    res.json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/feedback/:id
 */
export async function updateFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const doc =
      await Feedback.findOneAndUpdate(
        {
          feedbackId:
            req.params.id,
        },

        {
          $set:
            req.body,
        },

        {
          new: true,
          runValidators: true,
        },
      ).lean();

    if (!doc) {
      res.status(404).json({
        success: false,

        error:
          `Feedback with id "${req.params.id}" not found`,
      });

      return;
    }

    res.json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/feedback/:id
 */
export async function deleteFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const doc =
      await Feedback.findOneAndDelete({
        feedbackId:
          req.params.id,
      }).lean();

    if (!doc) {
      res.status(404).json({
        success: false,

        error:
          `Feedback with id "${req.params.id}" not found`,
      });

      return;
    }

    res.json({
      success: true,

      message:
        `Feedback "${req.params.id}" deleted`,
    });
  } catch (error) {
    next(error);
  }
}