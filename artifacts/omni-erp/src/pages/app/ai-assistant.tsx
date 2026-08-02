import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Sparkles, TrendingUp, AlertCircle, Zap, FileText,
  BarChart3, Users, RefreshCw, Mic, ChevronRight, Target,
  DollarSign, Package, Copy, ThumbsUp, ThumbsDown, Trash2,
  MessageSquare, Plus, CheckCheck, X,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useConversations,
  useConversationMessages,
  useCreateConversation,
  useDeleteConversation,
  useSendMessage,
  useMessageFeedback,
  type AiMessage,
  type AiConversation,
} from '@/hooks/useAiAssistant';
import { useQueryClient } from '@tanstack/react-query';

// ── Static data ───────────────────────────────────────────────────────────────

const suggestions = [
  { icon: TrendingUp,  text: 'Show business overview',             color: 'text-[#2563EB]' },
  { icon: AlertCircle, text: 'Show me all overdue invoices',        color: 'text-amber-400' },
  { icon: Package,     text: 'Which products are below reorder point?', color: 'text-red-400' },
  { icon: Users,       text: 'Summarize HR highlights',             color: 'text-[#06B6D4]' },
  { icon: BarChart3,   text: 'Show P&L summary',                    color: 'text-emerald-400' },
  { icon: DollarSign,  text: 'What is our revenue this month?',      color: 'text-purple-400' },
];

const capabilities = [
  { title: 'Financial Analysis',   desc: 'P&L, revenue, cash flow',      icon: DollarSign },
  { title: 'Receivables & Payables', desc: 'AR/AP invoices, overdue',     icon: FileText },
  { title: 'Inventory Alerts',     desc: 'Reorder points, valuations',    icon: Package },
  { title: 'HR Insights',          desc: 'Headcount, payroll, leave',     icon: Users },
  { title: 'Manufacturing',        desc: 'Work orders, production',       icon: Zap },
  { title: 'Banking & Procurement',desc: 'Cash, POs, vendor spend',       icon: BarChart3 },
];

// ── Markdown-lite renderer ─────────────────────────────────────────────────────

