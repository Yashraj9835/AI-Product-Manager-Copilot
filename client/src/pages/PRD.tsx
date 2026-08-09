import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Copy, Download, Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/trpc';
import {
  AI_UNAVAILABLE_MESSAGE,
  copyToClipboard,
  downloadTextFile,
  requestAnalysis,
} from '@/lib/interactions';

/* ────────────────────────────────────────────────────────────────────────────
 * PRD Generator.
 *
 * Two clearly separated halves:
 *
 *   Class A (works now) — creating, listing, renaming, status, deleting, and
 *   exporting drafts. All of it is owner-scoped CRUD against /api/prd, plus a
 *   real clipboard write and a real file download. The page previously showed
 *   one hardcoded `samplePRD` object regardless of what you clicked, and Copy
 *   claimed success without touching the clipboard.
 *
 *   Class B (blocked on Yash) — writing the PRD *body*. That needs an LLM, so
 *   the Generate button calls /api/analyze, detects the `mock: true` fallback,
 *   and reports it. No placeholder prose is invented, and no non-AI template
 *   stands in for generated content.
 * ──────────────────────────────────────────────────────────────────────── */

interface PRDSection {
  heading: string;
  items: string[];
}

interface PRDDraft {
  _id: string;
  title: string;
  feature?: string;
  status: 'draft' | 'review' | 'ready';
  overview?: string;
  sections: PRDSection[];
  aiGenerated: boolean;
  updatedAt: string;
}

const STATUSES = ['draft', 'review', 'ready'] as const;

/** Render a draft as Markdown for copy and export. */
function toMarkdown(prd: PRDDraft): string {
  const lines = [`# ${prd.title}`, ''];
  if (prd.feature) lines.push(`**Feature:** ${prd.feature}`, '');
  lines.push(`**Status:** ${prd.status}`, '');
  if (prd.overview) lines.push('## Overview', '', prd.overview, '');

  for (const section of prd.sections) {
    lines.push(`## ${section.heading}`, '');
    for (const item of section.items) lines.push(`- ${item}`);
    lines.push('');
  }

  if (!prd.aiGenerated) {
    lines.push(
      '---',
      '',
      '_AI-generated content is not included: the analysis service is not yet connected._'
    );
  }
  return lines.join('\n');
}

