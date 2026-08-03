import { z } from 'zod';

/* ────────────────────────────────────────────────────────────────────────────
 * Validation schemas for Feedback endpoints.
 *
 * DESIGN DECISION: Only `text` and `source` are required. The CSV has 45
 * columns but any given row only populates ~5-8 depending on the source type
 * (Google review vs support ticket vs survey vs feature request). Requiring
 * more fields would break bulk seeding on legitimate sparse rows.
 *
 * `feedbackId` is optional on create — if missing or empty, the controller
 * auto-generates one as `FB_GEN_<timestamp>_<random>`.
 * ──────────────────────────────────────────────────────────────────────── */

const feedbackBody = z.object({
  feedbackId:        z.string().optional(),
  customerId:        z.string().optional(),
  restaurantId:      z.string().optional(),
  restaurantName:    z.string().optional(),

  text:              z.string().min(1, 'Feedback text is required'),
  review:            z.string().optional(),
  reviewTitle:       z.string().optional(),

  rating:            z.number().min(0).max(5).optional(),
  source:            z.string().min(1, 'Source is required'),
  createdAt:         z.string().or(z.date()).optional(),
  city:              z.string().optional(),
  language:          z.string().optional(),
  reviewerName:      z.string().optional(),
  state:             z.string().optional(),
  visitType:         z.string().optional(),

  foodRating:        z.number().optional(),
  deliveryRating:    z.number().optional(),
  orderValue:        z.number().optional(),
  orderId:           z.string().optional(),
  deliveryPartner:   z.string().optional(),
  deliveryTime:      z.string().optional(),

  surveyId:          z.string().optional(),
  satisfactionScore: z.number().optional(),
  recommendScore:    z.number().optional(),
  foodQuality:       z.string().optional(),
  serviceQuality:    z.string().optional(),
  cleanliness:       z.string().optional(),

  ticketId:          z.string().optional(),
  issueCategory:     z.string().optional(),
  originalPriority:  z.string().optional(),
  status:            z.string().optional(),
  emailId:           z.string().optional(),
  subject:           z.string().optional(),

  requestId:         z.string().optional(),
  featureCategory:   z.string().optional(),
  featureTitle:      z.string().optional(),

  staffRating:       z.number().optional(),
  ambienceRating:    z.number().optional(),

  postId:            z.string().optional(),
  platform:          z.string().optional(),
  username:          z.string().optional(),
  engagement:        z.string().optional(),

  category:          z.string().optional(),
  sentiment:         z.string().optional(),
  priority:          z.string().optional(),

  theme:             z.string().optional(),
  painPoint:         z.string().optional(),
  aiRecommendation:  z.string().optional(),
});

/** POST /api/feedback — accepts a single object OR an array for bulk insert */
export const createFeedbackSchema = z.object({
  body: z.union([feedbackBody, z.array(feedbackBody).min(1)]),
});

/** PUT /api/feedback/:id — all fields optional */
export const updateFeedbackSchema = z.object({
  body: feedbackBody.partial(),
  params: z.object({ id: z.string().min(1) }),
});

/** GET /api/feedback — query-string filters + pagination */
export const queryFeedbackSchema = z.object({
  query: z.object({
    page:      z.string().regex(/^\d+$/).optional().default('1'),
    limit:     z.string().regex(/^\d+$/).optional().default('20'),
    category:  z.string().optional(),
    sentiment: z.string().optional(),
    priority:  z.string().optional(),
    source:    z.string().optional(),
    startDate: z.string().optional(),
    endDate:   z.string().optional(),
    restaurantId: z.string().optional(),
    city:      z.string().optional(),
  }),
});

/** POST /api/analyze — just needs feedback text */
export const analyzeSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Feedback text is required for analysis'),
  }),
});
