import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Merge, Split } from 'lucide-react';

const themes = [
  {
    id: 1,
    name: 'Slow transaction speed',
    description: 'Users experiencing delays in payment processing',
    itemCount: 847,
    trend: '-12%',
    trendDirection: 'down',
    sentiment: 'negative',
    firstSeen: '2 weeks ago',
    lastSeen: '2 hours ago',
  },
  {
    id: 2,
    name: 'PDF export missing',
    description: 'Export to PDF functionality not working',
    itemCount: 612,
    trend: '-18%',
    trendDirection: 'down',
    sentiment: 'negative',
    firstSeen: '3 weeks ago',
    lastSeen: '1 hour ago',
  },
  {
    id: 3,
    name: 'Mobile UI improvements',
    description: 'Requests for better mobile experience',
    itemCount: 523,
    trend: '+8%',
    trendDirection: 'up',
    sentiment: 'neutral',
    firstSeen: '1 week ago',
    lastSeen: '3 hours ago',
  },
  {
    id: 4,
    name: 'Login failures',
    description: 'Authentication issues and login problems',
    itemCount: 423,
    trend: '-5%',
    trendDirection: 'down',
    sentiment: 'negative',
    firstSeen: '2 weeks ago',
    lastSeen: '4 hours ago',
  },
  {
    id: 5,
    name: 'Feature request: Dark mode',
    description: 'Users requesting dark mode support',
    itemCount: 389,
    trend: '+15%',
    trendDirection: 'up',
    sentiment: 'positive',
    firstSeen: '5 days ago',
    lastSeen: '1 hour ago',
  },
];

export default function Themes() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Theme Extraction</h1>
            <p className="text-sm text-muted-foreground mt-2">AI-powered clustering of customer feedback into themes</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">Re-cluster Themes</Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Discovered Themes</CardTitle>
            <CardDescription>Automatically extracted themes from {themes.reduce((sum, t) => sum + t.itemCount, 0).toLocaleString()} feedback items</CardDescription>
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
                  {themes.map((theme) => (
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
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary">
                            <Merge className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary">
                            <Split className="w-4 h-4" />
                          </Button>
                        </div>
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