export default function PRD() {
  const [drafts, setDrafts] = useState<PRDDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Feature options come from real feedback categories rather than the old
  // three hardcoded titles.
  const [featureOptions, setFeatureOptions] = useState<string[]>([]);

  const loadDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/prd');
      const list: PRDDraft[] = response.data.data ?? [];
      setDrafts(list);
      setSelectedId((current) => current ?? list[0]?._id ?? null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not load your PRD drafts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
    api
      .get('/stats')
      .then((res) => {
        const categories = (res.data?.data?.byCategory ?? []).map((c: any) => c.name).filter(Boolean);
        setFeatureOptions(categories);
      })
      .catch(() => setFeatureOptions([]));
  }, [loadDrafts]);

  const selected = useMemo(
    () => drafts.find((d) => d._id === selectedId) ?? null,
    [drafts, selectedId]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Give the PRD a title');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/prd', {
        title: newTitle.trim(),
        feature: newFeature.trim() || undefined,
        status: 'draft',
      });
      const created: PRDDraft = response.data.data;
      setDrafts((prev) => [created, ...prev]);
      setSelectedId(created._id);
      setNewTitle('');
      setNewFeature('');
      toast.success('Draft saved', { description: `"${created.title}" is stored on your account.` });
    } catch (err: any) {
      const details = err.response?.data?.details;
      toast.error('Could not save draft', {
        description: Array.isArray(details) && details.length
          ? details.map((d: any) => d.message).join('; ')
          : err.response?.data?.error || err.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (draft: PRDDraft, status: PRDDraft['status']) => {
    const previous = drafts;
    setDrafts((prev) => prev.map((d) => (d._id === draft._id ? { ...d, status } : d)));
    try {
      await api.patch(`/prd/${draft._id}`, { status });
      toast.success(`"${draft.title}" marked ${status}`);
    } catch (err: any) {
      setDrafts(previous);
      toast.error('Could not update status', { description: err.response?.data?.error || err.message });
    }
  };

  const handleDelete = async (draft: PRDDraft) => {
    const previous = drafts;
    setDrafts((prev) => prev.filter((d) => d._id !== draft._id));
    if (selectedId === draft._id) setSelectedId(null);
    try {
      await api.delete(`/prd/${draft._id}`);
      toast.success(`"${draft.title}" deleted`);
    } catch (err: any) {
      setDrafts(previous);
      toast.error('Delete failed', { description: err.response?.data?.error || err.message });
    }
  };

  /**
   * Generate PRD content — Class B, blocked on Yash's /analyze service.
   *
   * The draft itself is already saved; this only attempts to fill the body. It
   * resolves within seconds either way, and on the mock fallback it says the
   * service is not connected rather than displaying the canned placeholder the
   * backend returns.
   */
  const handleGenerate = async () => {
    if (!selected) return;

    setIsGenerating(true);
    setGenerateError(null);

    const result = await requestAnalysis(
      `Draft a product requirements document for: ${selected.title}${
        selected.feature ? ` (feature area: ${selected.feature})` : ''
      }`
    );
    setIsGenerating(false);

    if (!result.live) {
      setGenerateError(result.error ?? AI_UNAVAILABLE_MESSAGE);
      toast.warning('AI generation unavailable', { description: result.error ?? AI_UNAVAILABLE_MESSAGE });
      return;
    }

    // Only a real service reaches here; the write path lands with that
    // integration, so nothing fabricates sections in the meantime.
    toast.success('Analysis service responded', {
      description: 'Body generation lands with the real /analyze integration.',
    });
    loadDrafts();
  };

  const handleCopy = async () => {
    if (!selected) return;
    await copyToClipboard(toMarkdown(selected), `"${selected.title}" copied as Markdown`);
  };

  const handleExport = () => {
    if (!selected) return;
    const filename = `${selected.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
    downloadTextFile(filename, toMarkdown(selected));
    toast.success('Export started', { description: `Downloading ${filename}` });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading your PRD drafts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <AlertCircle className="w-12 h-12" />
          <p className="text-lg font-semibold">Failed to load PRDs</p>
          <p className="text-sm">{error}</p>
          <Button onClick={loadDrafts} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">PRD Generator</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Create and manage PRD drafts. AI body generation is pending the analysis service.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Draft list + create form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>New draft</CardTitle>
                <CardDescription>Saved to your account immediately</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="prd-title">Title</Label>
                    <Input
                      id="prd-title"
                      data-testid="prd-title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Improve transaction speed"
                      className="bg-secondary/50 border-border"
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prd-feature">Feature area</Label>
                    <select
                      id="prd-feature"
                      data-testid="prd-feature"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      disabled={isCreating}
                      className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm"
                    >
                      <option value="">— none —</option>
                      {featureOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    disabled={isCreating}
                    data-testid="prd-create"
                    className="w-full bg-primary hover:bg-primary/90 gap-2"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create draft
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Your drafts</CardTitle>
                <CardDescription>
                  {drafts.length} saved {drafts.length === 1 ? 'document' : 'documents'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {drafts.length > 0 ? (
                  drafts.map((draft) => (
                    <button
                      key={draft._id}
                      onClick={() => setSelectedId(draft._id)}
                      data-testid={`prd-select-${draft._id}`}
                      className={`w-full text-left p-3 rounded-lg transition-all border ${
                        selectedId === draft._id
                          ? 'bg-primary/20 border-primary text-foreground'
                          : 'bg-secondary/50 border-border hover:bg-secondary text-foreground'
                      }`}
                    >
                      <p className="font-medium text-sm">{draft.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs border-chart-1 text-chart-1">
                          {draft.status}
                        </Badge>
                        {draft.feature && (
                          <span className="text-xs text-muted-foreground">{draft.feature}</span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No drafts yet — create one above.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selected draft */}
          <div className="lg:col-span-2">
            {!selected ? (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>PRD Preview</CardTitle>
                  <CardDescription>Select a draft, or create one to get started</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No draft selected</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle data-testid="prd-selected-title">{selected.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {selected.overview || 'No overview yet.'}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-3">
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(selected, status)}
                          data-testid={`prd-status-${status}`}
                        >
                          <Badge
                            variant="outline"
                            className={
                              selected.status === status
                                ? 'border-primary text-primary cursor-pointer'
                                : 'border-muted-foreground text-muted-foreground cursor-pointer'
                            }
                          >
                            {status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-border hover:bg-secondary"
                      data-testid="prd-copy"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                    <Button
                      onClick={handleExport}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-border hover:bg-secondary"
                      data-testid="prd-export"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                    <Button
                      onClick={() => handleDelete(selected)}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-border hover:bg-destructive/20 hover:text-destructive"
                      data-testid="prd-delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="bg-primary hover:bg-primary/90 gap-2"
                      data-testid="prd-generate"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {isGenerating ? 'Checking service...' : 'Generate content with AI'}
                    </Button>
                  </div>

                  {generateError && (
                    <div
                      className="flex items-start gap-3 p-4 rounded-lg border border-chart-3/40 bg-chart-3/10"
                      data-testid="prd-ai-unavailable"
                    >
                      <AlertCircle className="w-5 h-5 text-chart-3 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">AI content generation unavailable</p>
                        <p className="text-xs text-muted-foreground mt-1">{generateError}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          The draft itself is saved — copy and export work now.
                        </p>
                      </div>
                    </div>
                  )}

                  {selected.sections.length > 0 ? (
                    <Tabs defaultValue={selected.sections[0].heading} className="space-y-4">
                      <TabsList className="bg-secondary border-border">
                        {selected.sections.map((section) => (
                          <TabsTrigger key={section.heading} value={section.heading}>
                            {section.heading}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {selected.sections.map((section) => (
                        <TabsContent key={section.heading} value={section.heading} className="space-y-2">
                          {section.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-secondary/50 border border-border flex gap-2"
                            >
                              <span className="text-primary">•</span>
                              <span className="text-sm text-foreground">{item}</span>
                            </div>
                          ))}
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    <div className="text-center py-10 rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">
                        This draft has no body sections yet.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Section content comes from the AI analysis service, which is not yet connected.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
