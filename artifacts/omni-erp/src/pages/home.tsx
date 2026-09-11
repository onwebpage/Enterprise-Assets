import { motion } from 'framer-motion';
import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { TrustedBy } from '@/components/trusted-by';
import { FeaturesBento } from '@/components/features-bento';
import { ModulesShowcase } from '@/components/modules-showcase';
import { AISection } from '@/components/ai-section';
import { DashboardPreview } from '@/components/dashboard-preview';
import { Pricing } from '@/components/pricing';
import { Testimonials } from '@/components/testimonials';
import { FAQ } from '@/components/faq';
import { CTABanner } from '@/components/cta-banner';
import { Footer } from '@/components/footer';
import { BarChart3, Home as HomeIcon, Menu, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <motion.div
      className="home-page min-h-screen w-full bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Navbar />
      <Hero />
      <TrustedBy />
      <FeaturesBento />
      <ModulesShowcase />
      <AISection />
      <DashboardPreview />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTABanner />
      <Footer />
      <nav className="home-mobile-nav" aria-label="Home page navigation">
        <a href="#top"><HomeIcon className="h-4 w-4" /><span>Home</span></a>
        <a href="#products"><Sparkles className="h-4 w-4" /><span>Products</span></a>
        <a href="#pricing"><BarChart3 className="h-4 w-4" /><span>Pricing</span></a>
        <a href="#company"><Menu className="h-4 w-4" /><span>More</span></a>
      </nav>
    </motion.div>
  );
}
