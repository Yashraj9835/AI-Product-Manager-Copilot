import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, Star, AlertCircle } from 'lucide-react';
import { handleGeneratePRD, showInfoToast } from '@/lib/interactions';
import { useApi } from '@/hooks/useApi';

export default function Features() {
  const { data: feedbackData, isLoading, error, fetchData } = useApi<any>();

  useEffect(() => {
    fetchData({ method: 'GET', url: '/feedback', params: { limit: 100 } });
  }, [fetchData]);

  const feedbackList: any[] = Array.isArray(feedbackData) ? feedbackData : [];

  // Aggregate feature requests from feedback by category
  const featureMap = new Map<string, { count: number; priority: string }>();
  feedbackList.forEach((fb: any) => {
    const cat = fb.featureCategory || fb.featureTitle || fb.category || 'General';
    const existing = featureMap.get(cat) || { count: 0, priority: 'Low' };
    existing.count += 1;
    if (fb.priority === 'High') existing.priority = 'High';
    else if (fb.priority === 'Medium' && existing.priority !== 'High') existing.priority = 'Medium';
    featureMap.set(cat, existing);
  });

  const featureRequests = Array.from(featureMap.entries())
    .map(([cat, data], idx) => {
      const reach = data.count * 5;
      const impact = data.priority === 'High' ? 'High' : data.priority === 'Medium' ? 'Medium' : 'Low';
      const impactVal = impact === 'High' ? 3 : impact === 'Medium' ? 2 : 1;
      const confidence = Math.min(0.99, 0.7 + data.count / 500);
      const effortMap: Record<string, string> = { High: 'M', Medium: 'L', Low: 'S' };
      const effortVal = data.priority === 'High' ? 5 : data.priority === 'Medium' ? 8 : 3;
      const rice = parseFloat(((reach * impactVal * confidence) / effortVal).toFixed(1));
      return {
        id: idx + 1,
        title: `Improve ${cat}`,
        theme: cat,
        requests: data.count,
        status: data.priority === 'High' ? 'in_progress' : data.count > 20 ? 'planned' : 'new',
        riceScore: rice,
        reach,
        impact,
        confidence: Math.round(confidence * 100) / 100,
        effort: effortMap[data.priority] || 'M',
      };
    })
    .sort((a, b) => b.riceScore - a.riceScore);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-destructive">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>{error}</p>
          <Button onClick={() => fetchData({ method: 'GET', url: '/feedback', params: { limit: 100 } })} variant="outline" className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

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
                  {featureRequests.length > 0 ? featureRequests.map((feature) => (
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
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No feature data available. Upload feedback first.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
