import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const prioritizationData = [
  { name: 'Transaction Speed', rice: 9.2, reach: 450, impact: 95, confidence: 95 },
  { name: 'PDF Export', rice: 8.7, reach: 380, impact: 92, confidence: 92 },
  { name: 'Mobile Optimization', rice: 7.8, reach: 320, impact: 88, confidence: 88 },
  { name: 'Auth Issues', rice: 7.3, reach: 280, impact: 90, confidence: 90 },
  { name: 'Dark Mode', rice: 6.9, reach: 250, impact: 85, confidence: 85 },
];

const riceBreakdown = [
  {
    feature: 'Improve transaction speed',
    reach: 450,
    impact: 3,
    confidence: 0.95,
    effort: 5,
    score: 9.2,
    rationale: 'High reach (450 users affected), critical impact on user experience, high confidence from multiple sources, medium effort.',
  },
  {
    feature: 'Add PDF export functionality',
    reach: 380,
    impact: 3,
    confidence: 0.92,
    effort: 8,
    score: 8.7,
    rationale: 'Strong user demand (612 requests), high business value, well-defined scope, but higher implementation effort.',
  },
  {
    feature: 'Mobile app optimization',
    reach: 320,
    impact: 2,
    confidence: 0.88,
    effort: 12,
    score: 7.8,
    rationale: 'Good reach, medium impact, but significant effort required. Consider breaking into smaller features.',
  },
];

export default function Prioritization() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Feature Prioritization</h1>
          <p className="text-sm text-muted-foreground mt-2">RICE-scored prioritization framework with AI-generated rationale</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">RICE Breakdown</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* RICE Score Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>RICE Scores</CardTitle>
                <CardDescription>Feature prioritization by RICE score</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prioritizationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 280)" />
                    <XAxis dataKey="name" stroke="oklch(0.65 0.02 280)" />
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
                    <Bar dataKey="rice" fill="oklch(0.55 0.24 260)" name="RICE Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Priorities */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Top Priorities</CardTitle>
                <CardDescription>Recommended implementation order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {riceBreakdown.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-bold text-foreground">#{idx + 1} - {item.feature}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.rationale}</p>
                      </div>
                      <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
                        {item.score}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Reach</p>
                        <p className="font-bold text-foreground">{item.reach}</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Impact</p>
                        <p className="font-bold text-foreground">{item.impact}/3</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="font-bold text-foreground">{Math.round(item.confidence * 100)}%</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Effort</p>
                        <p className="font-bold text-foreground">{item.effort} pts</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>RICE Framework Details</CardTitle>
                <CardDescription>Detailed breakdown of each component</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="font-bold text-foreground mb-2">Reach</h3>
                    <p className="text-sm text-muted-foreground">Number of users/customers affected by this feature. Higher reach = more potential impact.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="font-bold text-foreground mb-2">Impact</h3>
                    <p className="text-sm text-muted-foreground">Magnitude of impact on each user (1-3 scale). Determined by AI analysis of feedback sentiment and urgency.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="font-bold text-foreground mb-2">Confidence</h3>
                    <p className="text-sm text-muted-foreground">Confidence level based on data quality and volume. More sources = higher confidence.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="font-bold text-foreground mb-2">Effort</h3>
                    <p className="text-sm text-muted-foreground">Story points or time estimate for implementation. Lower effort = higher priority.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Framework Comparison</CardTitle>
                <CardDescription>Compare different prioritization methods</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  The RICE framework balances multiple factors to provide a comprehensive prioritization score. Use this alongside your team's strategic goals and capacity planning.
                </p>
                <Button className="bg-primary hover:bg-primary/90">View Methodology</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
