'use client';

import React, { useState, useTransition } from 'react';
import type { CompanySettings } from '@/types/db';
import { updateBranding } from '@/actions/settingsActions';

export default function CompanyBrandingForm({ settings }: { settings: CompanySettings }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState(settings.companyName || 'LendBridge Capital');
  const [officialEmail, setOfficialEmail] = useState(settings.officialEmail || '');
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#1e40af');
  const [accentColor, setAccentColor] = useState(settings.accentColor || '#059669');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateBranding(formData);
      if (res.ok) {
        setMessage(res.message || 'Branding updated successfully! Refresh to apply full styles.');
      } else {
        setError(res.error || 'Failed to update branding.');
      }
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Form Settings */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          {message && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
              ✓ {message}
            </div>
          )}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
              ✕ {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Company / Brand Name</label>
            <input
              type="text"
              name="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. LendBridge Capital or Apex FinServ"
            />
            <p className="text-xs text-slate-400 mt-1">Displayed in the header, sidebar, customer application, and email footers.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Official Contact Email</label>
            <input
              type="email"
              name="officialEmail"
              value={officialEmail}
              onChange={(e) => setOfficialEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="support@yourcompany.com"
            />
            <p className="text-xs text-slate-400 mt-1">Default recipient for branch alerts when customers submit new loan requests.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  name="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full font-mono text-sm px-3.5 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Used for navigation bars, active states, and primary action buttons.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">Accent Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  name="accentColor"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full font-mono text-sm px-3.5 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Used for success badges, highlighted states, and callout elements.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Brand Logo (PNG, SVG, JPG, WEBP)</label>
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 hover:file:bg-slate-200 cursor-pointer"
            />
            {settings.logoUrl && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-slate-500">Current logo:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain border border-slate-100 rounded p-1 bg-white" />
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {isPending ? 'Saving Branding…' : 'Save White-Label Branding'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Brand Preview Card */}
      <div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Live White-Label Preview</h3>
          <p className="text-xs text-slate-500 mb-4">Here is how your client branding appears in the UI:</p>

          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-4">
            {/* Header Mockup */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-xs border border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  {companyName.charAt(0) || 'L'}
                </div>
                <span className="font-bold text-slate-800 text-xs">{companyName}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: accentColor }}>
                Verified
              </span>
            </div>

            {/* Buttons Mockup */}
            <div className="space-y-2">
              <button
                type="button"
                className="w-full py-2 px-3 rounded-md text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                + Apply for Loan (Primary)
              </button>
              <button
                type="button"
                className="w-full py-2 px-3 rounded-md text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: accentColor }}
              >
                ✓ Submit Documents (Accent)
              </button>
            </div>

            {/* Application Card Mockup */}
            <div className="bg-white p-3 rounded-lg border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-700">Home Loan Application</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: `${accentColor}18`, color: accentColor }}>
                  Approved
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">Rahul Deshmukh · ₹35,00,000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
