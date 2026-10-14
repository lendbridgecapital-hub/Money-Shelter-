import React from 'react';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/website/Navbar';
import { HeroSection } from '@/components/website/HeroSection';
import { CompanyAtAGlance } from '@/components/website/CompanyAtAGlance';
import { FinancingDimensions } from '@/components/website/FinancingDimensions';
import { BuilderSolutions } from '@/components/website/BuilderSolutions';
import { OperatingModel } from '@/components/website/OperatingModel';
import { InstitutionalNetwork } from '@/components/website/InstitutionalNetwork';
import { LeadershipSection } from '@/components/website/LeadershipSection';
import { EmiCalculatorSection } from '@/components/website/EmiCalculatorSection';
import { LeadInquirySection } from '@/components/website/LeadInquirySection';
import { PartnerCtaSection } from '@/components/website/PartnerCtaSection';
import { Footer } from '@/components/website/Footer';

export const metadata = {
  title: 'Money Shelter Pvt. Ltd. — Where Money Meets Trust',
  description:
    'Financial solutions for individuals, businesses, builders and real estate projects. Established 2014 in Pune, Maharashtra. ₹2,500+ Cr Cumulative Disbursements.',
};

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-600 selection:text-white flex flex-col font-sans">
      {/* Sticky Header Navigation */}
      <Navbar userSession={session?.user} />

      {/* Main Corporate Website Sections */}
      <main className="flex-grow">
        {/* Hero Section with Key Metrics Strip */}
        <HeroSection />

        {/* Company At A Glance & Maharashtra Footprint */}
        <CompanyAtAGlance />

        {/* Four Financing Dimensions */}
        <FinancingDimensions />

        {/* Exclusive Builder & Real Estate Solutions (APF & Project Finance) */}
        <BuilderSolutions />

        {/* Operating Model & 5-Step Case Journey */}
        <OperatingModel />

        {/* Institutional Network (20+ Banks & NBFCs) */}
        <InstitutionalNetwork />

        {/* Leadership: Sachin Sarode (Director • MBA) */}
        <LeadershipSection />

        {/* Interactive Loan EMI Calculator */}
        <EmiCalculatorSection />

        {/* Lead Inquiry & Consultation Request Form */}
        <LeadInquirySection />

        {/* Partner & DSA Onboarding CTA */}
        <PartnerCtaSection />
      </main>

      {/* Corporate Network Footer */}
      <Footer />
    </div>
  );
}
