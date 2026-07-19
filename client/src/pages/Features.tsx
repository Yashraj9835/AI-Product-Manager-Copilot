import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, Star } from 'lucide-react';
import { handleGeneratePRD, showInfoToast } from '@/lib/interactions';

const featureRequests = [
  {
    id: 1,
    title: 'Improve transaction speed',
    theme: 'Slow transaction speed',
    requests: 847,
    status: 'planned',
    riceScore: 9.2,
    reach: 450,
    impact: 'High',
    confidence: 0.95,
    effort: 'M',
  },
  {
    id: 2,
    title: 'Add PDF export functionality',
    theme: 'PDF export missing',
    requests: 612,
    status: 'in_progress',
    riceScore: 8.7,
    reach: 380,
    impact: 'High',
    confidence: 0.92,
    effort: 'L',
  },
  {
    id: 3,
    title: 'Mobile app optimization',
    theme: 'Mobile UI improvements',
    requests: 523,
    status: 'planned',
    riceScore: 7.8,
    reach: 320,
    impact: 'Medium',
    confidence: 0.88,
    effort: 'XL',
  },
  {
    id: 4,
    title: 'Fix authentication issues',
    theme: 'Login failures',
    requests: 423,
    status: 'in_progress',
    riceScore: 7.3,
    reach: 280,
    impact: 'High',
    confidence: 0.90,
    effort: 'S',
  },
  {
    id: 5,
    title: 'Implement dark mode',
    theme: 'Feature request: Dark mode',
    requests: 389,
    status: 'new',
    riceScore: 6.9,
    reach: 250,
    impact: 'Medium',
    confidence: 0.85,
    effort: 'M',
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Feature Requests</h1>
            <p className="text-sm text-muted-foreground mt-2">Aggregated and prioritized feature requests from customer feedback</p>
          </div>
          <Button onClick={handleGeneratePRD} className="bg-primary hover:bg-primary/90">Generate PRD</Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Feature Backlog</CardTitle>
            <CardDescription>Sorted by RICE score (Reach × Impact × Confidence / Effort)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">FEATURE</TableHead>
                    <TableHead className="text-muted-foreground">REQUESTS</TableHead>
                    <TableHead className="text-muted-foreground">RICE SCORE</TableHead>
                    <TableHead className="text-muted-foreground">REACH</TableHead>
                    <TableHead className="text-muted-foreground">IMPACT</TableHead>
                    <TableHead className="text-muted-foreground">EFFORT</TableHead>
                    <TableHead className="text-muted-foreground">STATUS</TableHead>
                    <TableHead className="text-muted-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureRequests.map((feature) => (
                    <TableRow key={feature.id} className="border-border hover:bg-secondary/30 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{feature.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{feature.theme}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{feature.requests}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="font-bold text-foreground">{feature.riceScore}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{feature.reach}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            feature.impact === 'High'
                              ? 'border-chart-3 text-chart-3'
                              : 'border-chart-3 text-chart-3'
                          }
                        >
                          {feature.impact}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-muted-foreground text-muted-foreground"
                        >
                          {feature.effort}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            feature.status === 'in_progress'
                              ? 'border-primary text-primary'
                              : feature.status === 'planned'
                              ? 'border-chart-1 text-chart-1'
                              : 'border-muted-foreground text-muted-foreground'
                          }
                        >
                          {feature.status === 'in_progress'
                            ? 'In Progress'
                            : feature.status === 'planned'
                            ? 'Planned'
                            : 'New'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => showInfoToast('Feature Details', `Viewing details for: ${feature.title}`)} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
