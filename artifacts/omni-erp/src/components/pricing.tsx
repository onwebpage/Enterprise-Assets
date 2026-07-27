import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Starter',
    price: { monthly: 49, yearly: 470 },
    description: 'Perfect for small businesses getting started',
    features: [
      'Up to 10 users',
      'Core ERP modules',
      'Basic reporting',
      '10 GB storage',
      'Email support',
      'Mobile apps',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Professional',
    price: { monthly: 199, yearly: 1910 },
    description: 'For growing businesses that need more power',
    features: [
      'Up to 100 users',
      'All ERP modules',
      'Advanced analytics',
      'AI-powered insights',
      '100 GB storage',
      'Priority support',
      'API access',
      'Custom workflows',
      'White-label options',
    ],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: { monthly: null, yearly: null },
    description: 'For large organizations with complex needs',
    features: [
      'Unlimited users',
      'All features included',
      'Dedicated AI models',
      'Unlimited storage',
      '24/7 dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'On-premise deployment',
      'Advanced security',
      'Dedicated success manager',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
];

const comparisonFeatures = [
  { name: 'Users', starter: '10', pro: '100', enterprise: 'Unlimited' },
  { name: 'Storage', starter: '10 GB', pro: '100 GB', enterprise: 'Unlimited' },
  { name: 'Core Modules', starter: true, pro: true, enterprise: true },
  { name: 'Advanced Analytics', starter: false, pro: true, enterprise: true },
  { name: 'AI Features', starter: false, pro: true, enterprise: true },
  { name: 'API Access', starter: false, pro: true, enterprise: true },
  { name: 'White Label', starter: false, pro: true, enterprise: true },
  { name: 'Priority Support', starter: false, pro: true, enterprise: true },
  { name: 'SLA Guarantee', starter: false, pro: false, enterprise: true },
  { name: 'Dedicated Manager', starter: false, pro: false, enterprise: true },
];

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Simple,
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Transparent Pricing.
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Choose the perfect plan for your business. No hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 glassmorphism rounded-full p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-gradient-to-r from-primary to-accent text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                isYearly
                  ? 'bg-gradient-to-r from-primary to-accent text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-[#22C55E]/20 text-[#22C55E] px-2 py-1 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`relative ${plan.featured ? 'md:-mt-4' : ''}`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-sm font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              )}
              
              <div
                className={`h-full glassmorphism rounded-2xl p-8 ${
                  plan.featured
                    ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30'
                    : ''
                }`}
              >
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                <div className="mb-6">
                  {plan.price.monthly ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">
                          ${isYearly ? plan.price.yearly : plan.price.monthly}
                        </span>
                        <span className="text-muted-foreground">
                          /{isYearly ? 'year' : 'month'}
                        </span>
                      </div>
                      {isYearly && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Billed annually
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-4xl font-bold">Custom</div>
                  )}
                </div>

                <Button
                  className={`w-full mb-6 ${
                    plan.featured
                      ? 'gradient-primary'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  size="lg"
                >
                  {plan.cta}
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glassmorphism rounded-2xl p-8 overflow-x-auto"
        >
          <h3 className="text-2xl font-bold mb-6">Feature Comparison</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4">Feature</th>
                <th className="text-center py-3 px-4">Starter</th>
                <th className="text-center py-3 px-4">Professional</th>
                <th className="text-center py-3 px-4">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((feature, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm font-medium">{feature.name}</td>
                  <td className="py-3 px-4 text-center text-sm">
                    {typeof feature.starter === 'boolean' ? (
                      feature.starter ? (
                        <Check className="w-4 h-4 text-primary mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      feature.starter
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-sm">
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? (
                        <Check className="w-4 h-4 text-primary mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      feature.pro
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-sm">
                    {typeof feature.enterprise === 'boolean' ? (
                      feature.enterprise ? (
                        <Check className="w-4 h-4 text-primary mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      feature.enterprise
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
