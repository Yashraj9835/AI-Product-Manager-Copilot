import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';

import {
  TrendingUp,
  TrendingDown,
  Upload,
  Settings,
  AlertCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';

import { useApi } from '@/hooks/useApi';

const COLORS = [
  'oklch(0.55 0.24 260)',
  'oklch(0.60 0.18 140)',
  'oklch(0.70 0.20 60)',
  'oklch(0.50 0.20 280)',
  'oklch(0.60 0.20 320)',
  'oklch(0.65 0.18 200)',
];

interface UploadRecord {
  _id: string;
  name: string;
  items: number;
  failed?: number;
  status: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FeedbackRecord {
  _id?: string;
  feedbackId?: string;
  uploadId?: string;

  text?: string;

  category?: string;
  theme?: string;
  painPoint?: string;

  sentiment?: string;
  priority?: string;
  source?: string;

  createdAt?: string;
  updatedAt?: string;
}

interface PRDRecord {
  _id?: string;
  title?: string;
  status?: string;
  sections?: any[];
  updatedAt?: string;
}

interface ChartDatum {
  name: string;
  value: number;
}

interface StatsData {
  total: number;
  byCategory: ChartDatum[];
  bySentiment: ChartDatum[];
  byPriority: ChartDatum[];
  bySource: ChartDatum[];
  byTheme?: ChartDatum[];
  upload?: {
    id: string;
    name: string;
    items: number;
    failed?: number;
    status: string;
    createdAt?: string;
  } | null;
}

export default function Dashboard() {
  // =========================================================
  // API STATE
  // =========================================================

  const {
    data: uploadsData,
    isLoading: isUploadsLoading,
    error: uploadsError,
    fetchData: fetchUploads,
  } = useApi<any>();

  const {
    data: statsData,
    isLoading: isStatsLoading,
    error: statsError,
    fetchData: fetchStats,
  } = useApi<StatsData>();

  const {
    data: feedbackData,
    isLoading: isFeedbackLoading,
    error: feedbackError,
    fetchData: fetchFeedback,
  } = useApi<any>();

  const {
    data: prdData,
    fetchData: fetchPRDs,
  } = useApi<any>();

  // =========================================================
  // SELECTED UPLOAD
  // =========================================================

  const [selectedUploadId, setSelectedUploadId] =
    useState<string>('');

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [hasInitializedUpload, setHasInitializedUpload] =
    useState(false);

  // =========================================================
  // NORMALIZE UPLOAD DATA
  // =========================================================

  const uploads: UploadRecord[] = useMemo(() => {
    if (!uploadsData) {
      return [];
    }

    if (Array.isArray(uploadsData)) {
      return uploadsData;
    }

    if (Array.isArray(uploadsData.data)) {
      return uploadsData.data;
    }

    return [];
  }, [uploadsData]);

  // Only completed uploads can be selected.
  const completedUploads = useMemo(() => {
    return [...uploads]
      .filter(
        (upload) =>
          upload.status === 'completed' &&
          upload._id,
      )
      .sort(
        (a, b) =>
          new Date(
            b.createdAt || 0,
          ).getTime() -
          new Date(
            a.createdAt || 0,
          ).getTime(),
      );
  }, [uploads]);

  // =========================================================
  // ACTIVE UPLOAD
  // =========================================================

  const selectedUpload = useMemo(() => {
    if (!selectedUploadId) {
      return null;
    }

    return (
      completedUploads.find(
        (upload) =>
          String(upload._id) ===
          String(selectedUploadId),
      ) || null
    );
  }, [
    completedUploads,
    selectedUploadId,
  ]);

  // =========================================================
  // LOAD UPLOAD HISTORY
  // =========================================================

  const loadUploads = async () => {
    await fetchUploads({
      method: 'GET',
      url: '/uploads',
    });
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadUploads().catch((error) => {
      console.error(
        'Failed to load uploads:',
        error,
      );
    });

    fetchPRDs({
      method: 'GET',
      url: '/prd',
    }).catch(() => {
      // PRDs are independent from dashboard data.
    });
  }, [
    fetchUploads,
    fetchPRDs,
  ]);

  // =========================================================
  // AUTOMATICALLY SELECT NEWEST COMPLETED UPLOAD
  // ONLY ON FIRST LOAD
  // =========================================================

  useEffect(() => {
    if (
      hasInitializedUpload ||
      completedUploads.length === 0
    ) {
      return;
    }

    const newestUpload =
      completedUploads[0];

    if (newestUpload?._id) {
      setSelectedUploadId(
        String(newestUpload._id),
      );

      setHasInitializedUpload(true);
    }
  }, [
    completedUploads,
    hasInitializedUpload,
  ]);

  // =========================================================
  // LOAD DATA FOR SELECTED UPLOAD
  // =========================================================

  useEffect(() => {
    if (!selectedUploadId) {
      return;
    }

    const loadSelectedDataset = async () => {
      try {
        /*
         * IMPORTANT:
         *
         * Stats is filtered by uploadId.
         *
         * This is what makes:
         *
         * 5000 records -> 5000
         * 10 records   -> 10
         *
         * instead of always showing the first 100 records.
         */

        await fetchStats({
          method: 'GET',
          url: '/stats',
          params: {
            uploadId: selectedUploadId,
          },
        });

        /*
         * Feedback records are used only for
         * the weekly volume chart.
         *
         * Dashboard totals/charts use /stats.
         */
        await fetchFeedback({
          method: 'GET',
          url: '/feedback',
          params: {
            uploadId: selectedUploadId,
            limit: 100,
          },
        });
      } catch (error) {
        console.error(
          'Failed to load selected dataset:',
          error,
        );
      }
    };

    loadSelectedDataset();
  }, [
    selectedUploadId,
    fetchStats,
    fetchFeedback,
  ]);

  // =========================================================
  // REFRESH
  // =========================================================

  const loadDashboard = async () => {
    setIsRefreshing(true);

    try {
      /*
       * Reload uploads first.
       *
       * We DO NOT automatically change selectedUploadId.
       * This is important because the user may have manually
       * selected an older dataset.
       */

      await loadUploads();

      /*
       * Reload currently selected dataset.
       */

      if (selectedUploadId) {
        await fetchStats({
          method: 'GET',
          url: '/stats',
          params: {
            uploadId: selectedUploadId,
          },
        });

        await fetchFeedback({
          method: 'GET',
          url: '/feedback',
          params: {
            uploadId: selectedUploadId,
            limit: 100,
          },
        });
      }
    } catch (error) {
      console.error(
        'Failed to refresh dashboard:',
        error,
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // =========================================================
  // FEEDBACK NORMALIZATION
  // =========================================================

  const feedbackList: FeedbackRecord[] =
    useMemo(() => {
      if (!feedbackData) {
        return [];
      }

      if (Array.isArray(feedbackData)) {
        return feedbackData;
      }

      if (
        Array.isArray(
          feedbackData.data,
        )
      ) {
        return feedbackData.data;
      }

      return [];
    }, [feedbackData]);

  // =========================================================
  // PRD NORMALIZATION
  // =========================================================

  const prdList: PRDRecord[] =
    useMemo(() => {
      if (!prdData) {
        return [];
      }

      if (Array.isArray(prdData)) {
        return prdData;
      }

      if (
        Array.isArray(
          prdData.data,
        )
      ) {
        return prdData.data;
      }

      return [];
    }, [prdData]);

  // =========================================================
  // STATS DATA
  // =========================================================

  const dashboardStats: StatsData = useMemo(() => {
    return {
      total:
        Number(
          statsData?.total,
        ) || 0,

      byCategory:
        Array.isArray(
          statsData?.byCategory,
        )
          ? statsData.byCategory
          : [],

      bySentiment:
        Array.isArray(
          statsData?.bySentiment,
        )
          ? statsData.bySentiment
          : [],

      byPriority:
        Array.isArray(
          statsData?.byPriority,
        )
          ? statsData.byPriority
          : [],

      bySource:
        Array.isArray(
          statsData?.bySource,
        )
          ? statsData.bySource
          : [],

      byTheme:
        Array.isArray(
          statsData?.byTheme,
        )
          ? statsData.byTheme
          : [],

      upload:
        statsData?.upload || null,
    };
  }, [statsData]);

  // =========================================================
  // TOTAL
  // =========================================================

  const total =
    dashboardStats.total;

  // =========================================================
  // CATEGORY DATA
  // =========================================================

  const categoryCounts =
    dashboardStats.byCategory;

  // =========================================================
  // SENTIMENT DATA
  // =========================================================

  const sentimentData =
    dashboardStats.bySentiment;

  // =========================================================
  // SOURCE DATA
  // =========================================================

  const sourceData =
    dashboardStats.bySource;

  // =========================================================
  // HIGH PRIORITY
  // =========================================================

  const highPriority =
    dashboardStats.byPriority.find(
      (item) =>
        String(
          item.name,
        ).toLowerCase() ===
        'high',
    )?.value || 0;

  // =========================================================
  // THEMES
  // =========================================================

  const themesFound =
    dashboardStats.byTheme &&
    dashboardStats.byTheme.length > 0
      ? dashboardStats.byTheme.length
      : categoryCounts.length;

  // =========================================================
  // FEEDBACK VOLUME
  // =========================================================

  const feedbackVolumeData =
    useMemo(() => {
      if (
        feedbackList.length === 0
      ) {
        return Array.from(
          { length: 8 },
          (_, index) => ({
            week: `W${index + 1}`,
            feedback: 0,
            themes: 0,
          }),
        );
      }

      const dates =
        feedbackList
          .map(
            (item) =>
              new Date(
                item.createdAt ||
                  item.updatedAt ||
                  0,
              ),
          )
          .filter(
            (date) =>
              !Number.isNaN(
                date.getTime(),
              ),
          );

      const latestDate =
        dates.length > 0
          ? new Date(
              Math.max(
                ...dates.map(
                  (date) =>
                    date.getTime(),
                ),
              ),
            )
          : new Date();

      return Array.from(
        { length: 8 },
        (_, index) => {
          const end =
            new Date(
              latestDate,
            );

          end.setDate(
            end.getDate() -
              (7 - index) * 7,
          );

          const start =
            new Date(end);

          start.setDate(
            start.getDate() - 6,
          );

          const items =
            feedbackList.filter(
              (feedback) => {
                const createdAt =
                  new Date(
                    feedback.createdAt ||
                      feedback.updatedAt ||
                      0,
                  );

                return (
                  createdAt >=
                    start &&
                  createdAt <= end
                );
              },
            );

          const themes =
            new Set(
              items
                .map(
                  (item) =>
                    item.theme ||
                    item.category,
                )
                .filter(Boolean),
            ).size;

          return {
            week: `W${index + 1}`,
            feedback:
              items.length,
            themes,
          };
        },
      );
    }, [feedbackList]);

  // =========================================================
  // TOP CATEGORIES
  // =========================================================

  const topCategories =
    categoryCounts
      .slice(0, 8)
      .map(
        (category, index) => ({
          theme:
            category.name,

          count:
            category.value,

          trend: 'Current',

          severity:
            category.value >=
            Math.max(
              1,
              total * 0.2,
            )
              ? 'High'
              : category.value >=
                  Math.max(
                    1,
                    total * 0.1,
                  )
                ? 'Medium'
                : 'Low',

          color:
            COLORS[
              index %
                COLORS.length
            ],
        }),
      );

  // =========================================================
  // PRDS
  // =========================================================

  const recentPRDsData =
    prdList
      .slice(0, 4)
      .map((prd) => ({
        id: prd._id,

        title:
          prd.title ||
          'Untitled PRD',

        date:
          prd.updatedAt
            ? new Date(
                prd.updatedAt,
              ).toLocaleDateString()
            : '—',

        status:
          prd.status === 'ready'
            ? 'Ready'
            : prd.status === 'review'
              ? 'Review'
              : 'Draft',

        sections:
          Array.isArray(
            prd.sections,
          )
            ? prd.sections.length
            : 0,
      }));

  // =========================================================
  // LOADING
  // =========================================================

  if (
    isUploadsLoading ||
    isStatsLoading ||
    isFeedbackLoading
  ) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />

          <p className="text-muted-foreground">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (
    uploadsError ||
    statsError ||
    feedbackError
  ) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-destructive max-w-md text-center">
          <AlertCircle className="w-12 h-12" />

          <p className="text-lg font-semibold">
            Failed to load dashboard
          </p>

          <p className="text-sm">
            {uploadsError ||
              statsError ||
              feedbackError}
          </p>

          <Button
            onClick={() =>
              loadDashboard()
            }
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================
  // NO UPLOADS
  // =========================================================

  if (
    completedUploads.length === 0
  ) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Dashboard
              </h1>

              <p className="text-sm text-muted-foreground mt-1">
                No uploaded dataset selected
              </p>
            </div>

            <Link href="/feedback">
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Card className="border-primary/30">
            <CardContent className="py-16 text-center">
              <FileText className="w-12 h-12 text-primary mx-auto mb-4" />

              <h2 className="text-xl font-semibold mb-2">
                No completed uploads
              </h2>

              <p className="text-sm text-muted-foreground mb-6">
                Upload a CSV, JSON, or TXT file
                from Feedback Ingestion.
              </p>

              <Link href="/feedback">
                <Button className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import Data
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold">
              Dashboard
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              {selectedUpload
                ? `Showing data from ${selectedUpload.name}`
                : 'Select a dataset'}
            </p>
          </div>

          <div className="flex gap-3">

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                loadDashboard()
              }
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isRefreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />

              Refresh
            </Button>

            <Link href="/settings">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>

            <Link href="/feedback">
              <Button
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
            </Link>

          </div>
        </div>
      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="container mx-auto px-4 py-8">

        {/* ===================================================
            DATASET SELECTOR
        =================================================== */}

        <Card className="mb-8 border-primary/30 bg-primary/5">

          <CardHeader>
            <CardTitle>
              Dashboard Dataset
            </CardTitle>

            <CardDescription>
              Select any completed upload to
              analyze that dataset.
            </CardDescription>
          </CardHeader>

          <CardContent>

            <select
              value={selectedUploadId}
              onChange={(event) => {
                const id =
                  event.target.value;

                setSelectedUploadId(id);
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            >

              <option value="">
                Select a dataset
              </option>

              {completedUploads.map(
                (upload) => (
                  <option
                    key={upload._id}
                    value={upload._id}
                  >
                    {upload.name} —{' '}
                    {Number(
                      upload.items || 0,
                    ).toLocaleString()}{' '}
                    records
                  </option>
                ),
              )}

            </select>

            {selectedUpload && (
              <div className="mt-4 flex flex-wrap items-center gap-3">

                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />

                  <span className="text-sm font-medium">
                    {selectedUpload.name}
                  </span>
                </div>

                <Badge
                  variant="outline"
                  className="border-chart-1 text-chart-1"
                >
                  {Number(
                    selectedUpload.items ||
                      0,
                  ).toLocaleString()}{' '}
                  records
                </Badge>

                <Badge
                  variant="outline"
                  className="border-primary text-primary"
                >
                  {selectedUpload.status}
                </Badge>

              </div>
            )}

          </CardContent>
        </Card>

        {/* ===================================================
            KPI CARDS
        =================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          {/* TOTAL FEEDBACK */}

          <Card className="bg-card border-border hover:shadow-lg transition-shadow">

            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                TOTAL FEEDBACK
              </CardTitle>
            </CardHeader>

            <CardContent>

              <span className="text-4xl font-bold">
                {total.toLocaleString()}
              </span>

              <div className="flex items-center gap-1 mt-2 text-sm">

                <TrendingUp className="w-4 h-4 text-chart-1" />

                <span className="text-chart-1">
                  From selected upload
                </span>

              </div>

            </CardContent>
          </Card>

          {/* THEMES */}

          <Card className="bg-card border-border hover:shadow-lg transition-shadow">

            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                THEMES FOUND
              </CardTitle>
            </CardHeader>

            <CardContent>

              <span className="text-4xl font-bold">
                {themesFound}
              </span>

              <div className="flex items-center gap-1 mt-2 text-sm">

                <TrendingUp className="w-4 h-4 text-chart-1" />

                <span className="text-chart-1">
                  In this dataset
                </span>

              </div>

            </CardContent>
          </Card>

          {/* HIGH PRIORITY */}

          <Card className="bg-card border-border hover:shadow-lg transition-shadow">

            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                HIGH PRIORITY
              </CardTitle>
            </CardHeader>

            <CardContent>

              <span className="text-4xl font-bold">
                {highPriority.toLocaleString()}
              </span>

              <div className="flex items-center gap-1 mt-2 text-sm">

                <TrendingDown className="w-4 h-4 text-chart-3" />

                <span className="text-chart-3">
                  Needs attention
                </span>

              </div>

            </CardContent>
          </Card>

          {/* PRDS */}

          <Card className="bg-card border-border hover:shadow-lg transition-shadow">

            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                PRDS GENERATED
              </CardTitle>
            </CardHeader>

            <CardContent>

              <span
                className="text-4xl font-bold"
                data-testid="prd-count"
              >
                {prdList.length}
              </span>

              <div className="flex items-center gap-1 mt-2 text-sm">

                <TrendingUp className="w-4 h-4 text-chart-1" />

                <span className="text-chart-1">
                  {
                    prdList.filter(
                      (prd) =>
                        prd.status ===
                        'ready',
                    ).length
                  }{' '}
                  ready
                </span>

              </div>

            </CardContent>
          </Card>

        </div>

        {/* ===================================================
            CHARTS
        =================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* FEEDBACK VOLUME */}

          <Card className="lg:col-span-2 bg-card border-border">

            <CardHeader>

              <CardTitle>
                Feedback Volume
              </CardTitle>

              <CardDescription>
                Feedback and themes from{' '}
                {selectedUpload?.name}
              </CardDescription>

            </CardHeader>

            <CardContent>

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <LineChart
                  data={
                    feedbackVolumeData
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.25 0.02 280)"
                  />

                  <XAxis
                    dataKey="week"
                    stroke="oklch(0.65 0.02 280)"
                  />

                  <YAxis
                    stroke="oklch(0.65 0.02 280)"
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        'oklch(0.18 0.01 280)',
                      border:
                        '1px solid oklch(0.25 0.02 280)',
                      borderRadius:
                        '0.65rem',
                    }}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="feedback"
                    stroke="oklch(0.55 0.24 260)"
                    strokeWidth={2}
                  />

                  <Line
                    type="monotone"
                    dataKey="themes"
                    stroke="oklch(0.60 0.18 140)"
                    strokeWidth={2}
                  />

                </LineChart>

              </ResponsiveContainer>

            </CardContent>
          </Card>

          {/* SENTIMENT */}

          <Card className="bg-card border-border">

            <CardHeader>

              <CardTitle>
                Sentiment
              </CardTitle>

              <CardDescription>
                Sentiment distribution
              </CardDescription>

            </CardHeader>

            <CardContent>

              {sentimentData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >

                  <PieChart>

                    <Pie
                      data={
                        sentimentData
                      }
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >

                      {sentimentData.map(
                        (
                          _entry,
                          index,
                        ) => (
                          <Cell
                            key={`sentiment-${index}`}
                            fill={
                              COLORS[
                                index %
                                  COLORS.length
                              ]
                            }
                          />
                        ),
                      )}

                    </Pie>

                    <Tooltip />

                    <Legend
                      verticalAlign="bottom"
                      height={36}
                    />

                  </PieChart>

                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No sentiment data
                </div>
              )}

            </CardContent>
          </Card>

        </div>

        {/* ===================================================
            SOURCE + CATEGORY
        =================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* SOURCES */}

          <Card className="bg-card border-border">

            <CardHeader>

              <CardTitle>
                Data Sources
              </CardTitle>

              <CardDescription>
                Sources inside{' '}
                {selectedUpload?.name}
              </CardDescription>

            </CardHeader>

            <CardContent>

              {sourceData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={320}
                >

                  <PieChart>

                    <Pie
                      data={
                        sourceData
                      }
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >

                      {sourceData.map(
                        (
                          _entry,
                          index,
                        ) => (
                          <Cell
                            key={`source-${index}`}
                            fill={
                              COLORS[
                                index %
                                  COLORS.length
                              ]
                            }
                          />
                        ),
                      )}

                    </Pie>

                    <Tooltip />

                    <Legend
                      verticalAlign="bottom"
                      height={50}
                    />

                  </PieChart>

                </ResponsiveContainer>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  No source data
                </div>
              )}

            </CardContent>
          </Card>

          {/* CATEGORY */}

          <Card className="bg-card border-border">

            <CardHeader>

              <CardTitle>
                Category Distribution
              </CardTitle>

              <CardDescription>
                Most common categories in
                the selected dataset
              </CardDescription>

            </CardHeader>

            <CardContent>

              {categoryCounts.length > 0 ? (
                <div className="space-y-4">

                  {categoryCounts
                    .slice(0, 8)
                    .map(
                      (
                        category,
                        index,
                      ) => {

                        const percentage =
                          total > 0
                            ? Math.round(
                                (category.value /
                                  total) *
                                  100,
                              )
                            : 0;

                        return (
                          <div
                            key={
                              category.name
                            }
                          >

                            <div className="flex justify-between text-sm mb-1">

                              <span className="font-medium">
                                {
                                  category.name
                                }
                              </span>

                              <span className="text-muted-foreground">
                                {
                                  category.value
                                }{' '}
                                (
                                {
                                  percentage
                                }
                                %)
                              </span>

                            </div>

                            <div className="h-2 rounded-full bg-secondary overflow-hidden">

                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor:
                                    COLORS[
                                      index %
                                        COLORS.length
                                    ],
                                }}
                              />

                            </div>

                          </div>
                        );
                      },
                    )}

                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No category data
                </div>
              )}

            </CardContent>
          </Card>

        </div>

        {/* ===================================================
            TOP CATEGORIES + PRDS
        =================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* TOP CATEGORIES */}

          <Card className="lg:col-span-2 bg-card border-border">

            <CardHeader>

              <div className="flex items-center justify-between">

                <div>

                  <CardTitle>
                    Top Categories
                  </CardTitle>

                  <CardDescription>
                    Most reported categories
                    in the selected file
                  </CardDescription>

                </div>

                <Link href="/themes">

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary"
                  >
                    View all →
                  </Button>

                </Link>

              </div>

            </CardHeader>

            <CardContent>

              <Table>

                <TableHeader>

                  <TableRow className="border-border hover:bg-transparent">

                    <TableHead className="text-muted-foreground">
                      CATEGORY
                    </TableHead>

                    <TableHead className="text-muted-foreground">
                      COUNT
                    </TableHead>

                    <TableHead className="text-muted-foreground">
                      TREND
                    </TableHead>

                    <TableHead className="text-muted-foreground">
                      SEVERITY
                    </TableHead>

                  </TableRow>

                </TableHeader>

                <TableBody>

                  {topCategories.length > 0 ? (
                    topCategories.map(
                      (
                        item,
                        index,
                      ) => (

                        <TableRow
                          key={index}
                          className="border-border hover:bg-secondary/30 transition-colors"
                        >

                          <TableCell className="font-medium">
                            {
                              item.theme
                            }
                          </TableCell>

                          <TableCell>
                            {
                              item.count
                            }
                          </TableCell>

                          <TableCell>
                            <span className="text-muted-foreground">
                              {
                                item.trend
                              }
                            </span>
                          </TableCell>

                          <TableCell>

                            <Badge
                              variant="outline"
                              style={{
                                color:
                                  item.color,
                              }}
                            >
                              {
                                item.severity
                              }
                            </Badge>

                          </TableCell>

                        </TableRow>
                      ),
                    )
                  ) : (
                    <TableRow>

                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No category data
                        available
                      </TableCell>

                    </TableRow>
                  )}

                </TableBody>

              </Table>

            </CardContent>
          </Card>

          {/* RECENT PRDS */}

          <Card className="bg-card border-border">

            <CardHeader>

              <div className="flex items-center justify-between">

                <div>

                  <CardTitle>
                    Recent PRDs
                  </CardTitle>

                  <CardDescription>
                    Latest generated
                    documents
                  </CardDescription>

                </div>

                <Link href="/prd">

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary"
                  >
                    View all →
                  </Button>

                </Link>

              </div>

            </CardHeader>

            <CardContent className="space-y-4">

              {recentPRDsData.length > 0 ? (
                recentPRDsData.map(
                  (prd) => (

                    <Link
                      key={prd.id}
                      href="/prd"
                    >

                      <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer border border-border">

                        <div className="flex items-start justify-between gap-2">

                          <div className="flex-1">

                            <p className="font-medium text-sm">
                              {
                                prd.title
                              }
                            </p>

                            <p className="text-xs text-muted-foreground mt-1">
                              {
                                prd.date
                              }
                            </p>

                            <p className="text-xs text-muted-foreground mt-1">
                              {
                                prd.sections
                              }{' '}
                              {prd.sections ===
                              1
                                ? 'section'
                                : 'sections'}
                            </p>

                          </div>

                          <Badge
                            variant={
                              prd.status ===
                              'Ready'
                                ? 'default'
                                : prd.status ===
                                    'Review'
                                  ? 'outline'
                                  : 'secondary'
                            }
                          >
                            {
                              prd.status
                            }
                          </Badge>

                        </div>

                      </div>

                    </Link>
                  ),
                )
              ) : (
                <div className="text-center py-8 space-y-3">

                  <p className="text-sm text-muted-foreground">
                    No PRD drafts saved
                    yet
                  </p>

                  <Link href="/prd">

                    <Button
                      variant="outline"
                      size="sm"
                    >
                      Create your
                      first PRD
                    </Button>

                  </Link>

                </div>
              )}

            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}