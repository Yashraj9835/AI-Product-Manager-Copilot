import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PRD } from '../models/PRD';

function ownerId(req: Request): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(req.user!.id);
}

/**
 * GET /api/prd
 *
 * The caller's saved PRD drafts, newest first. Backs both the PRD page list and
 * the Dashboard's "PRDs generated" count — that count was previously a
 * hardcoded 9, so it now moves with the data.
 */
export async function listPRDs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const docs = await PRD.find({ owner: ownerId(req) }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/prd/:id
 */
export async function getPRDById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await PRD.findOne({ _id: req.params.id, owner: ownerId(req) }).lean();

    if (!doc) {
      res.status(404).json({ success: false, error: `PRD "${req.params.id}" not found` });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/prd
 *
 * Creates a draft. `aiGenerated` is forced to false and never read from the
 * request: only a real analysis run may claim authorship of a body, and no
 * such run exists while /analyze answers `mock: true`. A client that could set
 * this flag itself would be able to label invented text as AI output.
 */
export async function createPRD(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await PRD.create({
      ...req.body,
      owner: ownerId(req),
      aiGenerated: false,
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/prd/:id
 *
 * Partial update of a draft's own fields. `aiGenerated` is stripped for the
 * same reason it is forced on create.
 */
export async function updatePRD(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { aiGenerated: _ignored, ...updates } = req.body;

    const doc = await PRD.findOneAndUpdate(
      { _id: req.params.id, owner: ownerId(req) },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) {
      res.status(404).json({ success: false, error: `PRD "${req.params.id}" not found` });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/prd/:id
 */
export async function deletePRD(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await PRD.findOneAndDelete({
      _id: req.params.id,
      owner: ownerId(req),
    }).lean();

    if (!doc) {
      res.status(404).json({ success: false, error: `PRD "${req.params.id}" not found` });
      return;
    }

    res.json({ success: true, message: `PRD "${doc.title}" deleted` });
  } catch (error) {
    next(error);
  }
}
