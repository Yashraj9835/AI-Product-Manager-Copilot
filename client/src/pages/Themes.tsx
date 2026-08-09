import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Merge, Split, AlertCircle } from 'lucide-react';
import { handleReclusterThemes, showInfoToast } from '@/lib/interactions';
import { useApi } from '@/hooks/useApi';

export default function Themes() {
  const { data: feedbackData, isLoading, error, fetchData } = useApi<any>();

  useEffect(() => {
    fetchData({ method: 'GET', url: '/feedback', params: { limit: 100 } });
  }, [fetchData]);

  // Derive themes from feedback categories by aggregating
  const feedbackList: any[] = Array.isArray(feedbackData) ? feedbackData : [];

  const themesMap = new Map<string, { count: number; sentiments: Record<string, number>; lastSeen: string }>();
  feedbackList.forEach((fb: any) => {
    const cat = fb.theme || fb.category || 'Uncategorized';
    const existing = themesMap.get(cat) || { count: 0, sentiments: {}, lastSeen: '' };
    existing.count += 1;
    const sent = fb.sentiment || 'neutral';
    existing.sentiments[sent] = (existing.sentiments[sent] || 0) + 1;
    if (fb.createdAt && (!existing.lastSeen || fb.createdAt > existing.lastSeen)) {
      existing.lastSeen = fb.createdAt;
    }
    themesMap.set(cat, existing);
  });

  const themes = Array.from(themesMap.entries())
    .map(([name, data], idx) => {
      const dominantSentiment = Object.entries(data.sentiments).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
      return {
        id: idx + 1,
        name,
        description: `Feedback items categorized under ${name}`,
        itemCount: data.count,
        trend: 'N/A',
        trendDirection: data.count > 50 ? 'up' : 'down',
        sentiment: dominantSentiment.toLowerCase(),
        firstSeen: 'N/A',
        lastSeen: data.lastSeen ? new Date(data.lastSeen).toLocaleDateString() : 'N/A',
      };
    })
    .sort((a, b) => b.itemCount - a.itemCount);

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
            <h1 className="text-3xl font-bold text-foreground">Theme Extraction</h1>
            <p className="text-sm text-muted-foreground mt-2">AI-powered clustering of customer feedback into themes</p>
          </div>
          <Button onClick={handleReclusterThemes} className="bg-primary hover:bg-primary/90">Re-cluster Themes</Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Discovered Themes</CardTitle>
            <CardDescription>Automatically extracted themes from {feedbackList.length.toLocaleString()} feedback items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">THEME</TableHead>
                    <TableHead className="text-muted-foreground">ITEMS</TableHead>
                    <TableHead className="text-muted-foreground">TREND</TableHead>
                    <TableHead className="text-muted-foreground">SENTIMENT</TableHead>
                    <TableHead className="text-muted-foreground">LAST SEEN</TableHead>
                    <TableHead className="text-muted-foreground">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {themes.length > 0 ? themes.map((theme) => (
                    <TableRow key={theme.id} className="border-border hover:bg-secondary/30 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{theme.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{theme.itemCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {theme.trendDirection === 'down' ? (
                            <TrendingDown className="w-4 h-4 text-chart-3" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-chart-1" />
                          )}
                          <span className={theme.trendDirection === 'down' ? 'text-chart-3' : 'text-chart-1'}>
                            {theme.trend}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            theme.sentiment === 'negative'
                              ? 'border-chart-3 text-chart-3'
                              : theme.sentiment === 'positive'
                              ? 'border-chart-1 text-chart-1'
                              : 'border-muted-foreground text-muted-foreground'
                          }
                        >
                          {theme.sentiment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{theme.lastSeen}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button onClick={() => showInfoToast('Merge Themes', 'Select another theme to merge with')} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary">
                            <Merge className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => showInfoToast('Split Theme', 'Select sub-themes to split')} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary">
                            <Split className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No themes found. Upload feedback data first.
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
