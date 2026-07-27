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

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background">
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
    </div>
  );
}
