import { motion } from 'framer-motion';
import { Brain, Eye, Shield, MessageSquare, TrendingUp, Sparkles, Zap } from 'lucide-react';

const aiFeatures = [
  {
    icon: Eye,
    title: 'OCR',
    description: 'Extract data from invoices and documents automatically',
  },
  {
    icon: TrendingUp,
    title: 'Forecasting',
    description: 'Predict revenue, inventory, and cash flow with ML models',
  },
  {
    icon: Shield,
    title: 'Fraud Detection',
    description: 'Identify anomalies and suspicious transactions in real-time',
  },
  {
    icon: MessageSquare,
    title: 'Chatbot',
    description: 'Natural language interface for queries and actions',
  },
  {
    icon: Sparkles,
    title: 'Business Intelligence',
    description: 'Auto-generate insights from your data',
  },
  {
    icon: Zap,
    title: 'Smart Automation',
    description: 'Workflow automation based on patterns and rules',
  },
];

export function AISection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.05) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glassmorphism mb-6">
            <Brain className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Powered by AI</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Intelligence
            <br />
            <span className="bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">
              Built In.
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Let AI handle the tedious work. Focus on what matters — growing your business.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: AI Chat Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="glassmorphism rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold">OmniERP AI Assistant</div>
                  <div className="text-xs text-muted-foreground">Always online</div>
                </div>
              </div>

              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                  <div className="glassmorphism rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                    <p className="text-sm">Show me Q2 revenue breakdown by region</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="flex gap-3 flex-row-reverse"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex-shrink-0" />
                  <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl rounded-tr-none px-4 py-3 max-w-[80%]">
                    <p className="text-sm mb-3">Here's your Q2 revenue by region:</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">North America</span>
                        <span className="font-semibold">$842K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Europe</span>
                        <span className="font-semibold">$634K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Asia Pacific</span>
                        <span className="font-semibold">$524K</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      North America grew 24% vs Q1. Would you like me to analyze the drivers?
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                  <div className="glassmorphism rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                    <p className="text-sm">Yes, please analyze</p>
                  </div>
                </motion.div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
                <div className="flex-1 glassmorphism rounded-lg px-4 py-2 text-sm text-muted-foreground">
                  Ask me anything...
                </div>
                <button className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right: AI Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {aiFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                whileHover={{ y: -3 }}
                className="glassmorphism rounded-xl p-6 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 group-hover:from-accent group-hover:to-primary flex items-center justify-center mb-4 transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
