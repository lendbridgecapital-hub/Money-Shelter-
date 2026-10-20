'use client';

import React, { useState, useTransition } from 'react';
import type { CompanySettings } from '@/types/db';
import { updateSmtpSettings, sendTestEmail } from '@/actions/settingsActions';

export default function EmailSettingsForm({ settings }: { settings: CompanySettings }) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Controlled form states: default to Port 465 SSL for Gmail in cloud environments
  const isHostGmail = (settings.smtpHost || '').toLowerCase().includes('gmail') || !settings.smtpHost;
  const initialPort = settings.smtpPort && settings.smtpPort !== 587 ? settings.smtpPort : 465;
  const initialSecure = isHostGmail ? true : Boolean(settings.smtpSecure);

  const [smtpHost, setSmtpHost] = useState(settings.smtpHost || 'smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState<number | string>(initialPort);
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser || 'lendbridgecapital@gmail.com');
  const [smtpFromName, setSmtpFromName] = useState(
    settings.smtpFromName || 'Lendbridge Capital Notifications'
  );
  const [smtpSecure, setSmtpSecure] = useState<boolean>(initialSecure);
  const [smtpPassword, setSmtpPassword] = useState('');

  const [testEmailAddress, setTestEmailAddress] = useState(
    settings.smtpUser || settings.officialEmail || 'kanase.hrishi@gmail.com'
  );
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const handleApplySataraPreset = () => {
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(465);
    setSmtpUser('lendbridgecapital@gmail.com');
    setSmtpFromName('Lendbridge Capital Notifications');
    setSmtpSecure(true);
    setTestEmailAddress('kanase.hrishi@gmail.com');
    setMessage('Loaded Lendbridge Capital (Satara Branch) Gmail relay preset on secure Port 465 (SSL/TLS). Please enter your 16-character Google App Password and click Save.');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setTestResult(null);

    const formData = new FormData();
    formData.set('smtpHost', smtpHost);
    formData.set('smtpPort', String(smtpPort));
    formData.set('smtpUser', smtpUser);
    formData.set('smtpFromName', smtpFromName);
    if (smtpSecure) formData.set('smtpSecure', 'on');
    if (smtpPassword) formData.set('smtpPassword', smtpPassword);

    startTransition(async () => {
      const res = await updateSmtpSettings(formData);
      if (res.ok) {
        setMessage(res.message || 'Email & SMTP settings saved successfully.');
      } else {
        setError(res.error || 'Failed to save email settings.');
      }
    });
  };

  const handleSendTest = () => {
    setTestResult(null);
    startTestTransition(async () => {
      const res = await sendTestEmail(testEmailAddress);
      if (res.ok) {
        setTestResult({ ok: true, text: res.message || 'Test email sent successfully! Check your inbox.' });
      } else {
        setTestResult({ ok: false, text: res.error || 'Test email failed to send.' });
      }
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {/* Satara Branch Quick Preset Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <span>📍 Satara Operating Branch</span>
            </div>
            <h4 className="text-base font-bold text-white">Lendbridge Capital Relay Config</h4>
            <p className="text-xs text-slate-300 max-w-lg">
              Deliver customer loan confirmations and internal Satara alerts using <strong className="text-white">lendbridgecapital@gmail.com</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplySataraPreset}
            className="shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚡</span>
            <span>Load Satara Gmail Preset</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {message && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
              ✓ {message}
            </div>
          )}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
              ✕ {error}
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-800 mb-1">SMTP Host / Server</label>
              <input
                type="text"
                name="smtpHost"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">Port</label>
              <input
                type="number"
                name="smtpPort"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="465"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Use <strong>465</strong> for Gmail SMTPS (recommended for Vercel).
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">SMTP Username / Email</label>
              <input
                type="text"
                name="smtpUser"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="lendbridgecapital@gmail.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                SMTP Password / Google App Password
              </label>
              <input
                type="password"
                name="smtpPassword"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={settings.smtpPassword ? '•••••••••••• (leave blank to keep current)' : '16-character App Password'}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Sender "From" Name</label>
            <input
              type="text"
              name="smtpFromName"
              value={smtpFromName}
              onChange={(e) => setSmtpFromName(e.target.value)}
              placeholder="Lendbridge Capital Notifications"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Recipients will see this friendly name in their email inbox (e.g. <em>"Lendbridge Capital Notifications" &lt;lendbridgecapital@gmail.com&gt;</em>).
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="smtpSecure"
              name="smtpSecure"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="smtpSecure" className="text-sm font-medium text-slate-700 cursor-pointer">
              Use SSL/TLS (<strong>REQUIRED</strong> for Port 465 on Gmail and Vercel cloud hosting)
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Saving Settings…' : 'Save Email Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Test Email & Instructions Section */}
      <div className="space-y-4">
        {/* Google App Password Guide */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>🔑</span> Google App Password Setup
          </h4>
          <p className="text-xs text-amber-800 mb-3 leading-relaxed">
            Gmail requires a 16-character <strong>App Password</strong> instead of your normal account password:
          </p>
          <ol className="text-xs text-amber-900 space-y-1.5 list-decimal pl-4 leading-relaxed font-medium">
            <li>
              Enable <strong>2-Step Verification</strong> on <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline font-bold text-amber-950">myaccount.google.com</a>.
            </li>
            <li>
              Open <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-amber-950">myaccount.google.com/apppasswords</a>.
            </li>
            <li>Enter App name (e.g. <code>Lendbridge</code>) and click <strong>Create</strong>.</li>
            <li>Copy the generated 16-character key (e.g. <code>abcd efgh ijkl mnop</code>).</li>
            <li>Paste it directly into the <strong>SMTP Password</strong> field on the left.</li>
          </ol>
        </div>

        {/* Send Test Email Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Test Delivery Relay</h3>
          <p className="text-xs text-slate-500">
            Send an instant test message to verify relay authorization and inbox delivery.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Email:</label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="lendbridgecapital@gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={isTesting || !testEmailAddress}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 py-2.5 px-4 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isTesting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Sending Test Email…</span>
                </>
              ) : (
                <>
                  <span>📨</span>
                  <span>Send Test Email Now</span>
                </>
              )}
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  testResult.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.ok ? '✓ ' : '✕ '} {testResult.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
