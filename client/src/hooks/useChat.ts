import { useState, useCallback } from 'react';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}

const mockResponses: Record<string, string> = {
  'pain points': 'Based on the feedback analysis, here are your top pain points:\n\n1. **Slow transaction speed** (847 mentions, -12% trend)\n   - Users experiencing 8+ second delays in payment processing\n   - High impact on cart abandonment\n   - Recommended action: Prioritize backend optimization\n\n2. **PDF export missing** (612 mentions, -18% trend)\n   - Feature request from enterprise customers\n   - Blocking some deals\n   - Recommended action: Plan for Q3 implementation\n\n3. **Mobile UI issues** (423 mentions, -5% trend)\n   - Navigation and form usability problems\n   - Affects 30% of user base\n   - Recommended action: Conduct UX audit',
  
  'rice scores': 'Here are the RICE scores for your top features:\n\n1. **Improve transaction speed** - RICE: 9.2\n   - Reach: 450 users, Impact: High, Confidence: 95%, Effort: Medium\n\n2. **Add PDF export** - RICE: 8.7\n   - Reach: 380 users, Impact: High, Confidence: 92%, Effort: Large\n\n3. **Mobile optimization** - RICE: 7.8\n   - Reach: 320 users, Impact: Medium, Confidence: 88%, Effort: XL\n\n4. **Fix auth issues** - RICE: 7.3\n   - Reach: 280 users, Impact: High, Confidence: 90%, Effort: Small',

  'trends': 'Here\'s the trend analysis for your feedback:\n\n**Positive Trends:**\n- Dark mode requests up 15% (389 mentions)\n- Mobile optimization interest up 8% (523 mentions)\n\n**Negative Trends:**\n- Transaction speed complaints down 12% (847 mentions) - indicating some improvement\n- PDF export issues down 18% (612 mentions)\n- Login failures down 5% (423 mentions)\n\nOverall sentiment is improving as you address key issues.',

  'prd': 'I can generate a PRD for any feature. Which feature would you like me to focus on?\n\n**Available features:**\n1. Improve transaction speed\n2. Add PDF export functionality\n3. Mobile app optimization\n4. Fix authentication issues\n5. Implement dark mode\n\nJust let me know which one, and I\'ll create a comprehensive PRD with goals, user stories, and success metrics.',

  'roadmap': 'Here\'s your current product roadmap:\n\n**Q3 2026 (In Progress):**\n- Improve transaction speed (Backend team)\n- Add PDF export functionality (Frontend team)\n\n**Q4 2026 (Planned):**\n- Mobile app optimization (Mobile team)\n- Fix authentication issues (Backend team)\n\n**Q1 2027 (Planned):**\n- Implement dark mode (Frontend team)\n- Advanced analytics dashboard (Data team)',

  'default': 'I\'m your AI Product Manager Copilot! I can help you with:\n\n- **Analyze feedback** - Understand customer pain points and trends\n- **Extract themes** - AI-powered clustering of feedback into actionable themes\n- **Prioritize features** - RICE scoring and prioritization framework\n- **Generate PRDs** - Create comprehensive product requirement documents\n- **Plan roadmaps** - Build and manage your product roadmap\n- **View analytics** - Track product metrics and adoption\n\nWhat would you like to know?',
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: mockResponses.default,
      timestamp: '10:30 AM',
    },
  ]);

  const sendMessage = useCallback((userMessage: string) => {
    const newUserMessage: ChatMessage = {
      id: messages.length + 1,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    // Find matching response
    const lowerMessage = userMessage.toLowerCase();
    let responseText = mockResponses.default;

    if (lowerMessage.includes('pain point')) {
      responseText = mockResponses['pain points'];
    } else if (lowerMessage.includes('rice')) {
      responseText = mockResponses['rice scores'];
    } else if (lowerMessage.includes('trend')) {
      responseText = mockResponses.trends;
    } else if (lowerMessage.includes('prd')) {
      responseText = mockResponses.prd;
    } else if (lowerMessage.includes('roadmap')) {
      responseText = mockResponses.roadmap;
    }

    // Simulate AI response delay
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sources: ['Feedback Analysis', 'Theme Extraction', 'RICE Scoring'],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 800);
  }, [messages.length]);

  return { messages, sendMessage };
}
