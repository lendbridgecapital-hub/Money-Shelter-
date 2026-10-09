'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User, RewardLedgerEntry, RewardRedemption, PartnerWalletSummary, Commission, LoanApplication } from '@/types/db';
import { formatCurrencyINR, formatDate } from '@/lib/format';
import {
  submitRedemptionRequestAction,
  approveRedemptionAction,
  rejectRedemptionAction,
} from '@/actions/rewardActions';

interface RewardManagerProps {
  currentUser: User;
  walletSummary: PartnerWalletSummary;
  ledgerEntries: RewardLedgerEntry[];
  redemptions: RewardRedemption[];
  partners?: User[];
  commissions?: Commission[];
  applications?: LoanApplication[];
}

export default function RewardManager({
  currentUser,
  walletSummary,
  ledgerEntries,
  redemptions,
  partners = [],
  commissions = [],
  applications = [],
}: RewardManagerProps) {
  const router = useRouter();
  const isAdmin = currentUser.role === 'ADMIN';
  const isOps = currentUser.role === 'OPERATIONS';
  const isSupport = currentUser.role === 'CENTRAL_SUPPORT';
  const isSubDsa = currentUser.role === 'SUB_DSA';
  const isChannelPartner = currentUser.role === 'CHANNEL_PARTNER';
  const isPartner = isSubDsa || isChannelPartner;
  const isStaff = isAdmin || isOps || isSupport;

  // Active Tab: 'bank_receivables' | 'history' | 'redeem' | 'admin_bucket'
  const [activeTab, setActiveTab] = useState<'bank_receivables' | 'history' | 'redeem' | 'admin_bucket'>(
    isSubDsa || isChannelPartner
      ? 'bank_receivables'
      : isStaff && redemptions.some((r) => r.status === 'PENDING')
      ? 'admin_bucket'
      : 'bank_receivables'
  );

  // Bank receivables filters & accordion states
  const [bankSearch, setBankSearch] = useState('');
  const [bankStatusFilter, setBankStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');
  const [collapsedBanks, setCollapsedBanks] = useState<Record<string, boolean>>({});

  const toggleBankAccordion = (bName: string) => {
    setCollapsedBanks((prev) => ({ ...prev, [bName]: !prev[bName] }));
  };

  // Search & Filter state for History
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'COMMISSION_EARNING' | 'REDEMPTION'>('ALL');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('ALL');

  // Partner Redemption Form state
  const [redeemPoints, setRedeemPoints] = useState<number | ''>('');
  const [payoutMethod, setPayoutMethod] = useState<'BANK_TRANSFER' | 'UPI'>('BANK_TRANSFER');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [submittingRedeem, setSubmittingRedeem] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Approval / Rejection Modal state
  const [actionModal, setActionModal] = useState<{
    type: 'APPROVE' | 'REJECT';
    redemption: RewardRedemption;
  } | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Quick percent fill for redemption
  function handleQuickPercent(pct: number) {
    if (walletSummary.availableCrp <= 0) return;
    const pts = Math.floor((walletSummary.availableCrp * pct) / 100);
    setRedeemPoints(pts > 0 ? pts : 1);
  }

  // Handle Partner Redemption Submit
  async function handleRedeemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!redeemPoints || Number(redeemPoints) <= 0) {
      setRedeemMessage({ type: 'error', text: 'Please enter a valid CRP points amount.' });
      return;
    }
    if (Number(redeemPoints) > walletSummary.availableCrp) {
      setRedeemMessage({
        type: 'error',
        text: `Cannot redeem more than available balance (${walletSummary.availableCrp.toLocaleString('en-IN')} CRP).`,
      });
      return;
    }
    if (!payoutDetails.trim()) {
      setRedeemMessage({ type: 'error', text: 'Please provide payout account details (Bank account & IFSC or UPI ID).' });
      return;
    }

    setSubmittingRedeem(true);
    setRedeemMessage(null);

    const res = await submitRedemptionRequestAction({
      points: Number(redeemPoints),
      payoutMethod,
      payoutDetails: payoutDetails.trim(),
    });

    setSubmittingRedeem(false);
    if (res.ok) {
      setRedeemMessage({
        type: 'success',
        text: res.message || 'Redemption request submitted successfully! Notification sent to Admin.',
      });
      setRedeemPoints('');
      router.refresh();
    } else {
      setRedeemMessage({ type: 'error', text: res.error || 'Failed to submit request.' });
    }
  }

  // Handle Admin Approve
  async function handleConfirmApprove() {
    if (!actionModal) return;
    setProcessingAction(true);
    setActionError(null);

    const res = await approveRedemptionAction(actionModal.redemption.id, transactionRef, adminNotes);
    setProcessingAction(false);

    if (res.ok) {
      setActionModal(null);
      setTransactionRef('');
      setAdminNotes('');
      router.refresh();
    } else {
      setActionError(res.error || 'Failed to approve request.');
    }
  }

  // Handle Admin Reject
  async function handleConfirmReject() {
    if (!actionModal) return;
    if (!adminNotes.trim()) {
      setActionError('Please enter a rejection reason.');
      return;
    }

    setProcessingAction(true);
    setActionError(null);

    const res = await rejectRedemptionAction(actionModal.redemption.id, adminNotes.trim());
    setProcessingAction(false);

    if (res.ok) {
      setActionModal(null);
      setTransactionRef('');
      setAdminNotes('');
      router.refresh();
    } else {
      setActionError(res.error || 'Failed to reject request.');
    }
  }

  // Filtered Ledger History
  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      if (historyFilter !== 'ALL' && entry.type !== historyFilter) {
        return false;
      }
      if (selectedPartnerId !== 'ALL' && entry.partnerId !== selectedPartnerId) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesCustomer = (entry.customerName || '').toLowerCase().includes(q);
        const matchesMobile = (entry.customerMobile || '').includes(q);
        const matchesPartner = (entry.partnerName || '').toLowerCase().includes(q);
        const matchesDesc = (entry.description || '').toLowerCase().includes(q);
        const matchesApp = (entry.applicationId || '').toLowerCase().includes(q);
        if (!matchesCustomer && !matchesMobile && !matchesPartner && !matchesDesc && !matchesApp) {
          return false;
        }
      }
      return true;
    });
  }, [ledgerEntries, historyFilter, selectedPartnerId, historySearch]);

  // Quick app lookup map
  const appMap = useMemo(() => {
    const map = new Map<string, LoanApplication>();
    for (const app of applications) {
      map.set(app.id, app);
    }
    return map;
  }, [applications]);

  // Consolidate into Bank Receivable Groups
  const { bankGroups, totalReceivableSummary } = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        bankName: string;
        totalDisbursed: number;
        caseMap: Map<
          string,
          {
            id: string;
            applicationId: string;
            token: string;
            customerName: string;
            customerMobile?: string;
            loanType: string;
            bankName: string;
            disbursedAmount: number;
            earningType: 'DIRECT' | 'OVERRIDE' | 'TEAM_AGENT';
            subDsaRate: number;
            subDsaAmount: number;
            partnerRate: number;
            partnerAmount: number;
            partnerName: string;
            myRate: number;
            myAmount: number;
            status: 'PENDING' | 'APPROVED' | 'PAID' | 'CLAWBACK';
            paidAt?: string | null;
            createdAt: string;
          }
        >;
      }
    >();

    function getGroup(bankName: string) {
      const cleanName = bankName?.trim() || 'Partner Lending Bank';
      if (!groupsMap.has(cleanName)) {
        groupsMap.set(cleanName, {
          bankName: cleanName,
          totalDisbursed: 0,
          caseMap: new Map(),
        });
      }
      return groupsMap.get(cleanName)!;
    }

    // 1. Process from commissions table
    for (const comm of commissions) {
      const app = appMap.get(comm.applicationId);
      const bName = comm.bankName || app?.bankName || 'Partner Lending Bank';
      const grp = getGroup(bName);

      const caseKey = comm.applicationId || comm.id;
      let existing = grp.caseMap.get(caseKey);

      if (!existing) {
        existing = {
          id: comm.id,
          applicationId: comm.applicationId,
          token: app?.token || (comm.applicationId ? comm.applicationId.slice(-6).toUpperCase() : 'CASE'),
          customerName: app?.fullName || 'Customer Loan File',
          customerMobile: app?.mobile || undefined,
          loanType: comm.productName || app?.loanType || 'General Loan',
          bankName: bName,
          disbursedAmount: comm.disbursedAmount || app?.disbursedAmount || 0,
          earningType: comm.earningType || 'DIRECT',
          subDsaRate: 0,
          subDsaAmount: 0,
          partnerRate: 0,
          partnerAmount: 0,
          partnerName: comm.sourcePartnerName || comm.channelPartnerName || 'Direct',
          myRate: 0,
          myAmount: 0,
          status: comm.status || 'PENDING',
          paidAt: comm.paidAt,
          createdAt: comm.createdAt,
        };
        grp.caseMap.set(caseKey, existing);
        grp.totalDisbursed += existing.disbursedAmount;
      }

      // Update rates & amounts based on role
      if (isSubDsa) {
        if (comm.channelPartnerId === currentUser.id) {
          if (comm.earningType === 'OVERRIDE') {
            existing.subDsaRate = comm.commissionRate;
            existing.subDsaAmount = comm.commissionAmount;
            existing.earningType = 'OVERRIDE';
            existing.partnerName = comm.sourcePartnerName || 'Downline Partner';
          } else {
            existing.subDsaRate = comm.commissionRate;
            existing.subDsaAmount = comm.commissionAmount;
            existing.earningType = 'DIRECT';
            existing.partnerName = 'You (Direct)';
          }
        } else {
          // Downline Partner's commission
          existing.partnerRate = comm.commissionRate;
          existing.partnerAmount = comm.commissionAmount;
          existing.partnerName = comm.channelPartnerName || 'Downline Partner';
        }
        existing.myAmount = existing.subDsaAmount;
        existing.myRate = existing.subDsaRate;
      } else if (isChannelPartner) {
        if (comm.channelPartnerId === currentUser.id) {
          existing.myRate = comm.commissionRate;
          existing.myAmount = comm.commissionAmount;
          existing.partnerName = 'You (Direct)';
          existing.earningType = 'DIRECT';
        }
      } else {
        // Staff / Admin
        if (comm.earningType === 'OVERRIDE') {
          existing.subDsaAmount = comm.commissionAmount;
          existing.subDsaRate = comm.commissionRate;
        } else {
          existing.partnerAmount = comm.commissionAmount;
          existing.partnerRate = comm.commissionRate;
          existing.partnerName = comm.channelPartnerName || 'Partner';
        }
        existing.myAmount = comm.commissionAmount;
        existing.myRate = comm.commissionRate;
      }

      if (comm.status === 'PAID') {
        existing.status = 'PAID';
      }
    }

    // 2. Also process disbursed applications that might not have a commission row yet
    for (const app of applications) {
      if (app.status !== 'DISBURSED') continue;
      const bName = app.bankName || 'Partner Lending Bank';
      const grp = getGroup(bName);
      if (!grp.caseMap.has(app.id)) {
        const disbAmt = app.disbursedAmount || app.approvedAmount || app.loanAmount || 0;
        const commAmt = app.commissionAmount || Math.round(disbAmt * 0.015);
        const commRate = disbAmt > 0 ? Number(((commAmt / disbAmt) * 100).toFixed(2)) : 1.5;
        const isDirect = app.channelPartnerId === currentUser.id;

        const isTeamApp = isSubDsa && !isDirect;
        const subDsaOverrideRate = isTeamApp ? 0.1 : 0;
        const subDsaOverrideAmt = isTeamApp ? Math.round(disbAmt * 0.001) : 0;

        const item = {
          id: `app_${app.id}`,
          applicationId: app.id,
          token: app.token || app.id.slice(-6).toUpperCase(),
          customerName: app.fullName || 'Customer Loan File',
          customerMobile: app.mobile || undefined,
          loanType: app.loanType || 'General Loan',
          bankName: bName,
          disbursedAmount: disbAmt,
          earningType: (isDirect ? 'DIRECT' : (isTeamApp ? 'OVERRIDE' : 'DIRECT')) as 'DIRECT' | 'OVERRIDE' | 'TEAM_AGENT',
          subDsaRate: isDirect ? commRate : subDsaOverrideRate,
          subDsaAmount: isDirect ? commAmt : subDsaOverrideAmt,
          partnerRate: isTeamApp ? commRate : 0,
          partnerAmount: isTeamApp ? commAmt : 0,
          partnerName: isDirect ? 'You (Direct)' : (app.channelPartnerName || app.createdByName || 'Team Agent'),
          myRate: isSubDsa ? (isDirect ? commRate : subDsaOverrideRate) : (isDirect ? commRate : 0),
          myAmount: isSubDsa ? (isDirect ? commAmt : subDsaOverrideAmt) : (isDirect ? commAmt : 0),
          status: 'PENDING' as const,
          paidAt: null,
          createdAt: app.createdAt,
        };

        // If channel partner and not direct, skip
        if (isChannelPartner && !isDirect) continue;

        grp.caseMap.set(app.id, item);
        grp.totalDisbursed += disbAmt;
      }
    }

    // Aggregate group metrics
    let grandDisbursed = 0;
    let grandMyReceivable = 0;
    let grandDirectReceivable = 0;
    let grandOverrideReceivable = 0;
    let grandPartnerReceivable = 0;
    let grandPaid = 0;
    let grandPending = 0;

    const groupList = Array.from(groupsMap.values())
      .map((grp) => {
        const cases = Array.from(grp.caseMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        let myTotalReceivable = 0;
        let myDirectReceivable = 0;
        let myOverrideReceivable = 0;
        let partnerTotalReceivable = 0;
        let paidAmount = 0;
        let pendingAmount = 0;

        for (const c of cases) {
          myTotalReceivable += c.myAmount;
          if (c.earningType === 'OVERRIDE') {
            myOverrideReceivable += c.myAmount;
          } else {
            myDirectReceivable += c.myAmount;
          }
          partnerTotalReceivable += c.partnerAmount;

          if (c.status === 'PAID') {
            paidAmount += c.myAmount;
          } else {
            pendingAmount += c.myAmount;
          }
        }

        grandDisbursed += grp.totalDisbursed;
        grandMyReceivable += myTotalReceivable;
        grandDirectReceivable += myDirectReceivable;
        grandOverrideReceivable += myOverrideReceivable;
        grandPartnerReceivable += partnerTotalReceivable;
        grandPaid += paidAmount;
        grandPending += pendingAmount;

        return {
          bankName: grp.bankName,
          totalDisbursed: grp.totalDisbursed,
          casesCount: cases.length,
          myTotalReceivable,
          myDirectReceivable,
          myOverrideReceivable,
          partnerTotalReceivable,
          paidAmount,
          pendingAmount,
          cases,
        };
      })
      .sort((a, b) => b.totalDisbursed - a.totalDisbursed);

    return {
      bankGroups: groupList,
      totalReceivableSummary: {
        grandDisbursed,
        grandMyReceivable,
        grandDirectReceivable,
        grandOverrideReceivable,
        grandPartnerReceivable,
        grandPaid,
        grandPending,
      },
    };
  }, [commissions, applications, appMap, isSubDsa, isChannelPartner, currentUser.id]);

  // Filtered bank groups based on bankSearch, bankStatusFilter, selectedBankFilter
  const filteredBankGroups = useMemo(() => {
    return bankGroups
      .filter((grp) => {
        if (selectedBankFilter !== 'ALL' && grp.bankName !== selectedBankFilter) {
          return false;
        }
        return true;
      })
      .map((grp) => {
        const filteredCases = grp.cases.filter((c) => {
          if (bankStatusFilter !== 'ALL' && c.status !== bankStatusFilter) {
            return false;
          }
          if (bankSearch.trim()) {
            const q = bankSearch.toLowerCase();
            const matchesCust = (c.customerName || '').toLowerCase().includes(q);
            const matchesMob = (c.customerMobile || '').includes(q);
            const matchesTok = (c.token || '').toLowerCase().includes(q);
            const matchesPrt = (c.partnerName || '').toLowerCase().includes(q);
            const matchesBnk = (c.bankName || '').toLowerCase().includes(q);
            if (!matchesCust && !matchesMob && !matchesTok && !matchesPrt && !matchesBnk) {
              return false;
            }
          }
          return true;
        });

        return {
          ...grp,
          cases: filteredCases,
        };
      })
      .filter((grp) => {
        if (bankSearch.trim() || bankStatusFilter !== 'ALL') {
          return grp.cases.length > 0;
        }
        return true;
      });
  }, [bankGroups, selectedBankFilter, bankStatusFilter, bankSearch]);

  // Pending Redemptions count for Admin Bucket
  const pendingRedemptionsCount = useMemo(() => {
    return redemptions.filter((r) => r.status === 'PENDING').length;
  }, [redemptions]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0">
      {/* 1. Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center text-lg">
              🪙
            </span>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Credit Reward Point (CRP) Wallet
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black uppercase tracking-wider">
              1 CRP = ₹10
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Automated earning ladder: For every loan commission earned, equivalent CRP points (Commission ÷ 10) are credited to partner wallets. Redeem rewards partially or fully anytime.
          </p>
        </div>

        {/* Quick Balance or Action */}
        <div className="flex items-center gap-2">
          {isPartner && (
            <button
              type="button"
              onClick={() => setActiveTab('redeem')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>🎁</span>
              <span>Redeem Rewards</span>
            </button>
          )}
          {isAdmin && (
            <Link
              href="/admin/banks"
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/15 transition flex items-center gap-1"
            >
              <span>🏦</span>
              <span>Bank Products & Rates</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Wallet Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Available CRP Balance */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Balance</span>
            <span className="text-base">🪙</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">
            {walletSummary.availableCrp.toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-400">CRP</span>
          </p>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Equivalent: <span className="font-bold text-slate-900">{formatCurrencyINR(walletSummary.availableInr)}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>Rate: 1 CRP = ₹10</span>
            <span className="text-emerald-700 font-bold">100% Redeemable</span>
          </div>
        </div>

        {/* Lifetime Earned CRP */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lifetime Earned</span>
            <span className="text-base">📈</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {walletSummary.totalCrpEarned.toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-400">CRP</span>
          </p>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Total Rupee Value: <span className="font-bold text-slate-900">{formatCurrencyINR(walletSummary.totalEarnedInr)}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Formula: Commission ÷ 10
          </div>
        </div>

        {/* Total Redeemed CRP */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Redeemed & Paid</span>
            <span className="text-base">✅</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-700">
            {walletSummary.totalCrpRedeemed.toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-400">CRP</span>
          </p>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Paid to Account: <span className="font-bold text-slate-900">{formatCurrencyINR(walletSummary.totalRedeemedInr)}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Bank & UPI Payouts
          </div>
        </div>

        {/* Pending Redemption Review */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Review</span>
            <span className="text-base">⏳</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600">
            {walletSummary.pendingCrpRedemption.toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-400">CRP</span>
          </p>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Value: <span className="font-bold text-slate-900">{formatCurrencyINR(walletSummary.pendingCrpRedemption * 10)}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Awaiting Admin Payout
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {/* Tab 1: Bank-wise Receivables */}
          <button
            type="button"
            onClick={() => setActiveTab('bank_receivables')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-2 ${
              activeTab === 'bank_receivables'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>
              🏦{' '}
              {isSubDsa
                ? 'Bank-wise Receivables (Self & Partners)'
                : isChannelPartner
                ? 'My Bank Receivables'
                : 'Bank-wise Receivables'}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'bank_receivables'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {bankGroups.length} Banks
            </span>
          </button>

          {/* Tab 2: Reward History */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>📜 CRP Ledger History</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'history'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {ledgerEntries.length}
            </span>
          </button>

          {/* Tab 3: Redeem Reward */}
          <button
            type="button"
            onClick={() => setActiveTab('redeem')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-2 ${
              activeTab === 'redeem'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🎁 Redeem Reward</span>
            {walletSummary.availableCrp > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                {walletSummary.availableCrp.toLocaleString('en-IN')} CRP Available
              </span>
            )}
          </button>

          {/* Tab 4: Admin Redeem Request Bucket */}
          {isStaff && (
            <button
              type="button"
              onClick={() => setActiveTab('admin_bucket')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-2 ${
                activeTab === 'admin_bucket'
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <span>📥 Redeem Request Bucket</span>
              {pendingRedemptionsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs animate-pulse">
                  {pendingRedemptionsCount} New
                </span>
              )}
            </button>
          )}
        </div>

        {/* Currency reminder badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-semibold pr-2">
          <span>Exchange Rule:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">1 CRP = ₹10</span>
        </div>
      </div>

      {/* 4. TAB: Bank-wise Receivables (Point 4) */}
      {activeTab === 'bank_receivables' && (
        <div className="space-y-4">
          {/* Sub-DSA / Partner Headline Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-indigo-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                    {isSubDsa
                      ? 'Sub-DSA Institutional Ledger'
                      : isChannelPartner
                      ? 'Direct Partner Payouts'
                      : 'Lending Bank Payout Engine'}
                  </span>
                  <span className="text-xs text-indigo-300 font-semibold">
                    {isSubDsa
                      ? 'Self Direct Originations & Downline Partner Business'
                      : isChannelPartner
                      ? 'Your Disbursed Loan Receivables Bank-Wise'
                      : 'Bank-Wise Disbursed Volume & Receivables'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-1">
                  {isSubDsa
                    ? 'Bank-Wise Receivables (Direct & Downline Team Overrides)'
                    : isChannelPartner
                    ? 'My Bank-Wise Loan Receivables'
                    : 'Institutional Partner Banks & Receivables'}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isSubDsa
                    ? 'Track your direct closed cases, partner network loan volume, and automated override payouts segregated by lending institution.'
                    : isChannelPartner
                    ? 'Track your approved and disbursed loan commission payouts institution by institution in real time.'
                    : 'Monitor loan disbursement volumes and partner payouts categorized bank by bank.'}
                </p>
              </div>

              {/* Quick totals badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-white/10 rounded-xl p-2.5 border border-white/10">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-300">Net Receivable</p>
                  <p className="text-base sm:text-lg font-black text-emerald-400 leading-tight">
                    {formatCurrencyINR(totalReceivableSummary.grandMyReceivable)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Disbursed */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Volume Disbursed
              </span>
              <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                {formatCurrencyINR(totalReceivableSummary.grandDisbursed)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Across {bankGroups.reduce((acc, g) => acc + g.casesCount, 0)} Disbursed Cases
              </p>
            </div>

            {/* Total Receivable */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {isSubDsa ? 'Your Total Receivable' : 'Your Total Receivable'}
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">
                {formatCurrencyINR(totalReceivableSummary.grandMyReceivable)}
              </p>
              {isSubDsa ? (
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Direct: {formatCurrencyINR(totalReceivableSummary.grandDirectReceivable)} • Override:{' '}
                  {formatCurrencyINR(totalReceivableSummary.grandOverrideReceivable)}
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Direct Sourced Commission
                </p>
              )}
            </div>

            {/* If Sub-DSA: Downline Partner Payouts. Otherwise Paid Out */}
            {isSubDsa ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Team Partner Payouts
                </span>
                <p className="text-lg sm:text-xl font-black text-indigo-700 mt-0.5">
                  {formatCurrencyINR(totalReceivableSummary.grandPartnerReceivable)}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Distributed to Mapped Agents
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Paid Out
                </span>
                <p className="text-lg sm:text-xl font-black text-indigo-700 mt-0.5">
                  {formatCurrencyINR(totalReceivableSummary.grandPaid)}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Transferred to Bank / UPI
                </p>
              </div>
            )}

            {/* Pending Payout */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pending Payout
              </span>
              <p className="text-lg sm:text-xl font-black text-amber-600 mt-0.5">
                {formatCurrencyINR(totalReceivableSummary.grandPending)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                In Processing / Pending Ledger
              </p>
            </div>
          </div>

          {/* Bank Filters & Search Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
              <input
                type="text"
                placeholder={
                  isSubDsa
                    ? 'Search bank, customer name, loan token, or team partner…'
                    : 'Search bank name, customer name, loan token…'
                }
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Bank Select & Status Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Banks ({bankGroups.length})</option>
                {bankGroups.map((g) => (
                  <option key={g.bankName} value={g.bankName}>
                    {g.bankName}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBankStatusFilter('ALL')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    bankStatusFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setBankStatusFilter('PAID')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    bankStatusFilter === 'PAID'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => setBankStatusFilter('PENDING')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    bankStatusFilter === 'PENDING'
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>

          {/* Bank Groups List */}
          {filteredBankGroups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-2xs">
              <span className="text-3xl block mb-2">🏦</span>
              <p className="font-bold text-sm text-slate-800">No bank receivables found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {isSubDsa
                  ? 'As direct and downline team loan cases are disbursed by partner lending banks, institutional breakdown and override receivables will appear here.'
                  : 'As your customer loan applications are disbursed by partner banks, your institution-wise commission receivables will automatically appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBankGroups.map((grp) => {
                const isCollapsed = collapsedBanks[grp.bankName] === true;

                return (
                  <div
                    key={grp.bankName}
                    className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs transition"
                  >
                    {/* Bank Header Accordion Bar */}
                    <div
                      onClick={() => toggleBankAccordion(grp.bankName)}
                      className="p-3.5 sm:p-4 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 select-none transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold flex items-center justify-center text-lg shadow-2xs shrink-0">
                          🏦
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-slate-900 truncate">
                              {grp.bankName}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              {grp.cases.length} {grp.cases.length === 1 ? 'Case' : 'Cases'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Disbursed Volume:{' '}
                            <span className="text-slate-900 font-bold">
                              {formatCurrencyINR(grp.totalDisbursed)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right Side Stats & Accordion Trigger */}
                      <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {isSubDsa ? 'Your Net Payout' : 'Your Net Receivable'}
                          </span>
                          <span className="text-sm sm:text-base font-black text-emerald-700 leading-tight block">
                            {formatCurrencyINR(grp.myTotalReceivable)}
                          </span>
                          {isSubDsa && grp.partnerTotalReceivable > 0 && (
                            <span className="text-[10px] text-indigo-700 font-semibold block">
                              Team Agents: {formatCurrencyINR(grp.partnerTotalReceivable)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                            {isCollapsed ? 'Show Cases ▼' : 'Hide Cases ▲'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Cases Details */}
                    {!isCollapsed && (
                      <div className="p-3 sm:p-4">
                        {/* Mobile Cards View */}
                        <div className="block md:hidden space-y-2.5">
                          {grp.cases.map((c) => (
                            <div
                              key={c.id}
                              className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                                      {c.token}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900">
                                      {c.customerName}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {c.loanType}
                                  </p>
                                </div>
                                <span
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    c.status === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-xs">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                    Disbursed Amount
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {formatCurrencyINR(c.disbursedAmount)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                    Originator
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block ${
                                      c.partnerName === 'You (Direct)'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-indigo-100 text-indigo-800'
                                    }`}
                                  >
                                    {c.partnerName}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                    {isSubDsa ? 'Your Payout (Rate)' : 'Your Receivable'}
                                  </span>
                                  <span className="font-black text-emerald-700">
                                    {formatCurrencyINR(c.myAmount)}{' '}
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      ({c.myRate}%)
                                    </span>
                                  </span>
                                </div>

                                {isSubDsa && c.partnerAmount > 0 && (
                                  <div className="text-right">
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                      Agent Payout
                                    </span>
                                    <span className="font-bold text-indigo-700 text-xs">
                                      {formatCurrencyINR(c.partnerAmount)}{' '}
                                      <span className="text-[10px] font-semibold text-slate-500">
                                        ({c.partnerRate}%)
                                      </span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-100/70 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                                <th className="px-3 py-2.5">Loan File / Customer</th>
                                <th className="px-3 py-2.5">Product</th>
                                <th className="px-3 py-2.5">Disbursed Volume</th>
                                <th className="px-3 py-2.5">Sourced By</th>
                                <th className="px-3 py-2.5">
                                  {isSubDsa ? 'Sub-DSA Receivable' : 'Your Receivable'}
                                </th>
                                {isSubDsa && <th className="px-3 py-2.5">Partner Receivable</th>}
                                <th className="px-3 py-2.5 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {grp.cases.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/60 transition">
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">
                                      {c.token}
                                    </span>
                                    <span className="font-bold text-slate-900">{c.customerName}</span>
                                    {c.customerMobile && (
                                      <span className="text-[10px] text-slate-400 block">
                                        {c.customerMobile}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-600">
                                    {c.loanType}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900">
                                    {formatCurrencyINR(c.disbursedAmount)}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        c.partnerName === 'You (Direct)'
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                      }`}
                                    >
                                      {c.partnerName}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="font-black text-emerald-700">
                                      {formatCurrencyINR(c.myAmount)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold ml-1">
                                      ({c.myRate}%)
                                    </span>
                                  </td>
                                  {isSubDsa && (
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      {c.partnerAmount > 0 ? (
                                        <>
                                          <span className="font-bold text-indigo-700">
                                            {formatCurrencyINR(c.partnerAmount)}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-semibold ml-1">
                                            ({c.partnerRate}%)
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                  )}
                                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                    <span
                                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                        c.status === 'PAID'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {c.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB: Reward History (CRP Ledger with Customer Reference) */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search customer name, mobile, loan file token, or partner…"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setHistoryFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  historyFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Logs ({ledgerEntries.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('COMMISSION_EARNING')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  historyFilter === 'COMMISSION_EARNING' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Earnings (+CRP)
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('REDEMPTION')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  historyFilter === 'REDEMPTION' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Redemptions (-CRP)
              </button>

              {/* Admin Partner Filter */}
              {isAdmin && partners.length > 0 && (
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Partners ({partners.length})</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="px-3.5 py-3 whitespace-nowrap">Date & Time</th>
                  <th className="px-3 py-3 whitespace-nowrap">Customer / Lead</th>
                  <th className="px-3 py-3 whitespace-nowrap">Facility & Disbursed</th>
                  <th className="px-3 py-3 whitespace-nowrap">Commission (₹)</th>
                  <th className="px-3 py-3 whitespace-nowrap">Reward Points (CRP)</th>
                  <th className="px-3 py-3 whitespace-nowrap">Rupee Value</th>
                  {isAdmin && <th className="px-3 py-3 whitespace-nowrap">Partner</th>}
                  <th className="px-3 py-3 whitespace-nowrap">Status</th>
                  <th className="px-3.5 py-3 whitespace-nowrap">Ledger Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-4 py-12 text-center text-slate-400">
                      <div className="text-3xl mb-2">🪙</div>
                      <p className="font-bold text-slate-700">No reward points ledger records found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Whenever a loan case is disbursed, equivalent CRP points (Commission ÷ 10) are automatically credited and logged here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((entry) => {
                    const isCredit = entry.points > 0;
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Date */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-slate-500">
                          {formatDate(entry.createdAt)}
                        </td>

                        {/* Customer Reference */}
                        <td className="px-3 py-3">
                          {entry.customerName ? (
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{entry.customerName}</p>
                              {entry.customerMobile && (
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{entry.customerMobile}</p>
                              )}
                              {entry.applicationId && (
                                <Link
                                  href={`/branch/requests/${entry.applicationId}`}
                                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold block mt-0.5 underline"
                                >
                                  View Case File →
                                </Link>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Direct Wallet Action</span>
                          )}
                        </td>

                        {/* Facility & Disbursed */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {entry.loanType ? (
                            <div>
                              <p className="font-semibold text-slate-800">{entry.loanType.replace(/_/g, ' ')}</p>
                              {entry.disbursedAmount ? (
                                <p className="text-[11px] text-slate-400">
                                  Disbursed: {formatCurrencyINR(entry.disbursedAmount)}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Commission Rupee Amount */}
                        <td className="px-3 py-3 whitespace-nowrap font-bold text-slate-900">
                          {entry.commissionAmount ? formatCurrencyINR(entry.commissionAmount) : '—'}
                        </td>

                        {/* CRP Points */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-xs ${
                              isCredit
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            <span>{isCredit ? '+' : ''}{entry.points.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] font-bold">CRP</span>
                          </span>
                        </td>

                        {/* Rupee Value */}
                        <td className="px-3 py-3 whitespace-nowrap font-bold text-slate-800">
                          {formatCurrencyINR(Math.abs(entry.points) * 10)}
                        </td>

                        {/* Partner (for Admin) */}
                        {isAdmin && (
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{entry.partnerName || 'Partner'}</span>
                          </td>
                        )}

                        {/* Status */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.status === 'CREDITED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : entry.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : entry.status === 'REDEEMED'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>

                        {/* Remark */}
                        <td className="px-3.5 py-3 text-slate-600 text-[11px] max-w-xs truncate" title={entry.description}>
                          {entry.description}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 2: Redeem Reward Points (Partner Redemption Portal) */}
      {activeTab === 'redeem' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Form: Submit Request (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎁</span>
                <h2 className="text-base font-black text-slate-900">Request Reward Redemption</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Redeem your earned Credit Reward Points partially or fully. 1 CRP = ₹10 cash payout into your bank or UPI.
              </p>
            </div>

            {/* Current Balance Notice */}
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">Available to Redeem</p>
                <p className="text-xl font-black text-emerald-700 mt-0.5">
                  {walletSummary.availableCrp.toLocaleString('en-IN')} <span className="text-xs font-semibold">CRP</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500">Rupee Worth</p>
                <p className="text-base font-extrabold text-slate-900">
                  {formatCurrencyINR(walletSummary.availableInr)}
                </p>
              </div>
            </div>

            {redeemMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  redeemMessage.type === 'success'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {redeemMessage.text}
              </div>
            )}

            <form onSubmit={handleRedeemSubmit} className="space-y-3.5">
              {/* CRP Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CRP Points to Redeem *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={walletSummary.availableCrp}
                    step="1"
                    placeholder="e.g. 500"
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={walletSummary.availableCrp <= 0 || submittingRedeem}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-black text-slate-400">CRP</span>
                </div>

                {/* Quick percentage buttons */}
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(25)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(50)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(75)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(100)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-[11px] font-extrabold text-emerald-800 transition"
                  >
                    100% (All)
                  </button>
                </div>

                {/* Real-time conversion callout */}
                {typeof redeemPoints === 'number' && redeemPoints > 0 && (
                  <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="text-slate-600">You will receive:</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {formatCurrencyINR(redeemPoints * 10)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payout Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payout Destination *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK_TRANSFER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      payoutMethod === 'BANK_TRANSFER'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>🏦</span>
                    <span>Bank Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('UPI')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      payoutMethod === 'UPI'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>📱</span>
                    <span>UPI ID</span>
                  </button>
                </div>
              </div>

              {/* Payout Account Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {payoutMethod === 'BANK_TRANSFER'
                    ? 'Bank Account No, Bank Name & IFSC Code *'
                    : 'UPI ID (VPA) *'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    payoutMethod === 'BANK_TRANSFER'
                      ? 'e.g. HDFC Bank, A/C: 501004928172, IFSC: HDFC0001234, Name: Rajesh Sharma'
                      : 'e.g. partner@okaxis or 9822154321@paytm'
                  }
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  disabled={walletSummary.availableCrp <= 0 || submittingRedeem}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={walletSummary.availableCrp <= 0 || submittingRedeem || !redeemPoints}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {submittingRedeem ? (
                  <span>Submitting Request…</span>
                ) : (
                  <>
                    <span>🪙</span>
                    <span>
                      Submit Redeem Request ({typeof redeemPoints === 'number' && redeemPoints > 0 ? formatCurrencyINR(redeemPoints * 10) : '0'})
                    </span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-400 text-center">
                Once submitted, request will appear under Admin Redeem Request Bucket. An in-app and voice notification will confirm status updates.
              </p>
            </form>
          </div>

          {/* Right Table: Past & Active Redemptions (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Your Redemption Requests</h2>
              <span className="text-xs text-slate-500 font-semibold">
                {redemptions.filter((r) => !isPartner || r.partnerId === currentUser.id).length} Total Requests
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Points (CRP)</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Rupees (₹)</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Payout Details</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Txn / UTR Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {redemptions.filter((r) => !isPartner || r.partnerId === currentUser.id).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No redemption requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    redemptions
                      .filter((r) => !isPartner || r.partnerId === currentUser.id)
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">
                            {formatDate(req.createdAt)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-black text-slate-900">
                            {req.points.toLocaleString('en-IN')} CRP
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-bold text-emerald-700">
                            {formatCurrencyINR(req.inrAmount)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate" title={req.payoutDetails}>
                            <span className="font-semibold text-slate-900 mr-1">[{req.payoutMethod}]</span>
                            {req.payoutDetails}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : req.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {req.status === 'APPROVED' ? 'PAID & APPROVED' : req.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-700">
                            {req.transactionRef || req.adminNotes || '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 3: Admin Redeem Request Bucket */}
      {isAdmin && activeTab === 'admin_bucket' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <h2 className="text-base font-black text-slate-900">Partner Redeem Request Bucket</h2>
                {pendingRedemptionsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white">
                    {pendingRedemptionsCount} Action Required
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review partner CRP redemption requests. Approving will mark as paid, confirm CRP deduction, and notify the partner. Rejecting restores the held points.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="px-3.5 py-3 whitespace-nowrap">Date Requested</th>
                  <th className="px-3 py-3 whitespace-nowrap">Partner Name</th>
                  <th className="px-3 py-3 whitespace-nowrap">Points (CRP)</th>
                  <th className="px-3 py-3 whitespace-nowrap">Payout Amount (₹)</th>
                  <th className="px-3 py-3 whitespace-nowrap">Destination & Details</th>
                  <th className="px-3 py-3 whitespace-nowrap">Status</th>
                  <th className="px-3 py-3 whitespace-nowrap">Processed By</th>
                  <th className="px-3.5 py-3 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {redemptions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      No redemption requests in the bucket yet.
                    </td>
                  </tr>
                ) : (
                  redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 whitespace-nowrap text-slate-500">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-bold text-slate-900">{r.partnerName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{r.partnerPhone || r.partnerEmail || r.partnerId}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
                          {r.points.toLocaleString('en-IN')} CRP
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-black text-emerald-700 text-sm">
                        {formatCurrencyINR(r.inrAmount)}
                      </td>
                      <td className="px-3 py-3 max-w-xs">
                        <p className="font-semibold text-slate-900">[{r.payoutMethod}]</p>
                        <p className="text-slate-600 text-[11px] truncate" title={r.payoutDetails}>{r.payoutDetails}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.status === 'APPROVED' ? 'PAID' : r.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[11px] text-slate-500">
                        {r.processedByName ? (
                          <div>
                            <p className="font-semibold text-slate-700">{r.processedByName}</p>
                            {r.transactionRef && <p className="font-mono text-[10px] text-slate-400">Ref: {r.transactionRef}</p>}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        {r.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActionModal({ type: 'APPROVE', redemption: r });
                                setTransactionRef('');
                                setAdminNotes('');
                                setActionError(null);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                            >
                              Approve & Pay
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionModal({ type: 'REJECT', redemption: r });
                                setTransactionRef('');
                                setAdminNotes('');
                                setActionError(null);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 font-bold text-xs rounded-lg border border-rose-200 transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Modal for Admin Approval or Rejection */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {actionModal.type === 'APPROVE' ? 'Approve & Mark Payout Processed' : 'Reject Redemption Request'}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Request Snapshot */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Partner:</span>
                <span className="font-bold text-slate-900">{actionModal.redemption.partnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Points to Redeem:</span>
                <span className="font-black text-slate-900">{actionModal.redemption.points.toLocaleString('en-IN')} CRP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rupee Payout Amount:</span>
                <span className="font-black text-emerald-700 text-sm">{formatCurrencyINR(actionModal.redemption.inrAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-mono text-slate-800 text-[11px] truncate max-w-[220px]">
                  {actionModal.redemption.payoutMethod} - {actionModal.redemption.payoutDetails}
                </span>
              </div>
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {actionError}
              </div>
            )}

            {actionModal.type === 'APPROVE' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank UTR / Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR1928301928 or IMPS-9812938"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Approval Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Disbursed to partner bank account"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Incorrect bank account number or IFSC code mismatch. Please update details and re-submit."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Rejecting will restore {actionModal.redemption.points.toLocaleString('en-IN')} CRP back into the partner's available balance.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              {actionModal.type === 'APPROVE' ? (
                <button
                  type="button"
                  disabled={processingAction}
                  onClick={handleConfirmApprove}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {processingAction ? 'Processing…' : 'Confirm Payout Approval'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={processingAction}
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {processingAction ? 'Rejecting…' : 'Reject & Restore Points'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
