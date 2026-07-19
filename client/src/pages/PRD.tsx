import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Copy, Zap } from 'lucide-react';
import { handleGeneratePRD, handleCopyPRD, handleExportPRD } from '@/lib/interactions';

const features = [
  { id: 1, title: 'Improve transaction speed', status: 'ready' },
  { id: 2, title: 'Add PDF export functionality', status: 'ready' },
  { id: 3, title: 'Mobile app optimization', status: 'ready' },
];

const samplePRD = {
  title: 'Improve Transaction Speed',
  overview: 'Reduce payment processing latency to improve user experience and reduce cart abandonment.',
  goals: [
    'Reduce transaction processing time from 8s to <2s',
    'Improve user satisfaction scores by 15%',
    'Reduce cart abandonment rate by 10%',
  ],
  nonGoals: [
    'Redesign payment UI',
    'Add new payment methods',
    'Implement cryptocurrency support',
  ],
  userStories: [
    {
      story: 'As a customer, I want my payment to process quickly so that I can complete my purchase without frustration',
      acceptance: [
        'Payment processes in <2 seconds',
        'Success/failure feedback is immediate',
        'Retry mechanism works smoothly',
      ],
    },
    {
      story: 'As a merchant, I want faster transaction processing so that I can reconcile payments more efficiently',
      acceptance: [
        'Transaction data syncs within 30 seconds',
        'Batch processing completes in <5 minutes',
        'Reconciliation dashboard updates in real-time',
      ],
    },
  ],
  successMetrics: [
    'P95 transaction latency < 2 seconds',
    'Transaction success rate > 99.5%',
    'User satisfaction score > 4.5/5',
  ],
};

export default function PRD() {
  const [selectedFeature, setSelectedFeature] = useState<number | null>(1);
  const [showPRD, setShowPRD] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">PRD Generator</h1>
          <p className="text-sm text-muted-foreground mt-2">AI-powered Product Requirement Document generation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feature Selection */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Select Feature</CardTitle>
                <CardDescription>Choose a feature to generate PRD</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => {
                      setSelectedFeature(feature.id);
                      setShowPRD(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all border ${
                      selectedFeature === feature.id
                        ? 'bg-primary/20 border-primary text-foreground'
                        : 'bg-secondary/50 border-border hover:bg-secondary text-foreground'
                    }`}
                  >
                    <p className="font-medium text-sm">{feature.title}</p>
                    <Badge variant="outline" className="mt-2 text-xs border-chart-1 text-chart-1">
                      {feature.status}
                    </Badge>
                  </button>
                ))}
                <Button
                  onClick={() => {
                    handleGeneratePRD();
                    setShowPRD(true);
                  }}
                  className="w-full bg-primary hover:bg-primary/90 mt-4 gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Generate PRD
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* PRD Display */}
          <div className="lg:col-span-2">
            {!showPRD ? (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>PRD Preview</CardTitle>
                  <CardDescription>Select a feature and click "Generate PRD" to create a document</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No PRD generated yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>{samplePRD.title}</CardTitle>
                    <CardDescription className="mt-2">{samplePRD.overview}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCopyPRD} variant="outline" size="sm" className="gap-2 border-border hover:bg-secondary">
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                    <Button onClick={handleExportPRD} variant="outline" size="sm" className="gap-2 border-border hover:bg-secondary">
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="bg-secondary border-border">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="stories">User Stories</TabsTrigger>
                      <TabsTrigger value="metrics">Success Metrics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div>
                        <h3 className="font-bold text-foreground mb-2">Goals</h3>
                        <ul className="space-y-2">
                          {samplePRD.goals.map((goal, idx) => (
                            <li key={idx} className="text-sm text-foreground flex gap-2">
                              <span className="text-primary">✓</span> {goal}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground mb-2">Non-Goals</h3>
                        <ul className="space-y-2">
                          {samplePRD.nonGoals.map((goal, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-muted-foreground">✗</span> {goal}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>

                    <TabsContent value="stories" className="space-y-4">
                      {samplePRD.userStories.map((story, idx) => (
                        <div key={idx} className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <p className="font-medium text-foreground mb-2">{story.story}</p>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground">Acceptance Criteria:</p>
                            {story.acceptance.map((criteria, cidx) => (
                              <p key={cidx} className="text-sm text-foreground flex gap-2">
                                <span className="text-primary">•</span> {criteria}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="metrics" className="space-y-4">
                      {samplePRD.successMetrics.map((metric, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border flex gap-2">
                          <span className="text-primary">✓</span>
                          <span className="text-sm text-foreground">{metric}</span>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
