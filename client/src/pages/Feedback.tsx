import { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Sparkles,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';
import api from '@/lib/trpc';

interface ThemeItem {
  feedback: string;
  theme: string;
  pain_point: string;
}

interface PipelineResult {
  message: string;
  filename: string;
  rows: number;
  processed_rows: number;
  columns: string[];
  theme_extraction: ThemeItem[];
  trend_analysis: Record<string, number>;
  feature_clusters: Record<string, string[]>;
}

interface UploadRecord {
  id: string;
  name: string;
  date: string;
  items: number;
  status: 'uploading' | 'completed' | 'partial' | 'failed';
  failed?: number;
  error?: string;
}

function getAuthToken(): string {
  try {
    const user = JSON.parse(
      localStorage.getItem('user') || '{}',
    );

    return user?.token || '';
  } catch {
    return '';
  }
}

/**
 * Parse a CSV line.
 *
 * Supports:
 * - quoted values
 * - commas inside quoted values
 * - escaped quotes
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());

  return values.map((value) =>
    value
      .replace(/^"|"$/g, '')
      .trim(),
  );
}

/**
 * Normalize a column name.
 *
 * Examples:
 *
 * "Category"        -> "category"
 * "CATEGORY"        -> "category"
 * "AI Category"     -> "ai_category"
 * "Pain Point"      -> "pain_point"
 * "feedback-id"     -> "feedback_id"
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Convert a CSV row into an object.
 */
function csvRowToObject(
  headers: string[],
  values: string[],
): Record<string, any> {
  const row: Record<string, any> = {};

  headers.forEach((header, index) => {
    row[header] =
      values[index] !== undefined
        ? values[index]
        : '';
  });

  return row;
}

/**
 * Convert an optional value to a number.
 */
function toOptionalNumber(
  value: any,
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    return undefined;
  }

  const number = Number(
    String(value)
      .replace(/,/g, '')
      .trim(),
  );

  return Number.isFinite(number)
    ? number
    : undefined;
}

/**
 * Normalize an arbitrary object into the same
 * key format used by CSV headers.
 *
 * This fixes datasets where JSON uses:
 *
 * Category
 * CATEGORY
 * AI Category
 * ai_category
 * category
 *
 * etc.
 */
function normalizeObjectKeys(
  input: Record<string, any>,
): Record<string, any> {
  const normalized: Record<string, any> = {};

  Object.entries(input || {}).forEach(
    ([key, value]) => {
      normalized[
        normalizeHeader(key)
      ] = value;
    },
  );

  return normalized;
}

/**
 * Get a value from a normalized record using
 * multiple possible column names.
 */
