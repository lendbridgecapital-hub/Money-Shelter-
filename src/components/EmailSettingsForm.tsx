'use client';

import React, { useState, useTransition } from 'react';
import type { CompanySettings } from '@/types/db';
import { updateSmtpSettings, sendTestEmail } from '@/actions/settingsActions';

export default function EmailSettingsForm({ settings }: { settings: CompanySettings }) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState(settings.officialEmail || '');
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setTestResult(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateSmtpSettings(formData);
      if (res.ok) {
        setMessage(res.message || 'Email settings saved successfully.');
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

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-800 mb-1">SMTP Host / Server</label>
              <input
                type="text"
                name="smtpHost"
                defaultValue={settings.smtpHost || ''}
                placeholder="smtp.gmail.com or smtp.sendgrid.net"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">Port</label>
              <input
                type="number"
                name="smtpPort"
                defaultValue={settings.smtpPort || 587}
                placeholder="587"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">SMTP Username / Email</label>
              <input
                type="text"
                name="smtpUser"
                defaultValue={settings.smtpUser || ''}
                placeholder="apikey or notifications@domain.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">SMTP Password / API Key</label>
              <input
                type="password"
                name="smtpPassword"
                placeholder={settings.smtpPassword ? '•••••••••••• (leave blank to keep)' : 'Enter SMTP password'}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Sender "From" Name</label>
            <input
              type="text"
              name="smtpFromName"
              defaultValue={settings.smtpFromName || `${settings.companyName} Notifications`}
              placeholder="e.g. LendBridge Capital Alerts"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="smtpSecure"
              name="smtpSecure"
              defaultChecked={settings.smtpSecure}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="smtpSecure" className="text-sm font-medium text-slate-700">
              Use SSL/TLS (usually checked for port 465, leave unchecked for 587 STARTTLS)
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {isPending ? 'Saving Settings…' : 'Save Email Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Test Email Section */}
      <div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Send Test Email</h3>
          <p className="text-xs text-slate-500 mb-4">
            Verify your SMTP connection works before sharing links with customers.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Send test email to:</label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={isTesting || !testEmailAddress}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 py-2 px-4 rounded-lg text-xs font-semibold transition-colors"
            >
              {isTesting ? 'Sending Test Email…' : 'Send Test Email Now'}
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
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
