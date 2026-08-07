import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Upload, Settings } from 'lucide-react';

// Mock data for charts
const feedbackVolumeData = [
  { week: 'W1', feedback: 1200, themes: 8 },
  { week: 'W2', feedback: 1450, themes: 12 },
  { week: 'W3', feedback: 1800, themes: 15 },
  { week: 'W4', feedback: 2100, themes: 18 },
  { week: 'W5', feedback: 2450, themes: 22 },
  { week: 'W6', feedback: 2800, themes: 24 },
  { week: 'W7', feedback: 3200, themes: 28 },
  { week: 'W8', feedback: 3500, themes: 32 },
];

const dataSourcesData = [
  { name: 'Zendesk Tickets', value: 3812 },
  { name: 'App Store Reviews', value: 2104 },
  { name: 'Feature Requests', value: 1247 },
  { name: 'Transcripts', value: 1179 },
];

const painPointsData = [
  { theme: 'Slow transaction speed', count: 847, trend: '-12%', severity: 'High', color: 'oklch(0.60 0.25 25)' },
  { theme: 'PDF export missing', count: 612, trend: '-18%', severity: 'High', color: 'oklch(0.60 0.25 25)' },
  { theme: 'Login failures', count: 423, trend: '-5%', severity: 'Medium', color: 'oklch(0.70 0.20 60)' },
  { theme: 'Mobile UI issues', count: 381, trend: '-9%', severity: 'Medium', color: 'oklch(0.70 0.20 60)' },
  { theme: 'Notification spam', count: 298, trend: '-12%', severity: 'Low', color: 'oklch(0.60 0.18 140)' },
];

const recentPRDsData = [
  { id: 1, title: 'PDF Export Feature', date: 'Generated 3 days ago', status: 'Ready', stories: 8 },
  { id: 2, title: 'Dark Mode Support', date: 'Generated 5 days ago', status: 'Review', stories: 5 },
  { id: 3, title: 'Bulk Transaction Export', date: 'Generated 8 days ago', status: 'Draft', stories: 3 },
];

const COLORS = ['oklch(0.55 0.24 260)', 'oklch(0.60 0.18 140)', 'oklch(0.70 0.20 60)', 'oklch(0.50 0.20 280)'];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">BarkApp Pro · Last updated 7 hours ago</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
              <Upload className="w-4 h-4" />
              Import Data
            </Button>
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
                <span className="text-4xl font-bold text-foreground">8,342</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-chart-1" />
                <span className="text-chart-1">↑ 15% this month</span>
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
                <span className="text-4xl font-bold text-foreground">24</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-chart-1" />
                <span className="text-chart-1">↑ 3 new themes</span>
              </div>
            </CardContent>
          </Card>

          {/* Feature Requests Card */}
          <Card className="bg-card border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">FEATURE REQUESTS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">1,247</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingDown className="w-4 h-4 text-chart-3" />
                <span className="text-chart-3">↓ 8% this month</span>
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
                <span className="text-4xl font-bold text-foreground">9</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-chart-1" />
                <span className="text-chart-1">↑ 2 this week</span>
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dataSourcesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataSourcesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'oklch(0.18 0.01 280)', border: '1px solid oklch(0.25 0.02 280)', borderRadius: '0.65rem' }}
                    labelStyle={{ color: 'oklch(0.92 0.01 280)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
                  <CardTitle>Top Pain Points</CardTitle>
                  <CardDescription>Most reported issues by customers</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-primary">View all →</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">THEME</TableHead>
                    <TableHead className="text-muted-foreground">COUNT</TableHead>
                    <TableHead className="text-muted-foreground">TREND</TableHead>
                    <TableHead className="text-muted-foreground">SEVERITY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {painPointsData.map((item, idx) => (
                    <TableRow key={idx} className="border-border hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium text-foreground">{item.theme}</TableCell>
                      <TableCell className="text-foreground">{item.count}</TableCell>
                      <TableCell>
                        <span className="text-chart-3">{item.trend}</span>
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
                  ))}
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
                <Button variant="ghost" size="sm" className="text-primary">View all →</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentPRDsData.map((prd) => (
                <div key={prd.id} className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{prd.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{prd.date}</p>
                      <p className="text-xs text-muted-foreground mt-1">{prd.stories} user stories</p>
                    </div>
                    <Badge 
                      variant={prd.status === 'Ready' ? 'default' : prd.status === 'Review' ? 'outline' : 'secondary'}
                      className={prd.status === 'Ready' ? 'bg-chart-1 text-foreground' : ''}
                    >
                      {prd.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
