import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApplicationByToken } from '@/lib/repos/applicationsRepo';
import { getBranchById } from '@/lib/repos/branchesRepo';
import { getCompanySettings } from '@/lib/settings';
import { LOAN_TYPE_LABELS, formatCurrencyINR } from '@/lib/format';

export default async function ApplicationSuccessPage({ params }: { params: { token: string } }) {
  const application = getApplicationByToken(params.token);
  if (!application) notFound();

  const settings = await getCompanySettings(application.tenantId || 'default');
  const branch = getBranchById(application.branchId);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-center shadow-lg">
        {/* Success Icon */}
        <div
          className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl shadow-md mb-6"
          style={{ backgroundColor: settings.accentColor }}
        >
          ✓
        </div>

        <span
          className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2"
          style={{ backgroundColor: `${settings.accentColor}18`, color: settings.accentColor }}
        >
          Submission Received
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Thank You, {application.fullName?.split(' ')[0] || 'Applicant'}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-8">
          Your loan application and documents have been securely uploaded to{' '}
          <strong>{settings.companyName}</strong>. A confirmation email has been sent to your registered address.
        </p>

        {/* Application Summary Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left text-xs space-y-3 mb-8">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-slate-400">Application Reference</span>
            <span className="font-mono font-bold text-slate-800">{application.token}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Loan Product</span>
            <span className="font-semibold text-slate-800">
              {application.loanType ? LOAN_TYPE_LABELS[application.loanType] : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Amount Requested</span>
            <span className="font-bold text-slate-900 text-sm">
              {application.loanAmount ? formatCurrencyINR(application.loanAmount) : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Assigned Advisor</span>
            <span className="font-semibold text-slate-800">{application.channelPartnerName || application.createdByName || 'Direct'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Assigned Branch</span>
            <span className="font-semibold text-slate-800">{branch?.name || 'Head Office'}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-slate-400">Current Status</span>
            <span
              className="px-2.5 py-0.5 rounded-full font-bold text-[11px]"
              style={{ backgroundColor: `${settings.accentColor}18`, color: settings.accentColor }}
            >
              Document Received & Under Review
            </span>
          </div>
        </div>

        {/* What Happens Next Steps */}
        <div className="text-left mb-8">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Next Steps in the Process:</h3>
          <ol className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                1
              </span>
              <span>Our operations team will verify your uploaded PAN, Aadhaar, salary slips, and bank statements.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                2
              </span>
              <span>Your file is submitted to partner banks offering the lowest interest rates for your profile.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <span>Upon bank sanction, our relationship manager will coordinate loan agreement signing & disbursement.</span>
            </li>
          </ol>
        </div>

        {branch?.phone && (
          <p className="text-xs text-slate-500 mb-6">
            For urgent queries, call your branch advisor at{' '}
            <a href={`tel:${branch.phone}`} className="font-semibold text-blue-600 hover:underline">
              {branch.phone}
            </a>
          </p>
        )}

        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
          {settings.footerText}
        </div>
      </div>
    </div>
  );
}
