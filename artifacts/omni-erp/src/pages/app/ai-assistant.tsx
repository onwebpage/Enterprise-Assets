import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, TrendingUp, AlertCircle, Zap, FileText, BarChart3, Users, RefreshCw, Paperclip, Mic, ChevronRight, Target, DollarSign, Package, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const suggestions = [
  { icon: TrendingUp, text: 'What is the revenue forecast for Q4 2026?', color: 'text-[#2563EB]' },
  { icon: AlertCircle, text: 'Show me all overdue invoices above $10,000', color: 'text-amber-400' },
  { icon: Package, text: 'Which products are below reorder point?', color: 'text-red-400' },
  { icon: Users, text: 'Summarize this month\'s HR highlights', color: 'text-[#06B6D4]' },
  { icon: BarChart3, text: 'Compare Q2 vs Q3 performance', color: 'text-emerald-400' },
  { icon: FileText, text: 'Generate a P&L summary for July 2026', color: 'text-purple-400' },
];

const capabilities = [
  { title: 'Financial Analysis', desc: 'P&L, cash flow, forecasting', icon: DollarSign },
  { title: 'Sales Intelligence', desc: 'Pipeline analysis, win rates', icon: TrendingUp },
  { title: 'Inventory Alerts', desc: 'Reorder points, valuations', icon: Package },
  { title: 'HR Insights', desc: 'Headcount, payroll, attrition', icon: Users },
  { title: 'Smart Automation', desc: 'Workflow suggestions', icon: Zap },
  { title: 'Report Generation', desc: 'On-demand PDF/Excel reports', icon: FileText },
];

const demoConversation: Message[] = [
  { id: 1, role: 'user', content: 'What is the revenue forecast for Q4 2026?', time: '10:42 AM' },
  {
    id: 2, role: 'assistant', time: '10:42 AM',
    content: `Based on current trends and historical data, here's the **Q4 2026 Revenue Forecast**:

**Projected Revenue: $9.2M – $9.8M**
- Conservative estimate: $9.2M (+27.8% vs Q4 2025)
- Base estimate: $9.5M (+31.9% vs Q4 2025)
- Optimistic estimate: $9.8M (+36.1% vs Q4 2025)

**Key Drivers:**
• Sales pipeline value: $2.84M with 38.4% win rate
• 3 enterprise deals ($840K total) expected to close in October
• Manufacturing capacity at 92.1% — supply constraint is low risk
• Seasonal uplift typically +8–12% in Q4 for your sector

**Risks to watch:**
⚠️ 2 deals in "Negotiation" stage may slip to Q1 2027
⚠️ Inventory shortage (SKU-2841) could delay $94K in orders

Would you like me to generate a detailed forecast report or drill into any specific module?`
  },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(demoConversation);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = (text?: string) => {
    const content = text || input.trim();
    if (!content) return;
    const newMsg: Message = { id: messages.length + 1, role: 'user', content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: prev.length + 1, role: 'assistant', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `I've analyzed the data for your query: **"${content}"**\n\nHere's what I found based on current data in OmniERP:\n\n• **Revenue this month:** $8.1M (+14.3% YoY)\n• **Top performing module:** Finance (+21.5%)\n• **Attention needed:** 2 overdue invoices totaling $124,250\n\nWould you like a detailed breakdown or should I generate a report?`
      }]);
    }, 1500);
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Intelligence' }, { label: 'AI Assistant' }]}>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-white/[0.07] flex flex-col hidden xl:flex">
          <div className="p-4 border-b border-white/[0.07]">
            <Button size="sm" className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"><RefreshCw className="w-3.5 h-3.5 mr-1.5" />New Conversation</Button>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Capabilities</p>
            <div className="space-y-1.5">
              {capabilities.map((cap) => (
                <div key={cap.title} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer group">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center flex-shrink-0">
                    <cap.icon className="w-3.5 h-3.5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/70 group-hover:text-white">{cap.title}</p>
                    <p className="text-[10px] text-white/30">{cap.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3 mt-5">Recent Conversations</p>
            <div className="space-y-1">
              {['Revenue forecast Q4', 'Overdue invoices report', 'Payroll analysis July', 'Inventory reorder alerts'].map(c => (
                <button key={c} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/[0.04] text-xs text-white/50 hover:text-white transition-colors truncate">{c}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">OmniERP AI</p>
                <p className="text-xs text-white/40 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />Online · Powered by enterprise LLM</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-[#2563EB]/20 to-[#06B6D4]/20 border-[#2563EB]/20 text-[#06B6D4] text-xs">
              <Sparkles className="w-3 h-3 mr-1" />AI Pro
            </Badge>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">How can I help you today?</h2>
                <p className="text-white/40 text-sm max-w-sm">I have full access to your OmniERP data. Ask me anything about finance, sales, inventory, HR, and more.</p>
              </div>
            )}

            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-[#2563EB] to-[#06B6D4]' : 'bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <span className="text-xs font-bold text-white">JD</span>}
                </div>
                <div className={`max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-[#0a0f1e] border border-white/[0.07] text-white/85' : 'bg-[#2563EB] text-white'}`}>
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] text-white/25">{msg.time}</span>
                      <button className="p-1 rounded hover:bg-white/[0.05] text-white/20 hover:text-white/50 transition-colors"><ThumbsUp className="w-3 h-3" /></button>
                      <button className="p-1 rounded hover:bg-white/[0.05] text-white/20 hover:text-white/50 transition-colors"><ThumbsDown className="w-3 h-3" /></button>
                      <button className="p-1 rounded hover:bg-white/[0.05] text-white/20 hover:text-white/50 transition-colors"><Copy className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center gap-1">
                  {[0, 0.2, 0.4].map((d) => (
                    <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-white/40"
                      animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div className="px-6 pb-2">
              <p className="text-xs text-white/30 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((s) => (
                  <button key={s.text} onClick={() => sendMessage(s.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:border-[#2563EB]/30 hover:bg-[#2563EB]/10 transition-all text-xs text-white/60 hover:text-white">
                    <s.icon className={`w-3 h-3 ${s.color}`} />{s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-white/[0.07]">
            <div className="flex items-end gap-3 bg-[#0a0f1e] border border-white/[0.1] rounded-2xl p-3 focus-within:border-[#2563EB]/40 transition-colors">
              <button className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors flex-shrink-0"><Paperclip className="w-4 h-4" /></button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask anything about your business data..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none resize-none leading-relaxed"
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Mic className="w-4 h-4" /></button>
                <button onClick={() => sendMessage()} disabled={!input.trim()}
                  className="p-2 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-white/20 text-center mt-2">OmniERP AI has access to your live data. All conversations are encrypted.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
