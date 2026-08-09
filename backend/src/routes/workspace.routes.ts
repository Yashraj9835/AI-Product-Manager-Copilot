import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { updateUserSchema } from '../validators/user.validator';
import { updateCurrentUser } from '../controllers/user.controller';
import {
  createRoadmapSchema,
  updateRoadmapSchema,
  reorderRoadmapSchema,
  roadmapIdSchema,
} from '../validators/roadmap.validator';
import {
  listRoadmapItems,
  createRoadmapItem,
  updateRoadmapItem,
  reorderRoadmapItems,
  deleteRoadmapItem,
} from '../controllers/roadmap.controller';
import { createPRDSchema, updatePRDSchema, prdIdSchema } from '../validators/prd.validator';
import {
  listPRDs,
  getPRDById,
  createPRD,
  updatePRD,
  deletePRD,
} from '../controllers/prd.controller';
import { mergeThemesSchema, splitThemeSchema } from '../validators/themes.validator';
import { mergeThemes, splitTheme } from '../controllers/themes.controller';

/* ────────────────────────────────────────────────────────────────────────────
 * Non-AI application routes: user settings, roadmap board, PRD drafts, and
 * theme maintenance.
 *
 * All four groups are ordinary owner-scoped CRUD over MongoDB. Nothing here
 * calls an analysis service — /api/analyze remains the only AI-adjacent route
 * and lives in feedback.routes.ts.
 * ──────────────────────────────────────────────────────────────────────── */

const router = Router();

// ── User settings ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/user:
 *   patch:
 *     tags: [User]
 *     summary: Update the current user's profile and preferences
 *     description: >
 *       Partial update of the authenticated user's own record — the write side
 *       of the Settings page. There is no id parameter: the target is always
 *       the token's own user.
 *
 *
 *       `email` and `role` are **not** editable here and are rejected rather
 *       than ignored. Role governs authorization (`DELETE /api/feedback/{id}`
 *       is admin-only), so allowing it through this form would let any viewer
 *       promote itself. Email is the login identity.
 *
 *
 *       A partial `settings` object patches individual keys, so sending only
 *       `weeklyDigest` leaves the other preferences untouched.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 120 }
 *               company: { type: string, maxLength: 120 }
 *               settings:
 *                 type: object
 *                 properties:
 *                   emailNotifications: { type: boolean }
 *                   weeklyDigest: { type: boolean }
 *                   highPriorityAlerts: { type: boolean }
 *                   defaultPageSize: { type: integer, minimum: 1, maximum: 100 }
 *           examples:
 *             profile:
 *               summary: Rename and set company
 *               value: { name: Arpita Dev, company: BarkApp }
 *             onePreference:
 *               summary: Toggle a single preference
 *               value: { settings: { weeklyDigest: true } }
 *     responses:
 *       200:
 *         description: Saved. Returns the same user shape as GET /api/auth/me.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Token is valid but the user record no longer exists.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/user', authenticate, validate(updateUserSchema), updateCurrentUser);

// ── Roadmap board ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/roadmap:
 *   get:
 *     tags: [Roadmap]
 *     summary: List the caller's roadmap cards
 *     description: >
 *       Returns every card owned by the authenticated user, sorted by quarter
 *       then persisted `order`, so the board renders in the same arrangement it
 *       was left in. Cards are owner-scoped — two users planning against the
 *       same database do not see each other's items.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The caller's roadmap cards.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [Roadmap]
 *     summary: Create a roadmap card
 *     description: >
 *       Appends the card to the end of its target column. `order` is computed
 *       server-side from the current column contents and is not accepted from
 *       the request, so a new card cannot collide with an existing position.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, quarter]
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *               quarter: { type: string, example: Q3 2026 }
 *               lane: { type: string, nullable: true, example: Core }
 *               status: { type: string, enum: [planned, in_progress, done] }
 *               effort: { type: string, example: M }
 *               team: { type: string, example: Backend }
 *     responses:
 *       201:
 *         description: Card created.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/roadmap', authenticate, listRoadmapItems);
router.post('/roadmap', authenticate, validate(createRoadmapSchema), createRoadmapItem);

