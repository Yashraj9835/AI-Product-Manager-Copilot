import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { handleAddDataSource, showInfoToast } from '@/lib/interactions';

const analyticsData = [
  { date: 'Jul 1', dau: 2400, retention: 85, adoption: 42 },
  { date: 'Jul 2', dau: 2810, retention: 86, adoption: 45 },
  { date: 'Jul 3', dau: 2000, retention: 84, adoption: 43 },
  { date: 'Jul 4', dau: 2780, retention: 87, adoption: 48 },
  { date: 'Jul 5', dau: 1890, retention: 85, adoption: 46 },
  { date: 'Jul 6', dau: 2390, retention: 88, adoption: 50 },
  { date: 'Jul 7', dau: 3490, retention: 89, adoption: 52 },
];

const connectedSources = [
  { name: 'Google Analytics', status: 'connected', lastSync: '1 hour ago', metrics: 'DAU, Retention, Funnel' },
  { name: 'Mixpanel', status: 'connected', lastSync: '2 hours ago', metrics: 'Feature Adoption, Events' },
  { name: 'Amplitude', status: 'pending', lastSync: 'Never', metrics: 'Cohorts, Retention' },
];

export default function Analytics() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Analytics</h1>
            <p className="text-sm text-muted-foreground mt-2">Integrate and analyze product analytics data</p>
          </div>
          <Button onClick={handleAddDataSource} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" />
            Add Source
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Connected Sources */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Connected Sources</CardTitle>
                <CardDescription>Analytics integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {connectedSources.map((source, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-foreground text-sm">{source.name}</p>
                      <Badge
                        variant="outline"
                        className={
                          source.status === 'connected'
                            ? 'border-chart-1 text-chart-1'
                            : 'border-chart-3 text-chart-3'
                        }
                      >
                        {source.status === 'connected' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {source.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Synced {source.lastSync}</p>
                    <p className="text-xs text-muted-foreground">{source.metrics}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Metrics Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* DAU Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Daily Active Users</CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 280)" />
                    <XAxis dataKey="date" stroke="oklch(0.65 0.02 280)" />
                    <YAxis stroke="oklch(0.65 0.02 280)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'oklch(0.18 0.01 280)',
                        border: '1px solid oklch(0.25 0.02 280)',
                        borderRadius: '0.65rem',
                      }}
                      labelStyle={{ color: 'oklch(0.92 0.01 280)' }}
                    />
                    <Line type="monotone" dataKey="dau" stroke="oklch(0.55 0.24 260)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Retention & Adoption */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Retention & Feature Adoption</CardTitle>
                <CardDescription>Trend analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 280)" />
                    <XAxis dataKey="date" stroke="oklch(0.65 0.02 280)" />
                    <YAxis stroke="oklch(0.65 0.02 280)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'oklch(0.18 0.01 280)',
                        border: '1px solid oklch(0.25 0.02 280)',
                        borderRadius: '0.65rem',
                      }}
                      labelStyle={{ color: 'oklch(0.92 0.01 280)' }}
                    />
                    <Legend />
                    <Bar dataKey="retention" fill="oklch(0.60 0.18 140)" name="Retention %" />
                    <Bar dataKey="adoption" fill="oklch(0.55 0.24 260)" name="Adoption %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Integration Guide */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Integration Guide</CardTitle>
            <CardDescription>How to connect your analytics platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <h3 className="font-bold text-foreground mb-2">Google Analytics</h3>
                <p className="text-sm text-muted-foreground mb-3">Connect your GA4 property to track user behavior and funnel metrics.</p>
                <Button onClick={() => showInfoToast('Connect Google Analytics', 'Redirecting to OAuth...')} variant="outline" size="sm" className="border-border hover:bg-secondary">
                  Connect
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <h3 className="font-bold text-foreground mb-2">Mixpanel</h3>
                <p className="text-sm text-muted-foreground mb-3">Import event data and feature adoption metrics from Mixpanel.</p>
                <Button onClick={() => showInfoToast('Connect Mixpanel', 'Redirecting to OAuth...')} variant="outline" size="sm" className="border-border hover:bg-secondary">
                  Connect
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <h3 className="font-bold text-foreground mb-2">Amplitude</h3>
                <p className="text-sm text-muted-foreground mb-3">Sync cohort analysis and retention data from Amplitude.</p>
                <Button onClick={() => showInfoToast('Connect Amplitude', 'Redirecting to OAuth...')} variant="outline" size="sm" className="border-border hover:bg-secondary">
                  Connect
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
