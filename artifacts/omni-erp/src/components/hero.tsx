import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const chartData = [
  { value: 400 },
  { value: 300 },
  { value: 600 },
  { value: 800 },
  { value: 500 },
  { value: 700 },
  { value: 900 },
  { value: 1100 },
];

function CountUp({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Gradient */}
      <div className="absolute inset-0 gradient-glow opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-block mb-6 px-4 py-2 rounded-full glassmorphism text-sm font-medium"
            >
              Powered by AI • Cloud Native • Enterprise Ready
            </motion.div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              The Enterprise OS.
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Reimagined.
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Run your entire business on one platform. From finance to manufacturing, 
              sales to HR — OmniERP is the operating system modern enterprises deserve.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="gradient-primary text-base px-8">
                Start Free Trial
              </Button>
              <Button size="lg" variant="ghost" className="text-base">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-8 mt-12 justify-center lg:justify-start">
              <div>
                <div className="text-3xl font-bold">10,000+</div>
                <div className="text-sm text-muted-foreground">Enterprises</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div>
                <div className="text-3xl font-bold">150+</div>
                <div className="text-sm text-muted-foreground">Countries</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div>
                <div className="text-3xl font-bold">99.99%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
            </div>
          </motion.div>

          {/* Right: Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative"
          >
            <div className="relative animate-float">
              {/* Main Dashboard Card */}
              <div className="glassmorphism rounded-2xl p-6 shadow-2xl">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                      <div className="w-3 h-3 rounded-full bg-[#22C55E]/60" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['□', '○', '△'].map((icon, i) => (
                      <div key={i} className="w-6 h-6 rounded bg-white/5" />
                    ))}
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="glassmorphism rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Revenue</div>
                    <div className="text-2xl font-bold">$<CountUp end={2400000} />M</div>
                    <div className="text-xs text-[#22C55E] mt-1">+12.5%</div>
                  </div>
                  <div className="glassmorphism rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Orders</div>
                    <div className="text-2xl font-bold"><CountUp end={1847} /></div>
                    <div className="text-xs text-[#22C55E] mt-1">+8.2%</div>
                  </div>
                  <div className="glassmorphism rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Employees</div>
                    <div className="text-2xl font-bold"><CountUp end={342} /></div>
                    <div className="text-xs text-muted-foreground mt-1">Active</div>
                  </div>
                  <div className="glassmorphism rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Invoices</div>
                    <div className="text-2xl font-bold"><CountUp end={96} />%</div>
                    <div className="text-xs text-[#06B6D4] mt-1">Paid</div>
                  </div>
                </div>

                {/* Chart */}
                <div className="glassmorphism rounded-lg p-4">
                  <div className="text-sm font-medium mb-3">Revenue Trend</div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorValue)"
                          animationDuration={2000}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Floating AI Insight Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="absolute -right-4 top-1/2 -translate-y-1/2 glassmorphism rounded-lg p-4 shadow-xl max-w-[200px] hidden xl:block"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-xs font-bold">
                    AI
                  </div>
                  <div>
                    <div className="text-xs font-medium">Insight</div>
                    <div className="text-xs text-muted-foreground">Just now</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Q2 revenue up 18%. Recommend increasing inventory for Product X.
                </p>
              </motion.div>

              {/* Floating Activity Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="absolute -left-4 bottom-12 glassmorphism rounded-lg p-3 shadow-xl hidden lg:block"
              >
                <div className="text-xs font-medium mb-2">Recent Activity</div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="text-xs text-muted-foreground">
                        Invoice #{1000 + i} paid
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
