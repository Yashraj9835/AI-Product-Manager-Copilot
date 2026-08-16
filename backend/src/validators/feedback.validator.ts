import { z } from 'zod';

/* ────────────────────────────────────────────────────────────────────────────
 * Validation schemas for Feedback endpoints.
 *
 * Only `text` and `source` are required.
 *
 * IMPORTANT:
 * `uploadId` identifies which uploaded file a feedback record belongs to.
 * It MUST be accepted here because Dashboard statistics are calculated
 * using Feedback.uploadId.
 * ──────────────────────────────────────────────────────────────────────────── */

export const feedbackBodySchema = z.object({
  // ── Upload relationship ────────────────────────────────────────────────
  uploadId:          z.string().optional(),

  // ── Core identifiers ──────────────────────────────────────────────────
  feedbackId:        z.string().optional(),
  customerId:        z.string().optional(),
  restaurantId:      z.string().optional(),
  restaurantName:    z.string().optional(),

  // ── Feedback content ──────────────────────────────────────────────────
  text: z
    .string({
      required_error: 'Feedback text is required',
    })
    .min(1, 'Feedback text is required'),

  review:            z.string().optional(),
  reviewTitle:       z.string().optional(),

  // ── Metadata ──────────────────────────────────────────────────────────
  rating: z.number().min(0).max(5).optional(),

  source: z
    .string({
      required_error: 'Source is required',
    })
    .min(1, 'Source is required'),

  createdAt:         z.string().or(z.date()).optional(),
  city:              z.string().optional(),
  language:          z.string().optional(),
  reviewerName:      z.string().optional(),
  state:             z.string().optional(),
  visitType:         z.string().optional(),

  // ── Food & delivery ──────────────────────────────────────────────────
  foodRating:        z.number().optional(),
  deliveryRating:    z.number().optional(),
  orderValue:        z.number().optional(),
  orderId:           z.string().optional(),
  deliveryPartner:   z.string().optional(),
  deliveryTime:     z.string().optional(),

  // ── Survey ────────────────────────────────────────────────────────────
  surveyId:          z.string().optional(),
  satisfactionScore: z.number().optional(),
  recommendScore:    z.number().optional(),
  foodQuality:       z.string().optional(),
  serviceQuality:    z.string().optional(),
  cleanliness:       z.string().optional(),

  // ── Support tickets ───────────────────────────────────────────────────
  ticketId:          z.string().optional(),
  issueCategory:     z.string().optional(),
  originalPriority:  z.string().optional(),
  status:            z.string().optional(),
  emailId:           z.string().optional(),
  subject:           z.string().optional(),

  // ── Feature requests ──────────────────────────────────────────────────
  requestId:         z.string().optional(),
  featureCategory:   z.string().optional(),
  featureTitle:     z.string().optional(),

  // ── Dine-in ───────────────────────────────────────────────────────────
  staffRating:       z.number().optional(),
  ambienceRating:    z.number().optional(),

  // ── Social media ──────────────────────────────────────────────────────
  postId:            z.string().optional(),
  platform:          z.string().optional(),
  username:          z.string().optional(),
  engagement:        z.string().optional(),

  // ── AI analyzed fields ────────────────────────────────────────────────
  category:          z.string().optional(),
  sentiment:         z.string().optional(),
  priority:          z.string().optional(),

  // ── Derived / enrichment ──────────────────────────────────────────────
  theme:             z.string().optional(),
  painPoint:         z.string().optional(),
  aiRecommendation:  z.string().optional(),
});

/**
 * POST /api/feedback
 *
 * Validates only the outer request shape.
 * Individual rows are validated inside createFeedback().
 */
export const createFeedbackSchema = z.object({
  body: z.unknown().superRefine((body, ctx) => {
    if (Array.isArray(body)) {
      if (body.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bulk array must contain at least one feedback item',
        });
      }

      return;
    }

    if (typeof body !== 'object' || body === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Request body must be a feedback object, or a non-empty array of them',
      });
    }
  }),
});

/**
 * PUT /api/feedback/:id
 */
export const updateFeedbackSchema = z.object({
  body: feedbackBodySchema.partial(),
  params: z.object({
    id: z.string().min(1),
  }),
});

/**
 * GET /api/feedback
 */
export const queryFeedbackSchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .default('1'),

    limit: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .default('20'),

    category: z.string().optional(),
    sentiment: z.string().optional(),
    priority: z.string().optional(),
    source: z.string().optional(),

    startDate: z.string().optional(),
    endDate: z.string().optional(),

    restaurantId: z.string().optional(),
    city: z.string().optional(),
    featureCategory: z.string().optional(),

    // Allow filtering feedback by uploaded dataset.
    uploadId: z.string().optional(),
  }),
});

/**
 * POST /api/analyze
 */
export const analyzeSchema = z.object({
  body: z.object({
    text: z
      .string()
      .min(1, 'Feedback text is required for analysis'),
  }),
});