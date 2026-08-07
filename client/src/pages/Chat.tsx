import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, Lightbulb } from 'lucide-react';

const suggestedQuestions = [
  'What are our top pain points this month?',
  'Generate a PRD for the PDF export feature',
  'Show me the RICE scores for all features',
  'What\'s the trend for mobile-related issues?',
];

export default function Chat() {
  const { messages, sendMessage } = useChat();
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => {
      sendMessage(question);
      setInput('');
    }, 100);
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
                    onClick={() => handleSuggestedQuestion(question)}
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