/**
 * @openapi
 * /api/roadmap/reorder:
 *   patch:
 *     tags: [Roadmap]
 *     summary: Persist a drag-and-drop gesture
 *     description: >
 *       Writes the dragged card's new column plus the resulting order of every
 *       card in that column, in one request. Sending the whole column avoids
 *       the drift that per-card updates cause when two positions swap and one
 *       request lands first.
 *
 *
 *       Ids the caller does not own simply match nothing, so compare
 *       `modified` against the number of items you sent rather than treating
 *       200 as proof every card moved.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [id, quarter, order]
 *                   properties:
 *                     id: { type: string }
 *                     quarter: { type: string }
 *                     lane: { type: string, nullable: true }
 *                     order: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Reposition applied; reports matched and modified counts.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// Declared before /roadmap/:id so "reorder" is not parsed as an id.
router.patch('/roadmap/reorder', authenticate, validate(reorderRoadmapSchema), reorderRoadmapItems);

/**
 * @openapi
 * /api/roadmap/{id}:
 *   patch:
 *     tags: [Roadmap]
 *     summary: Update a roadmap card
 *     description: >
 *       Partial update. Also the single-card move path, where the body carries
 *       a new `quarter` or `lane`. A card belonging to another user answers 404
 *       rather than 403, so the endpoint does not confirm that the id exists.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The updated card.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Roadmap]
 *     summary: Delete a roadmap card
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Card deleted.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/roadmap/:id', authenticate, validate(updateRoadmapSchema), updateRoadmapItem);
router.delete('/roadmap/:id', authenticate, validate(roadmapIdSchema), deleteRoadmapItem);

// ── PRD drafts ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/prd:
 *   get:
 *     tags: [PRD]
 *     summary: List the caller's saved PRD drafts
 *     description: >
 *       Newest first. Backs both the PRD page list and the Dashboard's "PRDs
 *       generated" figure, which was previously hardcoded.
 *
 *
 *       Check `aiGenerated` on each draft before presenting its body as
 *       analysis output. It is false for every draft created today, because no
 *       LLM is connected — see `POST /api/prd`.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The caller's PRD drafts.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [PRD]
 *     summary: Create a PRD draft
 *     description: >
 *       Stores the ordinary, user-authored parts of a PRD: title, the feature
 *       it covers, status, overview, and sections.
 *
 *
 *       This endpoint does **not** generate content. `aiGenerated` is forced to
 *       false server-side and rejected if sent, so a client cannot label
 *       hand-written or invented text as AI output. Only a real analysis run
 *       may set it, and `/api/analyze` currently answers `mock: true`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *               feature: { type: string }
 *               status: { type: string, enum: [draft, review, ready] }
 *               overview: { type: string }
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [heading]
 *                   properties:
 *                     heading: { type: string }
 *                     items: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Draft created.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/prd', authenticate, listPRDs);
router.post('/prd', authenticate, validate(createPRDSchema), createPRD);

/**
 * @openapi
 * /api/prd/{id}:
 *   get:
 *     tags: [PRD]
 *     summary: Get one PRD draft
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The draft.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     tags: [PRD]
 *     summary: Update a PRD draft
 *     description: >
 *       Partial update. `aiGenerated` is stripped from the body for the same
 *       reason it is forced on create.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The updated draft.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [PRD]
 *     summary: Delete a PRD draft
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Draft deleted.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/prd/:id', authenticate, validate(prdIdSchema), getPRDById);
router.patch('/prd/:id', authenticate, validate(updatePRDSchema), updatePRD);
router.delete('/prd/:id', authenticate, validate(prdIdSchema), deletePRD);

// ── Theme maintenance ─────────────────────────────────────────────────────

/**
 * @openapi
 * /api/themes/merge:
 *   post:
 *     tags: [Themes]
 *     summary: Merge one or more themes into another
 *     description: >
 *       Refiles every feedback row whose `category` is in `from` under `into`.
 *
 *
 *       This is category **maintenance**, not theme extraction — a
 *       deterministic bulk update over rows Eklessia's pipeline already
 *       categorised, for a PM correcting those categories by hand. Discovering
 *       themes from raw feedback text needs the NLP service and is not
 *       implemented by this route.
 *
 *
 *       The change is applied across the whole collection, not just the caller's
 *       rows, because feedback is shared team data. Merging a theme into itself
 *       is rejected rather than reported as a 0-row success.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [from, into]
 *             properties:
 *               from: { type: array, minItems: 1, items: { type: string } }
 *               into: { type: string }
 *           example:
 *             from: [Delivery]
 *             into: Logistics
 *     responses:
 *       200:
 *         description: Rows refiled; reports matched and modified counts.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: No feedback exists under any of the source themes.
 */
router.post('/themes/merge', authenticate, validate(mergeThemesSchema), mergeThemes);

/**
 * @openapi
 * /api/themes/split:
 *   post:
 *     tags: [Themes]
 *     summary: Split a theme by an existing field
 *     description: >
 *       Splits one broad theme into narrower ones using a discriminator already
 *       present on the rows. Each distinct value becomes `"<theme> — <value>"`.
 *
 *
 *       `by` is restricted to source, sentiment, city, or visitType because the
 *       value is used as a field path; an open string would let a caller group
 *       by any field in the document. Splitting is rejected when the
 *       discriminator is empty everywhere, or identical on every row, since
 *       both cases produce a single meaningless group.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [theme, by]
 *             properties:
 *               theme: { type: string }
 *               by: { type: string, enum: [source, sentiment, city, visitType] }
 *           example:
 *             theme: Delivery
 *             by: source
 *     responses:
 *       200:
 *         description: Theme split; lists each resulting theme and its row count.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/themes/split', authenticate, validate(splitThemeSchema), splitTheme);

export default router;
