import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lightbulb, Loader2, MessageCircle, Send } from 'lucide-react';
import { AI_UNAVAILABLE_MESSAGE, requestAnalysis } from '@/lib/interactions';

/* ────────────────────────────────────────────────────────────────────────────
 * Ask Copilot.
 *
 * Class B. Conversational answers need an LLM, so every message goes to
 * /api/analyze and the reply reports exactly what came back.
 *
 * This page used to run on `useChat`, which matched the message against five
 * keywords ("pain point", "rice", "trend"…) and replayed a hardcoded paragraph
 * of invented statistics — "847 mentions, -12% trend" — after a fake 800ms
 * delay. That is indistinguishable from a working assistant to anyone reading
 * the screen, so it is gone rather than left behind a flag.
 *
 * Class A on this page: the Quick Actions, which now navigate to the real
 * pages that answer those questions with live data.
 * ──────────────────────────────────────────────────────────────────────── */

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  unavailable?: boolean;
}

const suggestedQuestions = [
  'What are our top pain points this month?',
  'Generate a PRD for the PDF export feature',
  'Show me the RICE scores for all features',
  "What's the trend for mobile-related issues?",
];

/** Where the live-data answer to a question actually lives. */
const quickActions = [
  { label: 'Generate PRD', href: '/prd', hint: 'Create and manage PRD drafts' },
  { label: 'Show RICE Scores', href: '/prioritization', hint: 'RICE scores from real feedback' },
  { label: 'Analyze Trends', href: '/analytics', hint: 'Sentiment and category breakdowns' },
];

const now = () =>
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export default function Chat() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'system',
      content:
        'The AI assistant is not connected yet. Ask a question and I will try the analysis service — meanwhile the Quick Actions on the right open the pages that answer these questions from live data.',
      timestamp: now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || isSending) return;

    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: 'user', content: question, timestamp: now() },
    ]);
    setInput('');
    setIsSending(true);

    const result = await requestAnalysis(question);

    setMessages((prev) => [
      ...prev,
      result.live
        ? {
            id: prev.length + 1,
            role: 'assistant',
            content: JSON.stringify(result.data, null, 2),
            timestamp: now(),
          }
        : {
            id: prev.length + 1,
            role: 'assistant',
            content: result.error ?? AI_UNAVAILABLE_MESSAGE,
            timestamp: now(),
            unavailable: true,
          },
    ]);
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Ask Copilot</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Conversational assistant — pending the analysis service
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          {/* Chat Area */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden">
              <CardHeader className="border-b border-border">
                <CardTitle>Chat</CardTitle>
                <CardDescription>Questions are sent to the analysis service</CardDescription>
              </CardHeader>
              {/* CardContent is a plain function component and cannot hold a
                  ref, so the scroll container is an inner div. */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : msg.unavailable || msg.role === 'system'
                          ? 'bg-chart-3/10 border border-chart-3/40 text-foreground'
                          : 'bg-secondary/50 border border-border text-foreground'
                      }`}
                      data-testid={msg.unavailable ? 'chat-unavailable' : undefined}
                    >
                      {(msg.unavailable || msg.role === 'system') && (
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4 text-chart-3" />
                          <span className="text-xs font-semibold text-chart-3">
                            AI assistant unavailable
                          </span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-lg bg-secondary/50 border border-border flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Contacting analysis service...</span>
                    </div>
                  </div>
                )}
                </div>
              </CardContent>
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') send(input);
                    }}
                    disabled={isSending}
                    data-testid="chat-input"
                    className="bg-secondary border-border"
                  />
                  <Button
                    onClick={() => send(input)}
                    disabled={isSending || !input.trim()}
                    data-testid="chat-send"
                    className="bg-primary hover:bg-primary/90 gap-2"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="w-4 h-4" />
                  Suggested Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => send(question)}
                    disabled={isSending}
                    data-testid={`chat-suggested-${idx}`}
                    className="w-full text-left p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground border border-border disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="w-4 h-4" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-xs">
                  These work now — they open live data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.href}
                    variant="outline"
                    onClick={() => navigate(action.href)}
                    title={action.hint}
                    data-testid={`quick-${action.href.slice(1)}`}
                    className="w-full border-border hover:bg-secondary justify-start text-sm"
                  >
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <Badge variant="outline" className="border-chart-3 text-chart-3 mb-2">
                  Pending integration
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Chat answers require the NLP service behind <code>POST /api/analyze</code>. Until it
                  is connected, every question returns an unavailable notice rather than a generated
                  reply.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
