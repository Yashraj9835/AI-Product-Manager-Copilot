import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { handleSelectFiles, handleAddDataSource } from '@/lib/interactions';

const dataSources = [
  { name: 'Zendesk Tickets', count: 3812, lastSync: '2 hours ago', status: 'active' },
  { name: 'App Store Reviews', count: 2104, lastSync: '1 hour ago', status: 'active' },
  { name: 'Feature Requests', count: 1247, lastSync: '3 hours ago', status: 'active' },
  { name: 'Transcripts', count: 1179, lastSync: '5 hours ago', status: 'active' },
];

const recentUploads = [
  { id: 1, name: 'customer_feedback_q2.csv', date: 'Jul 12, 2026', items: 342, status: 'completed' },
  { id: 2, name: 'support_tickets_batch.pdf', date: 'Jul 11, 2026', items: 156, status: 'completed' },
  { id: 3, name: 'app_reviews_export.json', date: 'Jul 10, 2026', items: 89, status: 'completed' },
];

export default function Feedback() {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop logic here
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Feedback Ingestion</h1>
          <p className="text-sm text-muted-foreground mt-2">Upload and manage customer feedback from multiple sources</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Upload Feedback</CardTitle>
                <CardDescription>Support CSV, PDF, and JSON formats</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Drag and drop your files here or click to browse</p>
                  <p className="text-xs text-muted-foreground mb-4">CSV, PDF, JSON • Max 50MB per file</p>
                  <Button onClick={handleSelectFiles} className="bg-primary hover:bg-primary/90">Select Files</Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>Your uploaded feedback files</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">FILE NAME</TableHead>
                      <TableHead className="text-muted-foreground">DATE</TableHead>
                      <TableHead className="text-muted-foreground">ITEMS</TableHead>
                      <TableHead className="text-muted-foreground">STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUploads.map((upload) => (
                      <TableRow key={upload.id} className="border-border hover:bg-secondary/30 transition-colors">
                        <TableCell className="font-medium text-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {upload.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{upload.date}</TableCell>
                        <TableCell className="text-foreground">{upload.items}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-chart-1 text-chart-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {upload.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Data Sources */}
          <div>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Data Sources</CardTitle>
                <CardDescription>Connected integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataSources.map((source, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{source.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{source.count.toLocaleString()} items</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Synced {source.lastSync}
                        </div>
                      </div>
                      <Badge variant="outline" className="border-chart-1 text-chart-1 text-xs">
                        Active
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button onClick={handleAddDataSource} variant="outline" className="w-full border-border hover:bg-secondary mt-4">
                  + Add Source
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
