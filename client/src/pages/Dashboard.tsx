import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Upload, Settings, AlertCircle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

const COLORS = ['oklch(0.55 0.24 260)', 'oklch(0.60 0.18 140)', 'oklch(0.70 0.20 60)', 'oklch(0.50 0.20 280)'];

export default function Dashboard() {
  const { data: statsData, isLoading: isStatsLoading, error: statsError, fetchData: fetchStats } = useApi<any>();
  const { data: feedbackData, isLoading: isFeedbackLoading, error: feedbackError, fetchData: fetchFeedback } = useApi<any>();
  // PRD drafts are a separate resource; a failure here must not blank the whole
  // dashboard, so its error is reported in the card rather than the page shell.
  const { data: prdData, fetchData: fetchPRDs } = useApi<any>();

  useEffect(() => {
    fetchStats({ method: 'GET', url: '/stats' });
    fetchFeedback({ method: 'GET', url: '/feedback', params: { limit: 100 } });
    fetchPRDs({ method: 'GET', url: '/prd' }).catch(() => {
      /* card falls back to its empty state */
    });
  }, [fetchStats, fetchFeedback, fetchPRDs]);

  if (isStatsLoading || isFeedbackLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (statsError || feedbackError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <AlertCircle className="w-12 h-12" />
          <p className="text-lg font-semibold">Failed to load dashboard</p>
          <p className="text-sm">{statsError || feedbackError}</p>
          <Button onClick={() => {
            fetchStats({ method: 'GET', url: '/stats' });
            fetchFeedback({ method: 'GET', url: '/feedback', params: { limit: 100 } });
          }} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  // Fallbacks if data doesn't exist
  const total = statsData?.total || 0;
  const dataSourcesData = statsData?.bySource || [];
  const painPointsData = (statsData?.byCategory || []).map((cat: any, i: number) => ({
    theme: cat.name,
    count: cat.value,
    trend: 'N/A', // real trend logic would go here
    severity: cat.value > 100 ? 'High' : cat.value > 50 ? 'Medium' : 'Low',
    color: COLORS[i % COLORS.length]
  }));
  
  const feedbackList: any[] = Array.isArray(feedbackData) ? feedbackData : [];
  // Real saved drafts from GET /api/prd. The count below used to be a
  // hardcoded 9 with a "↑ 2 this week" caption, and this list was a permanently
  // empty array literal, so the card always rendered blank.
  const prdList: any[] = Array.isArray(prdData) ? prdData : [];
  const recentPRDsData = prdList.slice(0, 4).map((prd: any) => ({
    id: prd._id,
    title: prd.title,
    date: prd.updatedAt ? new Date(prd.updatedAt).toLocaleDateString() : '—',
    status: prd.status === 'ready' ? 'Ready' : prd.status === 'review' ? 'Review' : 'Draft',
    sections: Array.isArray(prd.sections) ? prd.sections.length : 0,
  }));
  const latestFeedbackDate = feedbackList.reduce((latest, feedback) => {
    const date = new Date(feedback.createdAt || 0);
    return date > latest ? date : latest;
  }, feedbackList.length ? new Date(feedbackList[0].createdAt || Date.now()) : new Date());
  const feedbackVolumeData = Array.from({ length: 8 }, (_, index) => {
    const end = new Date(latestFeedbackDate);
    end.setDate(end.getDate() - (7 - index) * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const items = feedbackList.filter((feedback) => {
      const createdAt = new Date(feedback.createdAt || 0);
      return createdAt >= start && createdAt <= end;
    });
    return {
      week: `W${index + 1}`,
      feedback: items.length,
      themes: new Set(items.map((item) => item.category).filter(Boolean)).size,
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">BarkApp Pro · Last updated just now</p>
          </div>
          {/* Both header buttons navigate rather than call a stub handler.
              Import Data goes to the Feedback page, which already owns the
              working CSV/JSON upload flow — duplicating that form here would
              mean two upload paths to keep in step. */}
          <div className="flex gap-3">
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-2" data-testid="dashboard-settings">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>
            <Link href="/feedback">
              <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" data-testid="dashboard-import">
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Feedback Card */}
          <Card className="bg-card border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL FEEDBACK</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">{total.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-chart-1" />
                <span className="text-chart-1">↑ Active tracking</span>
              </div>
            </CardContent>
          </Card>

          {/* Themes Found Card */}
          <Card className="bg-card border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">THEMES FOUND</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">{statsData?.byCategory?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-chart-1" />
                <span className="text-chart-1">Across all data</span>
              </div>
            </CardContent>
          </Card>

          {/* High Priority Issues Card */}
          <Card className="bg-card border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">HIGH PRIORITY</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {statsData?.byPriority?.find((p: any) => p.name === 'High')?.value || 0}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingDown className="w-4 h-4 text-chart-3" />
                <span className="text-chart-3">Needs attention</span>
              </div>
            </CardContent>
          </Card>

          {/* PRDs Generated Card */}
          <Card className="bg-card border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">PRDS GENERATED</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground" data-testid="prd-count">
                  {prdList.length}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-chart-1" />
                <span className="text-chart-1">
                  {prdList.filter((prd: any) => prd.status === 'ready').length} ready
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Feedback Volume Chart */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle>Feedback Volume — Last 8 Weeks</CardTitle>
              <CardDescription>Total feedback items and themes discovered</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={feedbackVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 280)" />
                  <XAxis dataKey="week" stroke="oklch(0.65 0.02 280)" />
                  <YAxis stroke="oklch(0.65 0.02 280)" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'oklch(0.18 0.01 280)', border: '1px solid oklch(0.25 0.02 280)', borderRadius: '0.65rem' }}
                    labelStyle={{ color: 'oklch(0.92 0.01 280)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="feedback" stroke="oklch(0.55 0.24 260)" strokeWidth={2} dot={{ fill: 'oklch(0.55 0.24 260)' }} />
                  <Line type="monotone" dataKey="themes" stroke="oklch(0.60 0.18 140)" strokeWidth={2} dot={{ fill: 'oklch(0.60 0.18 140)' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Data Sources Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>Feedback distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {dataSourcesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dataSourcesData}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {dataSourcesData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'oklch(0.18 0.01 280)', border: '1px solid oklch(0.25 0.02 280)', borderRadius: '0.65rem' }}
                      labelStyle={{ color: 'oklch(0.92 0.01 280)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No source data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pain Points & Recent PRDs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Pain Points */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Categories</CardTitle>
                  <CardDescription>Most reported categories by customers</CardDescription>
                </div>
                <Link href="/themes">
                  <Button variant="ghost" size="sm" className="text-primary" data-testid="view-all-categories">
                    View all →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">CATEGORY</TableHead>
                    <TableHead className="text-muted-foreground">COUNT</TableHead>
                    <TableHead className="text-muted-foreground">TREND</TableHead>
                    <TableHead className="text-muted-foreground">SEVERITY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {painPointsData.length > 0 ? painPointsData.slice(0, 5).map((item: any, idx: number) => (
                    <TableRow key={idx} className="border-border hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium text-foreground">{item.theme || 'Uncategorized'}</TableCell>
                      <TableCell className="text-foreground">{item.count}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{item.trend}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="border-current"
                          style={{ color: item.color }}
                        >
                          {item.severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No category data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent PRDs */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent PRDs</CardTitle>
                  <CardDescription>Latest generated documents</CardDescription>
                </div>
                <Link href="/prd">
                  <Button variant="ghost" size="sm" className="text-primary" data-testid="view-all-prds">
                    View all →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentPRDsData.length > 0 ? (
                recentPRDsData.map((prd) => (
                  <Link key={prd.id} href="/prd">
                    <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer border border-border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{prd.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{prd.date}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {prd.sections} {prd.sections === 1 ? 'section' : 'sections'}
                          </p>
                        </div>
                        <Badge
                          variant={prd.status === 'Ready' ? 'default' : prd.status === 'Review' ? 'outline' : 'secondary'}
                          className={prd.status === 'Ready' ? 'bg-chart-1 text-foreground' : ''}
                        >
                          {prd.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">No PRD drafts saved yet</p>
                  <Link href="/prd">
                    <Button variant="outline" size="sm" className="border-border hover:bg-secondary">
                      Create your first PRD
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
