import { Request, Response, NextFunction } from 'express';
import { Upload, UploadStatus } from '../models/Upload';

export async function createUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const {
      name,
      items = 0,
      status = 'uploading',
      failed = 0,
      error,
    } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({
        success: false,
        error: 'Upload name is required',
      });
      return;
    }

    const validStatuses: UploadStatus[] = [
      'uploading',
      'completed',
      'partial',
      'failed',
    ];

    const normalizedStatus = String(status) as UploadStatus;

    if (!validStatuses.includes(normalizedStatus)) {
      res.status(400).json({
        success: false,
        error: `Invalid upload status: ${status}`,
      });
      return;
    }

    const upload = await Upload.create({
      userId: req.user.id,
      name: String(name).trim(),
      items: Number(items) || 0,
      failed: Number(failed) || 0,
      status: normalizedStatus,
      error: error ? String(error) : undefined,
    });

    res.status(201).json({
      success: true,
      data: upload,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUploads(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const uploads = await Upload.find({
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: uploads,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const upload = await Upload.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
      },
      {
        $set: {
          ...(req.body.items !== undefined && {
            items: Number(req.body.items) || 0,
          }),
          failed:
            req.body.failed !== undefined
              ? Number(req.body.failed) || 0
              : 0,
          ...(req.body.status !== undefined && {
            status: req.body.status as UploadStatus,
          }),
          ...(req.body.error !== undefined && {
            error: req.body.error
              ? String(req.body.error)
              : undefined,
          }),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!upload) {
      res.status(404).json({
        success: false,
        error: 'Upload not found',
      });
      return;
    }

    res.json({
      success: true,
      data: upload,
    });
  } catch (error) {
    next(error);
  }
}