function getField(
  item: Record<string, any>,
  ...names: string[]
): any {
  for (const name of names) {
    const key = normalizeHeader(name);

    const value =
      item[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }

  return undefined;
}

export default function Feedback() {
  const [isDragging, setIsDragging] =
    useState(false);

  const [recentUploads, setRecentUploads] =
    useState<UploadRecord[]>([]);

  const [isUploading, setIsUploading] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  // -------------------------------------------------------
  // Deep Analysis
  // -------------------------------------------------------

  const [isPipelineRunning, setIsPipelineRunning] =
    useState(false);

  const [pipelineResult, setPipelineResult] =
    useState<PipelineResult | null>(null);

  const [pipelineError, setPipelineError] =
    useState<string | null>(null);

  const pipelineInputRef =
    useRef<HTMLInputElement>(null);

  // -------------------------------------------------------
  // Add Source
  // -------------------------------------------------------

  const [sourceOpen, setSourceOpen] =
    useState(false);

  const [sourceName, setSourceName] =
    useState('');

  const [sourceText, setSourceText] =
    useState('');

  const [isAddingSource, setIsAddingSource] =
    useState(false);

  // -------------------------------------------------------
  // Stats
  // -------------------------------------------------------

  const {
    data: statsData,
    fetchData: fetchStats,
  } = useApi<any>();

  // -------------------------------------------------------
  // Upload history
  // -------------------------------------------------------

  const fetchRecentUploads = async () => {
    try {
      const response =
        await api.get('/uploads');

      const uploads =
        response.data?.data ?? [];

      const mappedUploads: UploadRecord[] =
        uploads.map((upload: any) => ({
          id: String(
            upload._id ??
              upload.id,
          ),

          name:
            upload.name ??
            'Unknown file',

          date: upload.createdAt
            ? new Date(
                upload.createdAt,
              ).toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                },
              )
            : '—',

          items:
            Number(upload.items) || 0,

          status:
            upload.status ??
            'completed',

          failed:
            Number(upload.failed) || 0,

          error:
            upload.error,
        }));

      setRecentUploads(
        mappedUploads,
      );
    } catch (err: any) {
      console.error(
        'Failed to load uploads:',
        err,
      );

      toast.error(
        'Could not load previous uploads',
        {
          description:
            err.response?.data?.error ||
            err.message ||
            'Failed to load uploads',
        },
      );
    }
  };

  // -------------------------------------------------------
  // Initial load
  // -------------------------------------------------------

  useEffect(() => {
    void fetchRecentUploads();

    void fetchStats({
      method: 'GET',
      url: '/stats',
    });
  }, [fetchStats]);

  // -------------------------------------------------------
  // Create upload record
  // -------------------------------------------------------

  const createUploadRecord = async (
    file: File,
  ): Promise<string> => {
    const response =
      await api.post('/uploads', {
        name: file.name,
        items: 0,
        failed: 0,
        status: 'uploading',
      });

    const upload =
      response.data?.data ??
      response.data;

    const id =
      upload?._id ??
      upload?.id;

    if (!id) {
      throw new Error(
        'Upload record was not created',
      );
    }

    return String(id);
  };

  // -------------------------------------------------------
  // Update upload record
  // -------------------------------------------------------

  const updateUploadRecord = async (
    id: string,
    data: {
      items?: number;
      failed?: number;
      status?:
        | 'uploading'
        | 'completed'
        | 'partial'
        | 'failed';
      error?: string;
    },
  ) => {
    await api.patch(
      `/uploads/${id}`,
      data,
    );
  };

  // -------------------------------------------------------
  // Deep Analysis
  // -------------------------------------------------------

  const runPipelineAnalysis = async (
    file: File,
  ) => {
    if (
      !file.name
        .toLowerCase()
        .endsWith('.csv')
    ) {
      toast.error(
        'Deep Analysis only accepts CSV files',
      );
      return;
    }

    setIsPipelineRunning(true);
    setPipelineResult(null);
    setPipelineError(null);

    toast.info(
      `Running deep analysis on ${file.name}…`,
      {
        duration: 4000,
      },
    );

    try {
      const formData =
        new FormData();

      formData.append(
        'file',
        file,
      );

      const response =
        await fetch(
          '/api/pipeline/upload',
          {
            method: 'POST',
            body: formData,
            headers: {
              Authorization:
                `Bearer ${getAuthToken()}`,
            },
          },
        );

      if (!response.ok) {
        const err =
          await response
            .json()
            .catch(() => ({
              error:
                response.statusText,
            }));

        throw new Error(
          err?.error ||
            `Pipeline responded with ${response.status}`,
        );
      }

      const body =
        await response.json();

      const result: PipelineResult =
        body.data ?? body;

      setPipelineResult(
        result,
      );

      toast.success(
        `Deep analysis complete — ${
          result.processed_rows ?? 0
        } records processed`,
      );
    } catch (err: any) {
      const msg =
        err.message ||
        'Pipeline analysis failed';

      setPipelineError(msg);

      toast.error(
        'Deep analysis failed',
        {
          description: msg,
        },
      );
    } finally {
      setIsPipelineRunning(false);
    }
  };

  // -------------------------------------------------------
  // Add Source
  // -------------------------------------------------------

  const handleAddSource = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (!sourceName.trim()) {
      toast.error(
        'Name the source',
      );
      return;
    }

    if (!sourceText.trim()) {
      toast.error(
        'Add an example feedback entry so the source has data',
      );
      return;
    }

    setIsAddingSource(true);

    try {
      await api.post(
        '/feedback',
        {
          text:
            sourceText.trim(),

          source:
            sourceName.trim(),

          sentiment:
            'Neutral',
        },
      );

      toast.success(
        'Source added',
        {
          description:
            `"${sourceName.trim()}" now appears in the source breakdown.`,
        },
      );

      setSourceOpen(false);
      setSourceName('');
      setSourceText('');

      await fetchStats({
        method: 'GET',
        url: '/stats',
      });

      await fetchRecentUploads();
    } catch (err: any) {
      const details =
        err.response?.data
          ?.details;

      toast.error(
        'Could not add source',
        {
          description:
            Array.isArray(
              details,
            ) &&
            details.length
              ? details
                  .map(
                    (d: any) =>
                      d.message ??
                      JSON.stringify(
                        d,
                      ),
                  )
                  .join('; ')
              : err.response?.data
                    ?.error ||
                err.message,
        },
      );
    } finally {
      setIsAddingSource(false);
    }
  };

  // -------------------------------------------------------
  // Process uploaded file
  // -------------------------------------------------------

  const processFile = async (
    file: File,
  ) => {
    let uploadId:
      | string
      | null = null;

    setIsUploading(true);

    try {
      // =====================================================
      // STEP 1
      // Create upload record FIRST
      // =====================================================

      uploadId =
        await createUploadRecord(
          file,
        );

      console.log(
        '[UPLOAD] Created upload:',
        uploadId,
      );

      const temporaryRecord:
        UploadRecord = {
        id: uploadId,

        name: file.name,

        date:
          new Date().toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            },
          ),

        items: 0,

        status:
          'uploading',
      };

      setRecentUploads(
        (prev) => [
          temporaryRecord,
          ...prev.filter(
            (item) =>
              item.id !==
              uploadId,
          ),
        ],
      );

      // =====================================================
      // STEP 2
      // Read file
      // =====================================================

      const text =
        await file.text();

      let feedbackItems: any[] =
        [];

      const lowerFileName =
        file.name.toLowerCase();

      // =====================================================
      // JSON
      // =====================================================

      if (
        lowerFileName.endsWith(
          '.json',
        )
      ) {
        const parsed =
          JSON.parse(text);

        feedbackItems =
          Array.isArray(parsed)
            ? parsed
            : [parsed];
      }

      // =====================================================
      // CSV
      // =====================================================

      else if (
        lowerFileName.endsWith(
          '.csv',
        )
      ) {
        const lines =
          text
            .split(/\r?\n/)
            .filter(
              (line) =>
                line.trim(),
            );

        if (lines.length < 2) {
          throw new Error(
            'CSV file is empty or has no data rows',
          );
        }

        const headers =
          parseCsvLine(
            lines[0],
          ).map(
            normalizeHeader,
          );

        console.log(
          '[UPLOAD] Normalized CSV headers:',
          headers,
        );

        const textCandidates = [
          'text',
          'feedback',
          'feedback_text',
          'review',
          'review_text',
          'comment',
          'description',
          'message',
          'customer_feedback',
          'feedback_comment',
        ];

        let textIdx =
          headers.findIndex(
            (header) =>
              textCandidates.includes(
                header,
              ),
          );

        if (textIdx < 0) {
          textIdx =
            headers.findIndex(
              (header) =>
                header.includes(
                  'feedback',
                ) ||
                header.includes(
                  'review',
                ) ||
                header.includes(
                  'comment',
                ) ||
                header.includes(
                  'description',
                ) ||
                header === 'text',
            );
        }

        for (
          let i = 1;
          i < lines.length;
          i++
        ) {
          const values =
            parseCsvLine(
              lines[i],
            );

          const row =
            csvRowToObject(
              headers,
              values,
            );

          const feedbackText =
            textIdx >= 0
              ? values[textIdx]
              : values[0];

          if (
            feedbackText &&
            feedbackText.trim()
          ) {
            feedbackItems.push(
              row,
            );
          }
        }
      }

      // =====================================================
      // TXT
      // =====================================================

      else {
        feedbackItems =
          text
            .split(/\r?\n/)
            .filter(
              (line) =>
                line.trim(),
            )
            .map(
              (line) => ({
                text:
                  line.trim(),

                source:
                  'File Upload',
              }),
            );
      }

      // =====================================================
      // Validate
      // =====================================================

      if (
        feedbackItems.length ===
        0
      ) {
        throw new Error(
          'No feedback items found in file',
        );
      }

      // =====================================================
      // NORMALIZE RECORDS
      //
      // IMPORTANT FIX:
      //
      // We normalize the keys AGAIN here so that
      // JSON and CSV behave identically.
      //
      // This prevents:
      //
      // Category
      // CATEGORY
      // AI Category
      // category
      //
      // from becoming undefined.
      // =====================================================

      feedbackItems =
        feedbackItems
          .map(
            (rawItem) => {
              const item =
                normalizeObjectKeys(
                  rawItem,
                );

              const textValue =
                getField(
                  item,
                  'text',
                  'feedback',
                  'feedback_text',
                  'customer_feedback',
                  'review',
                  'review_text',
                  'comment',
                  'description',
                  'message',
                );

              const category =
                getField(
                  item,
                  'category',
                  'ai_category',
                  'issue_category',
                  'feedback_category',
                );

              const sentiment =
                getField(
                  item,
                  'sentiment',
                  'ai_sentiment',
                );

              const priority =
                getField(
                  item,
                  'priority',
                  'ai_priority',
                  'original_priority',
                );

              const theme =
                getField(
                  item,
                  'theme',
                  'ai_theme',
                );

              const painPoint =
                getField(
                  item,
                  'pain_point',
                  'painpoint',
                  'pain_point_description',
                );

              const aiRecommendation =
                getField(
                  item,
                  'ai_recommendation',
                  'recommendation',
                  'ai_recommendation_text',
                );

              const normalized = {
                // -------------------------------------------------
                // REQUIRED / CORE
                // -------------------------------------------------

                text:
                  String(
                    textValue ??
                      JSON.stringify(
                        rawItem,
                      ),
                  ).trim(),

                source:
                  getField(
                    item,
                    'source',
                  ) ||
                  'File Upload',

                // -------------------------------------------------
                // CRITICAL UPLOAD LINK
                // -------------------------------------------------

                uploadId:
                  String(
                    uploadId,
                  ),

                feedbackId:
                  getField(
                    item,
                    'feedback_id',
                    'feedbackId',
                    'id',
                  ),

                // -------------------------------------------------
                // AI ANALYSIS
                // -------------------------------------------------

                category,

                sentiment,

                priority,

                theme,

                painPoint,

                aiRecommendation,

                // -------------------------------------------------
                // RATINGS
                // -------------------------------------------------

                rating:
                  toOptionalNumber(
                    getField(
                      item,
                      'rating',
                      'overall_rating',
                    ),
                  ),

                foodRating:
                  toOptionalNumber(
                    getField(
                      item,
                      'food_rating',
                    ),
                  ),

                deliveryRating:
                  toOptionalNumber(
                    getField(
                      item,
                      'delivery_rating',
                    ),
                  ),

                staffRating:
                  toOptionalNumber(
                    getField(
                      item,
                      'staff_rating',
                    ),
                  ),

                ambienceRating:
                  toOptionalNumber(
                    getField(
                      item,
                      'ambience_rating',
                    ),
                  ),

                satisfactionScore:
                  toOptionalNumber(
                    getField(
                      item,
                      'satisfaction_score',
                    ),
                  ),

                recommendScore:
                  toOptionalNumber(
                    getField(
                      item,
                      'recommend_score',
                      'recommendation_score',
                    ),
                  ),

                orderValue:
                  toOptionalNumber(
                    getField(
                      item,
                      'order_value',
                    ),
                  ),

                // -------------------------------------------------
                // CUSTOMER
                // -------------------------------------------------

                customerId:
                  getField(
                    item,
                    'customer_id',
                  ),

                reviewerName:
                  getField(
                    item,
                    'reviewer_name',
                    'reviewer',
                    'customer_name',
                  ),

                // -------------------------------------------------
                // RESTAURANT
                // -------------------------------------------------

                restaurantId:
                  getField(
                    item,
                    'restaurant_id',
                  ),

                restaurantName:
                  getField(
                    item,
                    'restaurant_name',
                  ),

                city:
                  getField(
                    item,
                    'city',
                  ),

                state:
                  getField(
                    item,
                    'state',
                  ),

                language:
                  getField(
                    item,
                    'language',
                  ),

                visitType:
                  getField(
                    item,
                    'visit_type',
                  ),

                // -------------------------------------------------
                // REVIEW
                // -------------------------------------------------

                review:
                  getField(
                    item,
                    'review',
                  ),

                reviewTitle:
                  getField(
                    item,
                    'review_title',
                  ),

                // -------------------------------------------------
                // DELIVERY / ORDER
                // -------------------------------------------------

                orderId:
                  getField(
                    item,
                    'order_id',
                  ),

                deliveryPartner:
                  getField(
                    item,
                    'delivery_partner',
                  ),

                deliveryTime:
                  getField(
                    item,
                    'delivery_time',
                  ),

                // -------------------------------------------------
                // SURVEY
                // -------------------------------------------------

                surveyId:
                  getField(
                    item,
                    'survey_id',
                  ),

                foodQuality:
                  getField(
                    item,
                    'food_quality',
                  ),

                serviceQuality:
                  getField(
                    item,
                    'service_quality',
                  ),

                cleanliness:
                  getField(
                    item,
                    'cleanliness',
                  ),

                // -------------------------------------------------
                // SUPPORT
                // -------------------------------------------------

                ticketId:
                  getField(
                    item,
                    'ticket_id',
                  ),

                issueCategory:
                  getField(
                    item,
                    'issue_category',
                  ),

                originalPriority:
                  getField(
                    item,
                    'original_priority',
                  ),

                status:
                  getField(
                    item,
                    'status',
                  ),

                emailId:
                  getField(
                    item,
                    'email_id',
                  ),

                subject:
                  getField(
                    item,
                    'subject',
                  ),

                // -------------------------------------------------
                // FEATURE REQUEST
                // -------------------------------------------------

                requestId:
                  getField(
                    item,
                    'request_id',
                  ),

                featureCategory:
                  getField(
                    item,
                    'feature_category',
                  ),

                featureTitle:
                  getField(
                    item,
                    'feature_title',
                  ),

                // -------------------------------------------------
                // SOCIAL MEDIA
                // -------------------------------------------------

                postId:
                  getField(
                    item,
                    'post_id',
                  ),

                platform:
                  getField(
                    item,
                    'platform',
                  ),

                username:
                  getField(
                    item,
                    'username',
                  ),

                engagement:
                  getField(
                    item,
                    'engagement',
                  ),

                // -------------------------------------------------
                // CREATED DATE
                // -------------------------------------------------

                createdAt:
                  getField(
                    item,
                    'created_at',
                    'createdAt',
                    'created_date',
                    'date',
                    'timestamp',
                  ),
              };

              return normalized;
            },
          )
          .filter(
            (item) =>
              item.text &&
              item.text.trim(),
          );

      if (
        feedbackItems.length ===
        0
      ) {
        throw new Error(
          'No valid feedback text found in file',
        );
      }

      // =====================================================
      // DEBUG
      // =====================================================

      console.log(
        '========================================',
      );

      console.log(
        '[UPLOAD] UPLOAD ID BEING SENT:',
        uploadId,
      );

      console.log(
        '[UPLOAD] NUMBER OF FEEDBACK ITEMS:',
        feedbackItems.length,
      );

      console.log(
        '[UPLOAD] FIRST NORMALIZED RECORD:',
        feedbackItems[0],
      );

      console.table(
        feedbackItems
          .slice(0, 10)
          .map(
            (item) => ({
              uploadId:
                item.uploadId,

              category:
                item.category,

              sentiment:
                item.sentiment,

              priority:
                item.priority,

              theme:
                item.theme,

              source:
                item.source,
            }),
          ),
      );

      console.log(
        '========================================',
      );

      // =====================================================
      // STEP 3
      // SAVE FEEDBACK
      // =====================================================

      const response =
        await api.post(
          '/feedback',
          feedbackItems,
        );

      const body =
        response.data ?? {};

      const count =
        Number(
          body.count ??
            body.inserted ??
            feedbackItems.length,
        ) || 0;

      // =====================================================
      // STEP 4
      // PARTIAL SUCCESS
      // =====================================================

      if (
        response.status === 207 &&
        Array.isArray(
          body.errors,
        ) &&
        body.errors.length
      ) {
        const summary =
          body.errors
            .slice(0, 3)
            .map(
              (e: any) =>
                `row ${
                  Number(
                    e.index,
                  ) + 1
                } — ${
                  e.field
                }: ${
                  e.message
                }`,
            )
            .join('; ');

        const more =
          body.errors.length >
          3
            ? ` (+${
                body.errors.length -
                3
              } more)`
            : '';

        const detail =
          `${summary}${more}`;

        if (uploadId) {
          await updateUploadRecord(
            uploadId,
            {
              items:
                count,

              failed:
                Number(
                  body.failed,
                ) || 0,

              status:
                'partial',

              error:
                detail,
            },
          );
        }

        setRecentUploads(
          (prev) =>
            prev.map(
              (upload) =>
                upload.id ===
                uploadId
                  ? {
                      ...upload,

                      items:
                        count,

                      status:
                        'partial',

                      failed:
                        Number(
                          body.failed,
                        ) || 0,

                      error:
                        detail,
                    }
                  : upload,
            ),
        );

        toast.warning(
          `${file.name}: ${count} imported, ${
            body.failed ?? 0
          } failed`,
          {
            description:
              detail,
          },
        );
      }

      // =====================================================
      // STEP 5
      // COMPLETE SUCCESS
      // =====================================================

      else {
        if (uploadId) {
          await updateUploadRecord(
            uploadId,
            {
              items:
                count,

              failed: 0,

              status:
                'completed',
            },
          );
        }

        setRecentUploads(
          (prev) =>
            prev.map(
              (upload) =>
                upload.id ===
                uploadId
                  ? {
                      ...upload,

                      items:
                        count,

                      status:
                        'completed',

                      failed: 0,

                      error:
                        undefined,
                    }
                  : upload,
            ),
        );

        toast.success(
          `${file.name}: ${count} feedback ${
            count === 1
              ? 'record'
              : 'records'
          } imported`,
        );
      }

      // =====================================================
      // STEP 6
      // REFRESH DASHBOARD DATA
      // =====================================================

      await fetchStats({
        method: 'GET',
        url: '/stats',
      });

      await fetchRecentUploads();
    } catch (err: any) {
      const res =
        err.response?.data;

      const rowErrors =
        Array.isArray(
          res?.errors,
        ) &&
        res.errors.length
          ? res.errors
              .slice(0, 3)
              .map(
                (e: any) =>
                  `row ${
                    Number(
                      e.index,
                    ) + 1
                  } — ${
                    e.field
                  }: ${
                    e.message
                  }`,
              )
              .join('; ') +
            (res.errors.length >
            3
              ? ` (+${
                  res.errors.length -
                  3
                } more)`
              : '')
          : null;

      const detail =
        Array.isArray(
          res?.details,
        ) &&
        res.details.length
          ? res.details
              .map(
                (d: any) =>
                  `${
                    Array.isArray(
                      d.path,
                    )
                      ? d.path.join(
                          '.',
                        )
                      : d.path
                  }: ${
                    d.message
                  }`,
              )
              .join('; ')
          : null;

      const message =
        rowErrors ||
        detail ||
        res?.error ||
        err.message ||
        'Upload failed';

      if (uploadId) {
        try {
          await updateUploadRecord(
            uploadId,
            {
              status:
                'failed',

              error:
                message,
            },
          );
        } catch (
          updateError
        ) {
          console.error(
            'Failed to update upload status:',
            updateError,
          );
        }
      }

      setRecentUploads(
        (prev) =>
          prev.map(
            (upload) =>
              upload.id ===
              uploadId
                ? {
                    ...upload,

                    status:
                      'failed',

                    error:
                      message,
                  }
                : upload,
          ),
      );

      toast.error(
        `${file.name} failed`,
        {
          description:
            message,
        },
      );
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------------------------------
  // Handle files
  // -------------------------------------------------------

  const handleFiles = (
    files: FileList | null,
  ) => {
    if (!files) return;

    Array.from(files).forEach(
      (file) => {
        void processFile(file);
      },
    );
  };

  // -------------------------------------------------------
  // Drag/drop
  // -------------------------------------------------------

  const handleDragOver = (
    e: React.DragEvent,
  ) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (
    e: React.DragEvent,
  ) => {
    e.preventDefault();

    setIsDragging(false);

    handleFiles(
      e.dataTransfer.files,
    );
  };

  // -------------------------------------------------------
  // Select files
  // -------------------------------------------------------

  const handleSelectFiles =
    () => {
      fileInputRef.current?.click();
    };

  // -------------------------------------------------------
  // Data sources
  // -------------------------------------------------------

  const dataSources =
    statsData?.bySource || [];

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Feedback Ingestion
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            Upload and manage customer feedback from multiple sources
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">

            {/* Upload */}

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>
                  Upload Feedback
                </CardTitle>

                <CardDescription>
                  Support CSV, JSON, and plain text formats
                </CardDescription>
              </CardHeader>

              <CardContent>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    handleFiles(
                      e.target.files,
                    )
                  }
                />

                <div
                  onDragOver={
                    handleDragOver
                  }
                  onDragLeave={
                    handleDragLeave
                  }
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >

                  {isUploading ? (
                    <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                  ) : (
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  )}

                  <p className="text-muted-foreground mb-2">
                    Drag and drop your files here or click to browse
                  </p>

                  <p className="text-xs text-muted-foreground mb-4">
                    CSV, JSON, TXT • Max 50MB per file
                  </p>

                  <Button
                    onClick={
                      handleSelectFiles
                    }
                    disabled={
                      isUploading
                    }
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isUploading
                      ? 'Uploading...'
                      : 'Select Files'}
                  </Button>

                </div>
              </CardContent>
            </Card>

            {/* Recent Uploads */}

            <Card className="bg-card border-border">
              <CardHeader>

                <CardTitle>
                  Recent Uploads
                </CardTitle>

                <CardDescription>
                  {recentUploads.length >
                  0
                    ? 'Your uploaded feedback files'
                    : 'No uploads yet'}
                </CardDescription>

              </CardHeader>

              <CardContent>

                {recentUploads.length >
                0 ? (
                  <Table>

                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">

                        <TableHead className="text-muted-foreground">
                          FILE NAME
                        </TableHead>

                        <TableHead className="text-muted-foreground">
                          DATE
                        </TableHead>

                        <TableHead className="text-muted-foreground">
                          ITEMS
                        </TableHead>

                        <TableHead className="text-muted-foreground">
                          STATUS
                        </TableHead>

                      </TableRow>
                    </TableHeader>

                    <TableBody>

                      {recentUploads.map(
                        (upload) => (
                          <TableRow
                            key={
                              upload.id
                            }
                            className="border-border hover:bg-secondary/30 transition-colors"
                          >

                            <TableCell className="font-medium text-foreground">

                              <div className="flex items-center gap-2">

                                <FileText className="w-4 h-4 text-muted-foreground" />

                                <span>
                                  {
                                    upload.name
                                  }
                                </span>

                              </div>

                            </TableCell>

                            <TableCell className="text-muted-foreground">
                              {
                                upload.date
                              }
                            </TableCell>

                            <TableCell className="text-foreground">
                              {
                                upload.items
                              }
                            </TableCell>

                            <TableCell>

                              {upload.status ===
                                'uploading' && (
                                <Badge
                                  variant="outline"
                                  className="border-primary text-primary"
                                >
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  uploading
                                </Badge>
                              )}

                              {upload.status ===
                                'completed' && (
                                <Badge
                                  variant="outline"
                                  className="border-chart-1 text-chart-1"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  completed
                                </Badge>
                              )}

                              {upload.status ===
                                'partial' && (
                                <div className="space-y-1">

                                  <Badge
                                    variant="outline"
                                    className="border-chart-3 text-chart-3"
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />

                                    {
                                      upload.items
                                    }{' '}
                                    imported,{' '}
                                    {
                                      upload.failed ??
                                      0
                                    }{' '}
                                    failed
                                  </Badge>

                                  {upload.error && (
                                    <p className="text-xs text-muted-foreground max-w-xs">
                                      {
                                        upload.error
                                      }
                                    </p>
                                  )}

                                </div>
                              )}

                              {upload.status ===
                                'failed' && (
                                <div className="space-y-1">

                                  <Badge
                                    variant="outline"
                                    className="border-destructive text-destructive"
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    failed
                                  </Badge>

                                  {upload.error && (
                                    <p className="text-xs text-destructive max-w-xs">
                                      {
                                        upload.error
                                      }
                                    </p>
                                  )}

                                </div>
                              )}

                            </TableCell>

                          </TableRow>
                        ),
                      )}

                    </TableBody>

                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Upload a file to see it here.
                    Your upload history is saved in MongoDB.
                  </p>
                )}

              </CardContent>
            </Card>

            {/* Deep Analysis */}

            <Card className="bg-card border-border">

              <CardHeader>

                <div className="flex items-center gap-2">

                  <Sparkles className="w-5 h-5 text-primary" />

                  <CardTitle>
                    Deep Analysis (Groq + Preprocessing)
                  </CardTitle>

                </div>

                <CardDescription>
                  Upload a CSV to run the full pipeline:
                  validate → clean → normalize →
                  feature-engineer → Groq batch analysis →
                  trend &amp; cluster extraction.
                </CardDescription>

              </CardHeader>

              <CardContent className="space-y-4">

                <input
                  ref={
                    pipelineInputRef
                  }
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file =
                      e.target.files?.[0];

                    if (file) {
                      void runPipelineAnalysis(
                        file,
                      );
                    }

                    e.target.value =
                      '';
                  }}
                />

                <div
                  onDragOver={(e) =>
                    e.preventDefault()
                  }
                  onDrop={(e) => {
                    e.preventDefault();

                    const file =
                      e.dataTransfer
                        .files?.[0];

                    if (file) {
                      void runPipelineAnalysis(
                        file,
                      );
                    }
                  }}
                  className="border-2 border-dashed border-primary/40 rounded-lg p-8 text-center transition-colors hover:border-primary/70 hover:bg-primary/5"
                >

                  {isPipelineRunning ? (
                    <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-primary/60 mx-auto mb-3" />
                  )}

                  <p className="text-muted-foreground mb-1 text-sm">
                    Drop a CSV for end-to-end Groq analysis
                  </p>

                  <p className="text-xs text-muted-foreground mb-4">
                    Returns themes, pain points, trends &amp; feature clusters
                  </p>

                  <Button
                    onClick={() =>
                      pipelineInputRef.current?.click()
                    }
                    disabled={
                      isPipelineRunning
                    }
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10 gap-2"
                    id="pipeline-upload-btn"
                  >

                    {isPipelineRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analysing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Run Deep Analysis
                      </>
                    )}

                  </Button>

                </div>

                {pipelineError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">

                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />

                    <span>
                      {
                        pipelineError
                      }
                    </span>

                  </div>
                )}

                {pipelineResult && (
                  <div
                    className="space-y-5 mt-2"
                    id="pipeline-results"
                  >

                    <div className="flex flex-wrap gap-3">

                      <Badge
                        variant="outline"
                        className="text-xs border-chart-1 text-chart-1"
                      >
                        {
                          pipelineResult.rows
                        }{' '}
                        rows uploaded
                      </Badge>

                      <Badge
                        variant="outline"
                        className="text-xs border-chart-2 text-chart-2"
                      >
                        {
                          pipelineResult.processed_rows
                        }{' '}
                        records analysed
                      </Badge>

                      <Badge
                        variant="outline"
                        className="text-xs border-primary text-primary"
                      >
                        {
                          pipelineResult.filename
                        }
                      </Badge>

                    </div>

                    {pipelineResult
                      .theme_extraction
                      ?.length >
                      0 && (
                      <div>

                        <div className="flex items-center gap-2 mb-2">

                          <FileText className="w-4 h-4 text-chart-1" />

                          <h4 className="text-sm font-semibold text-foreground">
                            Theme Extraction
                          </h4>

                          <span className="text-xs text-muted-foreground">
                            (
                            {
                              pipelineResult
                                .theme_extraction
                                .length
                            }{' '}
                            records)
                          </span>

                        </div>

                        <div className="rounded-lg border border-border overflow-hidden">

                          <Table>

                            <TableHeader>

                              <TableRow className="border-border bg-secondary/30">

                                <TableHead className="text-xs text-muted-foreground w-1/2">
                                  Feedback
                                </TableHead>

                                <TableHead className="text-xs text-muted-foreground">
                                  Theme
                                </TableHead>

                                <TableHead className="text-xs text-muted-foreground">
                                  Pain Point
                                </TableHead>

                              </TableRow>

                            </TableHeader>

                            <TableBody>

                              {pipelineResult.theme_extraction
                                .slice(
                                  0,
                                  5,
                                )
                                .map(
                                  (
                                    item,
                                    i,
                                  ) => (
                                    <TableRow
                                      key={
                                        i
                                      }
                                      className="border-border hover:bg-secondary/30"
                                    >

                                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                        {
                                          item.feedback
                                        }
                                      </TableCell>

                                      <TableCell>

                                        <Badge
                                          variant="outline"
                                          className="text-xs border-chart-1 text-chart-1 whitespace-nowrap"
                                        >
                                          {
                                            item.theme
                                          }
                                        </Badge>

                                      </TableCell>

                                      <TableCell className="text-xs text-muted-foreground">
                                        {
                                          item.pain_point
                                        }
                                      </TableCell>

                                    </TableRow>
                                  ),
                                )}

                            </TableBody>

                          </Table>

                          {pipelineResult
                            .theme_extraction
                            .length >
                            5 && (
                            <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">
                              +{' '}
                              {pipelineResult
                                .theme_extraction
                                .length -
                                5}{' '}
                              more records
                            </p>
                          )}

                        </div>

                      </div>
                    )}

                    {pipelineResult
                      .trend_analysis &&
                      Object.keys(
                        pipelineResult.trend_analysis,
                      ).length >
                        0 && (
                        <div>

                          <div className="flex items-center gap-2 mb-2">

                            <TrendingUp className="w-4 h-4 text-chart-2" />

                            <h4 className="text-sm font-semibold text-foreground">
                              Trend Analysis
                            </h4>

                          </div>

                          <div className="flex flex-wrap gap-2">

                            {Object.entries(
                              pipelineResult.trend_analysis,
                            )
                              .sort(
                                (
                                  [, a],
                                  [, b],
                                ) =>
                                  b - a,
                              )
                              .slice(
                                0,
                                12,
                              )
                              .map(
                                ([
                                  theme,
                                  count,
                                ]) => (
                                  <div
                                    key={
                                      theme
                                    }
                                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-chart-2/10 border border-chart-2/30"
                                  >

                                    <span className="text-xs text-foreground">
                                      {
                                        theme
                                      }
                                    </span>

                                    <span className="text-xs font-bold text-chart-2 ml-1">
                                      {
                                        count
                                      }
                                    </span>

                                  </div>
                                ),
                              )}

                          </div>

                        </div>
                      )}

                    {pipelineResult
                      .feature_clusters &&
                      Object.keys(
                        pipelineResult.feature_clusters,
                      ).length >
                        0 && (
                        <div>

                          <div className="flex items-center gap-2 mb-2">

                            <Layers className="w-4 h-4 text-primary" />

                            <h4 className="text-sm font-semibold text-foreground">
                              Feature Clusters
                            </h4>

                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                            {Object.entries(
                              pipelineResult.feature_clusters,
                            ).map(
                              ([
                                cluster,
                                items,
                              ]) => (
                                <div
                                  key={
                                    cluster
                                  }
                                  className="rounded-lg border border-border bg-secondary/30 p-3"
                                >

                                  <p className="text-xs font-semibold text-primary mb-2">
                                    {
                                      cluster
                                    }
                                  </p>

                                  <div className="flex flex-wrap gap-1">

                                    {items
                                      .slice(
                                        0,
                                        6,
                                      )
                                      .map(
                                        (
                                          item,
                                          i,
                                        ) => (
                                          <Badge
                                            key={
                                              i
                                            }
                                            variant="outline"
                                            className="text-xs border-border text-muted-foreground"
                                          >
                                            {
                                              item
                                            }
                                          </Badge>
                                        ),
                                      )}

                                    {items.length >
                                      6 && (
                                      <span className="text-xs text-muted-foreground">
                                        +
                                        {
                                          items.length -
                                          6
                                        }{' '}
                                        more
                                      </span>
                                    )}

                                  </div>

                                </div>
                              ),
                            )}

                          </div>

                        </div>
                      )}

                  </div>
                )}

              </CardContent>
            </Card>
          </div>

          {/* Data Sources */}

          <div>
            <Card className="bg-card border-border">

              <CardHeader>
                <CardTitle>
                  Data Sources
                </CardTitle>

                <CardDescription>
                  Feedback by source from backend
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">

                {dataSources.length >
                0 ? (
                  dataSources.map(
                    (
                      source: any,
                      idx: number,
                    ) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors"
                      >

                        <div className="flex items-start justify-between gap-2">

                          <div className="flex-1">

                            <p className="font-medium text-foreground text-sm">
                              {
                                source.name ||
                                'Unknown'
                              }
                            </p>

                            <p className="text-xs text-muted-foreground mt-1">
                              {(
                                source.value ??
                                0
                              ).toLocaleString()}{' '}
                              items
                            </p>

                          </div>

                          <Badge
                            variant="outline"
                            className="border-chart-1 text-chart-1 text-xs"
                          >
                            Active
                          </Badge>

                        </div>

                      </div>
                    ),
                  )
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No source data available
                  </p>
                )}

                <Button
                  onClick={() =>
                    setSourceOpen(
                      true,
                    )
                  }
                  variant="outline"
                  className="w-full border-border hover:bg-secondary mt-4 gap-2"
                  data-testid="feedback-add-source"
                >
                  <Plus className="w-4 h-4" />
                  Add Source
                </Button>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Source Dialog */}

      {sourceOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() =>
            setSourceOpen(false)
          }
        >

          <form
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl space-y-4"
            onClick={(e) =>
              e.stopPropagation()
            }
            onSubmit={
              handleAddSource
            }
            data-testid="source-dialog"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h3 className="text-lg font-bold text-foreground">
                  Add a feedback source
                </h3>

                <p className="text-sm text-muted-foreground mt-1">
                  Creates the source with a first entry. Bulk rows still come from CSV upload.
                </p>

              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() =>
                  setSourceOpen(
                    false,
                  )
                }
              >
                <X className="w-4 h-4" />
              </Button>

            </div>

            <div className="space-y-2">

              <label
                className="text-sm font-medium text-foreground"
                htmlFor="source-name"
              >
                Source name
              </label>

              <Input
                id="source-name"
                data-testid="source-name"
                value={sourceName}
                onChange={(e) =>
                  setSourceName(
                    e.target.value,
                  )
                }
                placeholder="e.g. Intercom"
                disabled={
                  isAddingSource
                }
                className="bg-secondary/50 border-border"
              />

            </div>

            <div className="space-y-2">

              <label
                className="text-sm font-medium text-foreground"
                htmlFor="source-text"
              >
                First feedback entry
              </label>

              <textarea
                id="source-text"
                data-testid="source-text"
                value={sourceText}
                onChange={(e) =>
                  setSourceText(
                    e.target.value,
                  )
                }
                placeholder="Paste a representative piece of feedback"
                disabled={
                  isAddingSource
                }
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm resize-none"
              />

            </div>

            <div className="flex gap-3 justify-end">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSourceOpen(
                    false,
                  )
                }
                disabled={
                  isAddingSource
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  isAddingSource
                }
                className="bg-primary hover:bg-primary/90 gap-2"
                data-testid="source-confirm"
              >

                {isAddingSource && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}

                Add source

              </Button>

            </div>

          </form>

        </div>
      )}
    </div>
  );
}