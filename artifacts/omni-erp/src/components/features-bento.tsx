import { motion } from 'framer-motion';
import { Brain, Cloud, Receipt, Smartphone, Palette, Shield, BarChart3, Globe2, Users, Zap } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Powered',
    description: 'Intelligent automation and predictive insights',
    span: 'col-span-1 row-span-2',
    gradient: 'from-primary/20 to-accent/20',
  },
  {
    icon: Cloud,
    title: 'Cloud Native',
    description: 'Built for scale and reliability',
    span: 'col-span-1',
    gradient: 'from-accent/20 to-primary/20',
  },
  {
    icon: Receipt,
    title: 'GST Ready',
    description: 'Compliant with global tax regulations',
    span: 'col-span-1',
    gradient: 'from-[#22C55E]/20 to-accent/20',
  },
  {
    icon: Smartphone,
    title: 'Mobile Ready',
    description: 'Native apps for iOS and Android',
    span: 'col-span-1',
    gradient: 'from-primary/20 to-[#22C55E]/20',
  },
  {
    icon: Palette,
    title: 'White Label',
    description: 'Fully customizable branding',
    span: 'col-span-1',
    gradient: 'from-accent/20 to-primary/20',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption and compliance',
    span: 'col-span-1 row-span-2',
    gradient: 'from-destructive/20 to-[#F59E0B]/20',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Live dashboards and reporting',
    span: 'col-span-1',
    gradient: 'from-[#F59E0B]/20 to-primary/20',
  },
  {
    icon: Globe2,
    title: 'Multi-currency',
    description: 'Support for 150+ currencies',
    span: 'col-span-1',
    gradient: 'from-primary/20 to-accent/20',
  },
  {
    icon: Users,
    title: 'Role-based Access',
    description: 'Granular permissions control',
    span: 'col-span-1',
    gradient: 'from-accent/20 to-[#22C55E]/20',
  },
  {
    icon: Zap,
    title: 'API-first',
    description: 'RESTful APIs for seamless integration',
    span: 'col-span-1',
    gradient: 'from-[#22C55E]/20 to-primary/20',
  },
];

export function FeaturesBento() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-30" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            243+ Enterprise Features.
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              20 Core Modules.
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to run a modern enterprise, built into one powerful platform.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[180px]">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.6 }}
              className={`${feature.span} group`}
            >
              <div className="h-full glassmorphism rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                <div className="relative z-10 h-full flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
