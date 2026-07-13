import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const roadmapData = {
  Q3_2026: [
    { id: 1, title: 'Improve transaction speed', status: 'in_progress', effort: 'M', team: 'Backend' },
    { id: 2, title: 'Add PDF export functionality', status: 'in_progress', effort: 'L', team: 'Frontend' },
  ],
  Q4_2026: [
    { id: 3, title: 'Mobile app optimization', status: 'planned', effort: 'XL', team: 'Mobile' },
    { id: 4, title: 'Fix authentication issues', status: 'planned', effort: 'S', team: 'Backend' },
  ],
  Q1_2027: [
    { id: 5, title: 'Implement dark mode', status: 'planned', effort: 'M', team: 'Frontend' },
    { id: 6, title: 'Advanced analytics dashboard', status: 'planned', effort: 'L', team: 'Data' },
  ],
};

const lanes = ['Growth', 'Core', 'Platform'];

export default function Roadmap() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Roadmap</h1>
            <p className="text-sm text-muted-foreground mt-2">Drag-and-drop roadmap planning with AI assistance</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">Auto-suggest Roadmap</Button>
        </div>

        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="bg-secondary border-border">
            <TabsTrigger value="timeline">Timeline View</TabsTrigger>
            <TabsTrigger value="lanes">By Lane</TabsTrigger>
            <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            {Object.entries(roadmapData).map(([quarter, items]) => (
              <Card key={quarter} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{quarter.replace('_', ' ')}</CardTitle>
                  <CardDescription>{items.length} items planned</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors cursor-move"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <Badge
                            variant="outline"
                            className={
                              item.status === 'in_progress'
                                ? 'border-primary text-primary'
                                : 'border-chart-1 text-chart-1'
                            }
                          >
                            {item.status === 'in_progress' ? 'In Progress' : 'Planned'}
                          </Badge>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                            {item.effort}
                          </Badge>
                          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                            {item.team}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="lanes" className="space-y-6">
            {lanes.map((lane) => (
              <Card key={lane} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{lane}</CardTitle>
                  <CardDescription>Features for {lane} team</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Drag features here to assign to this lane</p>
                    <div className="min-h-[200px] p-4 rounded-lg bg-secondary/30 border-2 border-dashed border-border">
                      <p className="text-sm text-muted-foreground text-center py-8">Drop features here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="gantt">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Gantt Chart View</CardTitle>
                <CardDescription>Timeline visualization of roadmap items</CardDescription>
              </CardHeader>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center">Gantt chart visualization coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
