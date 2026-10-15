import React from 'react';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/website/Navbar';
import { Footer } from '@/components/website/Footer';
import { LeadInquirySection } from '@/components/website/LeadInquirySection';

export const metadata = {
  title: 'Contact Us & Branch Network — Money Shelter Pvt. Ltd.',
  description:
    'Contact Money Shelter Pvt. Ltd. Head Office in Pune with branches in Nashik and Satara, and upcoming hubs in Mumbai and Kolhapur.',
};

export default async function ContactPage() {
  const session = await auth();

  const offices = [
    {
      city: 'Pune',
      role: 'Head Office',
      badge: 'bg-cyan-700 text-white',
      address: '5th Floor, Galore Tech IT Park, Bavdhan, Pune, Maharashtra - 411021',
      phone: '+91 9049002010',
      email: 'pune@moneyshelter.in',
      hours: 'Mon – Sat: 9:30 AM – 6:30 PM',
      highlight: 'Central Underwriting, Debt Syndication & Executive HQ',
    },
    {
      city: 'Nashik',
      role: 'Branch Office',
      badge: 'bg-cyan-700 text-white',
      address: 'College Road Commercial Hub, Nashik, Maharashtra - 422005',
      phone: '+91 253 2500 110',
      email: 'nashik@moneyshelter.in',
      hours: 'Mon – Sat: 9:30 AM – 6:30 PM',
      highlight: 'Retail Mortgages, SME Lending & Builder Desks',
    },
    {
      city: 'Satara',
      role: 'Branch Office',
      badge: 'bg-cyan-700 text-white',
      address: 'Powai Naka Business Complex, Satara, Maharashtra - 415001',
      phone: '+91 2162 230 011',
      email: 'satara@moneyshelter.in',
      hours: 'Mon – Sat: 9:30 AM – 6:30 PM',
      highlight: 'Western Maharashtra Regional Partner Hub & Retail Loans',
    },
    {
      city: 'Mumbai',
      role: 'Planned Expansion',
      badge: 'bg-amber-600 text-white',
      address: 'BKC & Western Suburbs Corporate Syndication Desk, Mumbai',
      phone: '+91 9049002010',
      email: 'mumbai@moneyshelter.in',
      hours: 'Operational Launch In Progress',
      highlight: 'Strategic Metro Real Estate & Corporate Debt Syndication',
    },
    {
      city: 'Kolhapur',
      role: 'Planned Expansion',
      badge: 'bg-amber-600 text-white',
      address: 'Regional Commercial & Agriculture Lending Hub, Kolhapur',
      phone: '+91 9049002010',
      email: 'kolhapur@moneyshelter.in',
      hours: 'Operational Launch In Progress',
      highlight: 'Commercial Capital, Agro-Industrial & Retail Network',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-600 selection:text-white flex flex-col font-sans">
      <Navbar userSession={session?.user} />

      <main className="flex-grow">
        {/* Page Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm font-semibold tracking-wide mb-6">
              <span>MAHARASHTRA NETWORK • DIRECT CONTACT</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-serif text-white leading-tight">
              Get in Touch with Our Advisory Desks
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
              Reach our corporate headquarters in Pune, our regional branch offices, or submit your direct loan inquiry below for immediate review.
            </p>
          </div>
        </section>

        {/* Office Directory Grid */}
        <section className="py-24 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-cyan-800 uppercase tracking-widest bg-cyan-100/80 px-3.5 py-1 rounded-full">
                OFFICE DIRECTORY
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif mt-3">
                Branch Locations & Contact Desks
              </h2>
              <p className="text-slate-600 mt-2 text-sm sm:text-base">
                Feel free to visit us or contact our team for institutional consultation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {offices.slice(0, 3).map((office) => (
                <div
                  key={office.city}
                  className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-cyan-600 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${office.badge}`}>
                        {office.role}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">Maharashtra</span>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 font-serif">{office.city}</h3>
                    <p className="text-xs font-semibold text-cyan-800 mt-1">{office.highlight}</p>

                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">Address:</span>
                        <span>{office.address}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">Telephone:</span>
                        <a href={`tel:${office.phone.replace(/[^0-9+]/g, '')}`} className="text-cyan-700 hover:underline font-semibold">
                          {office.phone}
                        </a>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">Email:</span>
                        <a href={`mailto:${office.email}`} className="text-cyan-700 hover:underline font-semibold">
                          {office.email}
                        </a>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">Business Hours:</span>
                        <span>{office.hours}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Expansion Desks (Mumbai & Kolhapur) */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              {offices.slice(3).map((office) => (
                <div
                  key={office.city}
                  className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-amber-500 text-slate-950">
                        {office.role}
                      </span>
                      <span className="text-xs text-amber-300 font-medium">Growth Corridor</span>
                    </div>

                    <h3 className="text-2xl font-bold font-serif text-white">{office.city} Hub</h3>
                    <p className="text-xs text-cyan-300 mt-1">{office.highlight}</p>
                    <p className="text-xs text-slate-400 mt-3">{office.address}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-300 flex justify-between items-center">
                    <span>Direct Desk: {office.email}</span>
                    <span className="text-amber-400 font-semibold">{office.hours}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lead Consultation Form with #inquiry anchor */}
        <div id="inquiry">
          <LeadInquirySection />
        </div>
      </main>

      <Footer />
    </div>
  );
}
