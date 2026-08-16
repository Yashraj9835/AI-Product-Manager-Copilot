import mongoose, { Document, Schema } from 'mongoose';

export type UploadStatus =
  | 'uploading'
  | 'completed'
  | 'partial'
  | 'failed';

export interface IUpload extends Document {
  userId: string;
  name: string;
  items: number;
  failed?: number;
  status: UploadStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UploadSchema = new Schema<IUpload>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    items: {
      type: Number,
      required: true,
      default: 0,
    },

    failed: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ['uploading', 'completed', 'partial', 'failed'],
      required: true,
    },

    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

UploadSchema.index({ userId: 1, createdAt: -1 });

export const Upload = mongoose.model<IUpload>(
  'Upload',
  UploadSchema,
);