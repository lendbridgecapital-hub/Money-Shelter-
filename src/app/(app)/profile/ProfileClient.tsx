'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { User, CompanySettings } from '@/types/db';
import { updateUserProfileAction } from '@/actions/userActions';

interface Props {
  user: User;
  settings: CompanySettings;
}

export default function ProfileClient({ user, settings }: Props) {
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [email, setEmail] = useState(user.email || '');
  const [firmName, setFirmName] = useState(user.firmName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [city, setCity] = useState(user.city || '');

  // Previews for file uploads
  const [photoPreview, setPhotoPreview] = useState<string | null>(user.photoUrl || null);
  const [firmLogoPreview, setFirmLogoPreview] = useState<string | null>(user.firmLogoUrl || null);

  const cardPath = `/card/${user.id}`;
  const cardUrl = typeof window !== 'undefined' ? `${window.location.origin}${cardPath}` : cardPath;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  function handleFirmLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFirmLogoPreview(URL.createObjectURL(file));
    }
  }

  function handleCopyCardLink() {
    navigator.clipboard.writeText(cardUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  function handleShareWhatsApp() {
    const text = encodeURIComponent(
      `Hello! Here is my official Digital Business Card from ${settings.companyName || 'QuickFinSure'}. Tap the link to view my financial services, save my contact details to your phone, or apply for a loan:\n\n${cardUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateUserProfileAction(formData);
      if (!res.ok) {
        setErrorMsg(res.error || 'Failed to update profile.');
      } else {
        setSuccessMsg(res.message || 'Profile updated successfully!');
      }
    });
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">
            My Profile & Business Details
          </h1>
          <p className="text-xs text-slate-500">
            Manage your personal profile, firm branding, contact details, and digital visiting card.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition"
        >
          <svg className="w-3.5 h-3.5 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Home Dashboard</span>
        </Link>
      </div>

      {/* Digital Business Card Quick Share Tile */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Digital Business Card
            </span>
            <h2 className="text-base font-bold text-white mt-1.5">
              Share Your Smart Visiting Card
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-lg mt-0.5">
              Share your digital card with clients. Receivers can save your contact directly into their phone in 1 click and submit their loan inquiries directly to you.
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 stroke-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
          </div>
        </div>

        {/* Action Buttons for Digital Card */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/10">
          <button
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
            </svg>
            <span>Share on WhatsApp</span>
          </button>

          <button
            onClick={handleCopyCardLink}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold rounded-xl border border-white/15 transition flex items-center gap-1.5"
          >
            <span>{copiedLink ? '✓ Link Copied' : 'Copy Card Link'}</span>
          </button>

          <Link
            href={cardPath}
            target="_blank"
            className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold rounded-xl border border-white/15 transition flex items-center gap-1.5"
          >
            <span>Preview Card ↗</span>
          </Link>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
            <span>✕</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Photos & Logos */}
        <div>
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 mb-3">
            1. Profile Photo & Firm Logo
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Profile Photo */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Advisor Profile Photo
              </label>
              <div className="flex items-center gap-3">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Profile Preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <input
                    type="file"
                    name="photoFile"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>

            {/* Firm Logo */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Firm / Agency Logo
              </label>
              <div className="flex items-center gap-3">
                {firmLogoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={firmLogoPreview}
                    alt="Firm Logo Preview"
                    className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-200 shadow-2xs shrink-0 p-1"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shrink-0">
                    Logo
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <input
                    type="file"
                    name="firmLogoFile"
                    accept="image/*"
                    onChange={handleFirmLogoChange}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-900 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Appears on your Digital Card</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Identity */}
        <div>
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 mb-3">
            2. Contact & Identity Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Mobile Number (Calling & WhatsApp) *
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Firm / Agency Name
              </label>
              <input
                type="text"
                name="firmName"
                placeholder="e.g. Sharma FinServe & Associates"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                City / Operational Region
              </label>
              <input
                type="text"
                name="city"
                placeholder="e.g. Mumbai, Navi Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Tagline / Advisor Bio
              </label>
              <input
                type="text"
                name="bio"
                placeholder="e.g. Certified Financial Advisor | Fast-track Home Loans"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Read-Only System Details */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Role</span>
            <span className="font-bold text-slate-800">{user.role.replace('_', ' ')}</span>
          </div>

          {user.partnerCode && (
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Partner Code</span>
              <span className="font-mono font-bold text-emerald-700">{user.partnerCode}</span>
            </div>
          )}

          {user.assignedRmName && (
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned RM</span>
              <span className="font-bold text-slate-800">{user.assignedRmName}</span>
            </div>
          )}

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Branch</span>
            <span className="font-bold text-slate-800">{user.branchName || 'Head Office'}</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Changes…</span>
              </>
            ) : (
              <span>Save Profile & Business Details</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
