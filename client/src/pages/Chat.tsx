import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, Lightbulb } from 'lucide-react';

const sampleMessages = [
  {
    id: 1,
    role: 'assistant',
    content: 'Hi! I\'m your AI Product Manager Copilot. I can help you analyze feedback, generate PRDs, prioritize features, and plan your roadmap. What would you like to know?',
    timestamp: '10:30 AM',
  },
  {
    id: 2,
    role: 'user',
    content: 'What are our top pain points this month?',
    timestamp: '10:31 AM',
  },
  {
    id: 3,
    role: 'assistant',
    content: 'Based on the feedback analysis, here are your top pain points:\n\n1. **Slow transaction speed** (847 mentions, -12% trend)\n   - Users experiencing 8+ second delays in payment processing\n   - High impact on cart abandonment\n   - Recommended action: Prioritize backend optimization\n\n2. **PDF export missing** (612 mentions, -18% trend)\n   - Feature request from enterprise customers\n   - Blocking some deals\n   - Recommended action: Plan for Q3 implementation\n\n3. **Mobile UI issues** (423 mentions, -5% trend)\n   - Navigation and form usability problems\n   - Affects 30% of user base\n   - Recommended action: Conduct UX audit',
    timestamp: '10:31 AM',
    sources: ['Feedback Analysis', 'Theme Extraction', 'RICE Scoring'],
  },
  {
    id: 4,
    role: 'user',
    content: 'Can you generate a PRD for the transaction speed improvement?',
    timestamp: '10:32 AM',
  },
  {
    id: 5,
    role: 'assistant',
    content: 'I\'ve generated a PRD for "Improve Transaction Speed". Here\'s a summary:\n\n**Goals:**\n- Reduce transaction processing time from 8s to <2s\n- Improve user satisfaction scores by 15%\n- Reduce cart abandonment rate by 10%\n\n**Key Metrics:**\n- P95 transaction latency < 2 seconds\n- Transaction success rate > 99.5%\n- User satisfaction score > 4.5/5\n\nWould you like me to:\n1. Generate user stories?\n2. Create acceptance criteria?\n3. Export as a document?',
    timestamp: '10:33 AM',
    sources: ['PRD Generator', 'Feature Analysis'],
  },
];

const suggestedQuestions = [
  'What are our top pain points this month?',
  'Generate a PRD for the PDF export feature',
  'Show me the RICE scores for all features',
  'What\'s the trend for mobile-related issues?',
];

export default function Chat() {
  const [messages, setMessages] = useState(sampleMessages);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([
        ...messages,
        {
          id: messages.length + 1,
          role: 'user',
          content: input,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setInput('');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Ask Copilot</h1>
          <p className="text-sm text-muted-foreground mt-2">Conversational AI assistant for product insights</p>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          {/* Chat Area */}
          <div className="lg:col-span-3 flex flex-col">
            <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden">
              <CardHeader className="border-b border-border">
                <CardTitle>Chat</CardTitle>
                <CardDescription>Ask questions about your product data</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/50 border border-border text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.sources && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {msg.sources.map((source, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs border-current">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    className="bg-secondary border-border"
                  />
                  <Button onClick={handleSend} className="bg-primary hover:bg-primary/90 gap-2">
                    <Send className="w-4 h-4" />
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
                    onClick={() => setInput(question)}
                    className="w-full text-left p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground border border-border"
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
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full border-border hover:bg-secondary justify-start text-sm">
                  Generate PRD
                </Button>
                <Button variant="outline" className="w-full border-border hover:bg-secondary justify-start text-sm">
                  Show RICE Scores
                </Button>
                <Button variant="outline" className="w-full border-border hover:bg-secondary justify-start text-sm">
                  Analyze Trends
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
