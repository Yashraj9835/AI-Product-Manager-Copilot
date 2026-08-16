import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  // ── Core identifiers ──────────────────────────────────────────────────
  feedbackId: string;
  uploadId?: string;
  customerId?: string;
  restaurantId?: string;
  restaurantName?: string;

  // ── Feedback content ──────────────────────────────────────────────────
  text: string;
  review?: string;
  reviewTitle?: string;

  // ── Metadata ──────────────────────────────────────────────────────────
  rating?: number;
  source?: string;
  createdAt?: Date;
  city?: string;
  language?: string;
  reviewerName?: string;
  state?: string;
  visitType?: string;

  // ── Food & delivery ──────────────────────────────────────────────────
  foodRating?: number;
  deliveryRating?: number;
  orderValue?: number;
  orderId?: string;
  deliveryPartner?: string;
  deliveryTime?: string;

  // ── Survey ────────────────────────────────────────────────────────────
  surveyId?: string;
  satisfactionScore?: number;
  recommendScore?: number;
  foodQuality?: string;
  serviceQuality?: string;
  cleanliness?: string;

  // ── Support tickets ───────────────────────────────────────────────────
  ticketId?: string;
  issueCategory?: string;
  originalPriority?: string;
  status?: string;
  emailId?: string;
  subject?: string;

  // ── Feature requests ──────────────────────────────────────────────────
  requestId?: string;
  featureCategory?: string;
  featureTitle?: string;

  // ── Dine-in ───────────────────────────────────────────────────────────
  staffRating?: number;
  ambienceRating?: number;

  // ── Social media ──────────────────────────────────────────────────────
  postId?: string;
  platform?: string;
  username?: string;
  engagement?: string;

  // ── AI analysis ────────────────────────────────────────────────────────
  category?: string;
  sentiment?: string;
  priority?: string;

  // ── Derived / enrichment ──────────────────────────────────────────────
  theme?: string;
  painPoint?: string;
  aiRecommendation?: string;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    // ── Core identifiers ────────────────────────────────────────────────
    feedbackId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    /*
     * Links every feedback record to the uploaded dataset that created it.
     *
     * Example:
     * Upload._id = "6a8219e597c0860f9aac9065"
     *
     * Every feedback record from that file should contain:
     *
     * uploadId = "6a8219e597c0860f9aac9065"
     *
     * Dashboard statistics use this field to isolate one uploaded dataset.
     */
    uploadId: {
      type: String,
      index: true,
      default: undefined,
    },

    customerId: {
      type: String,
    },

    restaurantId: {
      type: String,
      index: true,
    },

    restaurantName: {
      type: String,
    },

    // ── Feedback content ────────────────────────────────────────────────
    text: {
      type: String,
      required: true,
    },

    review: {
      type: String,
    },

    reviewTitle: {
      type: String,
    },

    // ── Metadata ────────────────────────────────────────────────────────
    rating: {
      type: Number,
    },

    source: {
      type: String,
      index: true,
    },

    createdAt: {
      type: Date,
      index: true,
    },

    city: {
      type: String,
    },

    language: {
      type: String,
    },

    reviewerName: {
      type: String,
    },

    state: {
      type: String,
    },

    visitType: {
      type: String,
    },

    // ── Food & delivery ─────────────────────────────────────────────────
    foodRating: {
      type: Number,
    },

    deliveryRating: {
      type: Number,
    },

    orderValue: {
      type: Number,
    },

    orderId: {
      type: String,
    },

    deliveryPartner: {
      type: String,
    },

    deliveryTime: {
      type: String,
    },

    // ── Survey ──────────────────────────────────────────────────────────
    surveyId: {
      type: String,
    },

    satisfactionScore: {
      type: Number,
    },

    recommendScore: {
      type: Number,
    },

    foodQuality: {
      type: String,
    },

    serviceQuality: {
      type: String,
    },

    cleanliness: {
      type: String,
    },

    // ── Support tickets ─────────────────────────────────────────────────
    ticketId: {
      type: String,
    },

    issueCategory: {
      type: String,
    },

    originalPriority: {
      type: String,
    },

    status: {
      type: String,
    },

    emailId: {
      type: String,
    },

    subject: {
      type: String,
    },

    // ── Feature requests ────────────────────────────────────────────────
    requestId: {
      type: String,
    },

    featureCategory: {
      type: String,
    },

    featureTitle: {
      type: String,
    },

    // ── Dine-in ─────────────────────────────────────────────────────────
    staffRating: {
      type: Number,
    },

    ambienceRating: {
      type: Number,
    },

    // ── Social media ─────────────────────────────────────────────────────
    postId: {
      type: String,
    },

    platform: {
      type: String,
    },

    username: {
      type: String,
    },

    engagement: {
      type: String,
    },

    // ── AI analyzed ──────────────────────────────────────────────────────
    category: {
      type: String,
      index: true,
    },

    sentiment: {
      type: String,
      index: true,
    },

    priority: {
      type: String,
      index: true,
    },

    // ── Derived / enrichment ─────────────────────────────────────────────
    theme: {
      type: String,
    },

    painPoint: {
      type: String,
    },

    aiRecommendation: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: 'updatedAt',
    },
  },
);

/*
 * ──────────────────────────────────────────────────────────────────────────
 * Dashboard indexes
 *
 * These make dataset-specific dashboard queries efficient.
 * ──────────────────────────────────────────────────────────────────────────
 */

FeedbackSchema.index({
  uploadId: 1,
  createdAt: -1,
});

FeedbackSchema.index({
  uploadId: 1,
  category: 1,
});

FeedbackSchema.index({
  uploadId: 1,
  sentiment: 1,
});

FeedbackSchema.index({
  uploadId: 1,
  priority: 1,
});

FeedbackSchema.index({
  uploadId: 1,
  source: 1,
});

FeedbackSchema.index({
  uploadId: 1,
  theme: 1,
});

/*
 * Export model.
 */
export const Feedback = mongoose.model<IFeedback>(
  'Feedback',
  FeedbackSchema,
);