function renderContent(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    // Bold headings (** text **)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const parts: React.ReactNode[] = [];
    let last = 0;
    let match;
    const workLine = line;
    boldRegex.lastIndex = 0;

    while ((match = boldRegex.exec(workLine)) !== null) {
      if (match.index > last) parts.push(workLine.slice(last, match.index));
      parts.push(<strong key={match.index} className="text-white font-semibold">{match[1]}</strong>);
      last = match.index + match[0].length;
    }
    if (last < workLine.length) parts.push(workLine.slice(last));

    // Detect bullet lines
    const isBullet = /^\s*(•|⚠️|✅|🔴|📊|💰|📄|📑|📦|👥|💵|🗓️|💼|🏭|🏦|🛒|🤝|🏢|💵|🤖|👋|⚡|🔍|📈|📉|🚨|💡|❗)/.test(line);

    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <div key={i} className={`leading-relaxed ${isBullet ? 'pl-1' : ''}`}>
          {parts.length > 0 ? parts : line}
        </div>
      );
    }
  });

  return <div className="text-sm space-y-0.5">{elements}</div>;
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center gap-1.5">
        <span className="text-xs text-white/40 mr-1">Analyzing live data</span>
        {[0, 0.2, 0.4].map((d) => (
          <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-[#2563EB]/60"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: d }} />
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onFeedback,
  onCopy,
  userInitials,
}: {
  msg: AiMessage;
  onFeedback: (id: number, liked: boolean) => void;
  onCopy: (text: string) => void;
  userInitials: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
        ${msg.role === 'assistant'
          ? 'bg-gradient-to-br from-[#2563EB] to-[#06B6D4]'
          : 'bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40'}`}>
        {msg.role === 'assistant'
          ? <Bot className="w-4 h-4 text-white" />
          : <span className="text-xs font-bold text-white">{userInitials}</span>}
      </div>

      {/* Bubble */}
      <div className={`max-w-2xl flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3
          ${msg.role === 'assistant'
            ? 'bg-[#0a0f1e] border border-white/[0.07] text-white/85'
            : 'bg-[#2563EB] text-white'}`}>
          {msg.role === 'assistant' ? renderContent(msg.content) : <p className="text-sm">{msg.content}</p>}
        </div>

        {/* Footer actions */}
        {msg.role === 'assistant' && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[10px] text-white/25">{time}</span>
            <button
              onClick={() => onFeedback(msg.id, true)}
              title="Helpful"
              className={`p-1 rounded transition-colors ${msg.liked === true ? 'text-emerald-400' : 'text-white/20 hover:text-white/50'} hover:bg-white/[0.05]`}>
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => onFeedback(msg.id, false)}
              title="Not helpful"
              className={`p-1 rounded transition-colors ${msg.liked === false ? 'text-red-400' : 'text-white/20 hover:text-white/50'} hover:bg-white/[0.05]`}>
              <ThumbsDown className="w-3 h-3" />
            </button>
            <button onClick={handleCopy} title="Copy" className="p-1 rounded hover:bg-white/[0.05] text-white/20 hover:text-white/50 transition-colors">
              {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
        {msg.role === 'user' && (
          <span className="text-[10px] text-white/25 px-1">{time}</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AIAssistant() {
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [localMessages, setLocalMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [], isLoading: convLoading } = useConversations();
  const { data: savedMessages = [] } = useConversationMessages(activeConvId);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const sendMessage = useSendMessage();
  const feedback = useMessageFeedback();

  // Sync saved messages when conversation changes
  useEffect(() => {
    if (activeConvId && savedMessages.length > 0) {
      setLocalMessages(savedMessages);
    }
  }, [savedMessages, activeConvId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, isThinking]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isThinking) return;

    setInput('');
    setError(null);

    // Optimistic user message
    const optimisticUser: AiMessage = {
      id: Date.now(),
      conversationId: activeConvId ?? 0,
      role: 'user',
      content,
      liked: null,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, optimisticUser]);
    setIsThinking(true);

    try {
      const result = await sendMessage.mutateAsync({
        message: content,
        conversationId: activeConvId ?? undefined,
      });

      const { conversationId, message: assistantMsg } = result;

      // Update active conversation
      if (!activeConvId) {
        setActiveConvId(conversationId);
        qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
      }

      // Replace optimistic + add real assistant message
      setLocalMessages(prev => {
        const withoutOptimistic = prev.filter(m => m.id !== optimisticUser.id);
        const realUser: AiMessage = {
          ...optimisticUser,
          conversationId,
        };
        return [...withoutOptimistic, realUser, assistantMsg];
      });

      // Invalidate cached messages for this conversation
      qc.invalidateQueries({ queryKey: ['ai', 'conversations', conversationId, 'messages'] });
      qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    } catch {
      setError('Failed to get a response. Please try again.');
      setLocalMessages(prev => prev.filter(m => m.id !== optimisticUser.id));
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, activeConvId, sendMessage, qc]);

  const handleNewConversation = () => {
    setActiveConvId(null);
    setLocalMessages([]);
    setError(null);
    setInput('');
  };

  const handleSelectConversation = (conv: AiConversation) => {
    if (conv.id === activeConvId) return;
    setActiveConvId(conv.id);
    setLocalMessages([]);
    setError(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteConversation.mutateAsync(id);
    if (activeConvId === id) handleNewConversation();
  };

  const handleFeedback = (id: number, liked: boolean) => {
    setLocalMessages(prev => prev.map(m => m.id === id ? { ...m, liked } : m));
    feedback.mutate({ id, liked });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // Get user initials from auth (fallback to "JD")
  const userInitials = 'JD';

  const messages = localMessages;
  const showEmptyState = messages.length === 0 && !isThinking;

  return (
    <AppLayout breadcrumbs={[{ label: 'Intelligence' }, { label: 'AI Assistant' }]}>
      <div className="flex h-full overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r border-white/[0.07] flex flex-col hidden xl:flex">
          <div className="p-4 border-b border-white/[0.07]">
            <Button
              size="sm"
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] gap-1.5"
              onClick={handleNewConversation}
            >
              <Plus className="w-3.5 h-3.5" />New Conversation
            </Button>
          </div>

          <div className="p-4 flex-1 overflow-auto space-y-5">
            {/* Capabilities */}
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Capabilities</p>
              <div className="space-y-1">
                {capabilities.map((cap) => (
                  <div key={cap.title}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer group">
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
            </div>

            {/* Conversation history */}
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Recent Chats</p>
              {convLoading ? (
                <div className="space-y-1.5">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-8 rounded-lg bg-white/[0.03] animate-pulse" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-[11px] text-white/25 italic">No conversations yet</p>
              ) : (
                <div className="space-y-0.5">
                  {conversations.map(conv => (
                    <div key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`group flex items-center gap-2 w-full text-left px-2 py-2 rounded-lg transition-colors cursor-pointer
                        ${activeConvId === conv.id ? 'bg-[#2563EB]/20 border border-[#2563EB]/30' : 'hover:bg-white/[0.04]'}`}>
                      <MessageSquare className="w-3 h-3 text-white/30 flex-shrink-0" />
                      <span className="flex-1 text-xs text-white/50 group-hover:text-white truncate">
                        {conv.title}
                      </span>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all flex-shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Chat Area ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">OmniERP AI</p>
                <p className="text-xs text-white/40 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                  Online · Powered by live ERP data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleNewConversation}
                className="text-white/40 hover:text-white xl:hidden">
                <Plus className="w-4 h-4" />
              </Button>
              <Badge className="bg-gradient-to-r from-[#2563EB]/20 to-[#06B6D4]/20 border-[#2563EB]/20 text-[#06B6D4] text-xs">
                <Sparkles className="w-3 h-3 mr-1" />AI Pro
              </Badge>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-6 space-y-5">

            {/* Empty state */}
            {showEmptyState && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center pt-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center mb-4 shadow-lg shadow-[#2563EB]/20">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">How can I help you today?</h2>
                <p className="text-white/40 text-sm max-w-sm mb-8">
                  I have full access to your live OmniERP data. Ask me anything about finance, sales, inventory, HR, and more.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
                  {suggestions.map((s) => (
                    <button key={s.text} onClick={() => handleSend(s.text)}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-[#2563EB]/30 hover:bg-[#2563EB]/08 transition-all text-left group">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                      </div>
                      <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors">{s.text}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages */}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onFeedback={handleFeedback}
                  onCopy={handleCopy}
                  userInitials={userInitials}
                />
              ))}
            </AnimatePresence>

            {/* Thinking */}
            {isThinking && <TypingIndicator />}

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions (visible when few messages) */}
          {messages.length > 0 && messages.length <= 3 && (
            <div className="px-6 pb-2 flex-shrink-0">
              <p className="text-xs text-white/25 mb-2">Quick actions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((s) => (
                  <button key={s.text} onClick={() => handleSend(s.text)}
                    disabled={isThinking}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:border-[#2563EB]/30 hover:bg-[#2563EB]/10 transition-all text-xs text-white/50 hover:text-white disabled:opacity-40">
                    <s.icon className={`w-3 h-3 ${s.color}`} />{s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-4 border-t border-white/[0.07] flex-shrink-0">
            <div className={`flex items-end gap-3 bg-[#0a0f1e] border rounded-2xl p-3 transition-colors
              ${isThinking ? 'border-white/[0.05]' : 'border-white/[0.1] focus-within:border-[#2563EB]/40'}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isThinking ? 'AI is thinking...' : 'Ask anything about your business data...'}
                disabled={isThinking}
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none resize-none leading-relaxed disabled:opacity-50"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isThinking}
                className="p-2 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-white/20 text-center mt-2">
              OmniERP AI reads live data from your database. Ask in plain English.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
