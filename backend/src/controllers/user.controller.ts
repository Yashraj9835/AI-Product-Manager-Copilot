import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { sanitizeUser } from './auth.controller';

/**
 * PATCH /api/user
 *
 * Partial update of the authenticated user's own profile and preferences —
 * the write side of the Settings page. There is no id parameter on purpose:
 * the target is always `req.user.id`, so a token cannot be used to edit
 * somebody else's record.
 *
 * `role` and `email` are deliberately NOT editable here. Role is an
 * authorization decision (DELETE /api/feedback checks it), and letting a
 * viewer promote itself to admin through the Settings form would be a
 * privilege-escalation hole. Email is the login identity and would need a
 * re-verification flow to change safely.
 */
export async function updateCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, company, settings } = req.body as {
      name?: string;
      company?: string;
      settings?: Record<string, unknown>;
    };

    // Build a dotted $set so a partial `settings` object patches individual
    // preferences instead of replacing the whole sub-document — sending only
    // { weeklyDigest: true } must not blank out the other three flags.
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (company !== undefined) update.company = company;
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        update[`settings.${key}`] = value;
      }
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No updatable fields provided. Send name, company, and/or settings.',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Settings saved',
      data: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}
