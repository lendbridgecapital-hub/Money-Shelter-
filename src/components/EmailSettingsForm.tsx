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
  const [showPassword, setShowPassword] = useState(false);

  const [testEmailAddress, setTestEmailAddress] = useState(
    'kanase.hrishi@gmail.com'
  );
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const handleApplySataraPreset = () => {
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(465);
    setSmtpUser('lendbridgecapital@gmail.com');
    setSmtpFromName('Lendbridge Capital Notifications');
    setSmtpSecure(true);
    setTestEmailAddress('kanase.hrishi@gmail.com');
    setMessage('Loaded Lendbridge Capital (Satara Branch) Gmail relay preset on secure Port 465 (SSL/TLS). Please enter your 16-character Google App Password (or Brevo API Key) below and click Save.');
    setError(null);
  };

  const handleApplyBrevoPreset = () => {
    setSmtpHost('smtp-relay.brevo.com');
    setSmtpPort(587);
    setSmtpUser('lendbridgecapital@gmail.com');
    setSmtpFromName('Lendbridge Capital Notifications');
    setSmtpSecure(false);
    setTestEmailAddress('kanase.hrishi@gmail.com');
    setMessage('Loaded Brevo SMTP Relay preset (smtp-relay.brevo.com:587). Paste your Brevo SMTP key (xsmtpsib-) or API key (xkeysib-) below and click Save.');
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
          <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={handleApplySataraPreset}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚡</span>
              <span>Load Satara Gmail (Port 465)</span>
            </button>
            <button
              type="button"
              onClick={handleApplyBrevoPreset}
              className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚡</span>
              <span>Load Brevo Relay (Port 587)</span>
            </button>
          </div>
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
                Password / API Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="smtpPassword"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={settings.smtpPassword ? '•••••••••••• (leave blank to keep current)' : '16-char App Password or Brevo Key'}
                  className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Enter your 16-character <strong>Google App Password</strong> OR paste a <strong>Brevo API Key</strong> (<code>xkeysib-...</code>).
              </p>

              {/* Real-time key type detection and guided fix */}
              {smtpPassword.trim().startsWith('xsmtpsib-') && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <span>⚠️</span>
                    <span>Brevo SMTP Key Detected (xsmtpsib-...)</span>
                  </div>
                  <p className="leading-relaxed">
                    You entered a Brevo <strong>SMTP Key</strong>. If Host is currently set to <code>{smtpHost}</code>, Google will reject it.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSmtpHost('smtp-relay.brevo.com');
                        setSmtpPort(587);
                        setSmtpSecure(false);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      ⚡ Auto-Fix Host to smtp-relay.brevo.com:587
                    </button>
                    <a
                      href="https://app.brevo.com/settings/keys/api"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg text-[11px] transition inline-flex items-center gap-1"
                    >
                      <span>Get API Key (xkeysib-) instead ↗</span>
                    </a>
                  </div>
                </div>
              )}

              {smtpPassword.trim().startsWith('xkeysib-') && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-1.5 font-medium">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <strong className="text-emerald-900">Brevo HTTPS REST API Key Active</strong>
                    <div className="text-[11px] text-emerald-700">Delivers over HTTPS (Port 443) in ~0.3s — 100% immune to Vercel socket firewall blocks.</div>
                  </div>
                </div>
              )}

              {smtpHost.toLowerCase().includes('gmail') &&
                smtpPassword.trim().length === 16 &&
                !smtpPassword.trim().includes(' ') &&
                !smtpPassword.trim().startsWith('x') && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Google 16-character App Password format verified.</span>
                  </div>
                )}
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
                placeholder="kanase.hrishi@gmail.com"
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
                className={`p-3 rounded-xl text-xs font-medium leading-relaxed ${
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

        {/* Option A: Google App Password Setup */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>🔑</span> Method A: Google App Password
          </h4>
          <p className="text-xs text-amber-800 mb-2 leading-relaxed">
            If using Gmail SMTP directly, you <strong>must</strong> use a 16-character App Password (not your Gmail login password):
          </p>
          <ol className="text-xs text-amber-900 space-y-1.5 list-decimal pl-4 leading-relaxed font-medium">
            <li>
              Enable <strong>2-Step Verification</strong> on <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline font-bold text-amber-950">myaccount.google.com</a>.
            </li>
            <li>
              Open <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-amber-950">myaccount.google.com/apppasswords</a>.
            </li>
            <li>Enter App name <code>Lendbridge</code> and click <strong>Create</strong>.</li>
            <li>Copy the 16-character key (e.g. <code>abcd efgh ijkl mnop</code>).</li>
            <li>Paste into <strong>Password</strong> field and click <strong>Save</strong>.</li>
          </ol>
        </div>

        {/* Option B: Free Brevo Relay (Vercel-proof) */}
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-extrabold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span> Method B: Free Brevo Relay (300 emails/day)
          </h4>
          <p className="text-xs text-sky-800 leading-relaxed">
            Brevo provides two different keys under <strong>SMTP & API</strong>. Choose either one below:
          </p>

          <div className="bg-white/80 border border-sky-200/80 rounded-xl p-3 space-y-1.5 text-xs text-slate-800">
            <div className="font-bold text-sky-900 flex items-center gap-1">
              <span>🌟</span>
              <span>1. REST API Key (xkeysib-...) [RECOMMENDED for Vercel]</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Open <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="underline font-bold text-sky-700">app.brevo.com/settings/keys/api</a> → click the <strong>"API Keys"</strong> tab → click <strong>"Generate a new API key"</strong>.
            </p>
            <p className="text-[11px] text-slate-600">
              Paste the key (starts with <code>xkeysib-</code>) into Password. Delivers over HTTPS Port 443 with <strong>zero socket blocks or timeouts</strong>!
            </p>
          </div>

          <div className="bg-white/80 border border-sky-200/80 rounded-xl p-3 space-y-1.5 text-xs text-slate-800">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <span>🔌</span>
              <span>2. SMTP Relay Key (xsmtpsib-...)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              If copying from the <strong>"SMTP"</strong> tab, you MUST click <strong>"Load Brevo Relay (Port 587)"</strong> above so the host is <code>smtp-relay.brevo.com</code> (not Gmail).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
