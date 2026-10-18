'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Role, Branch, LoanApplication, RewardLedgerEntry } from '@/types/db';
import { blockPartnerAction } from '@/actions/workflowActions';
import {
  directAdminOnboardPartnerAction,
  approvePartnerAction,
  updatePartnerCommissionRateAction,
} from '@/actions/partnerOnboardingActions';
import { createSiteForBranchAction } from '@/actions/branchActions';
import { formatDate, formatDateTime, LOAN_TYPE_LABELS, STATUS_LABELS, formatCurrencyINR } from '@/lib/format';

interface Props {
  partners: User[];
  branches?: Branch[];
  relationshipManagers?: User[];
  currentUserRole: Role;
  currentUserId?: string;
  userBranchId?: string;
  userBranchName?: string;
  isDedicatedSiteRm?: boolean;
  isBranchOps?: boolean;
  branchSites?: Branch[];
  applications?: LoanApplication[];
  rewardLedger?: RewardLedgerEntry[];
}

export default function PartnerComplianceManager({
  partners,
  branches = [],
  relationshipManagers = [],
  currentUserRole,
  currentUserId,
  userBranchId,
  userBranchName,
  isDedicatedSiteRm = false,
  isBranchOps = false,
  branchSites = [],
  applications = [],
  rewardLedger = [],
}: Props) {
  const router = useRouter();
  const isAdmin = currentUserRole === 'ADMIN';
  const isRM = currentUserRole === 'RELATIONSHIP_MANAGER';
  const isSupport = currentUserRole === 'CENTRAL_SUPPORT';
  const isSubDsa = currentUserRole === 'SUB_DSA';
  const isOps = currentUserRole === 'OPERATIONS';

  // Selection & Modals
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sub-DSA Modal State
  const [showSubDsaModal, setShowSubDsaModal] = useState(false);
  const [copiedSubDsaLink, setCopiedSubDsaLink] = useState(false);
  const [selectedOnboardRole, setSelectedOnboardRole] = useState<'CHANNEL_PARTNER' | 'SUB_DSA'>('CHANNEL_PARTNER');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUB_DSA' | 'CHANNEL_PARTNER' | 'PENDING'>('ALL');

  // Universal Share Modal State
  const [shareConfig, setShareConfig] = useState<{
    title: string;
    subtitle: string;
    roleName: string;
    url: string;
    shareText: string;
    emailSubject: string;
    badge: string;
    icon: string;
    colorTheme: 'emerald' | 'indigo';
  } | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Direct Onboard Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Deduplicated partners list (guarantees zero duplicate partners, sub-dsas, or aliases)
  const cleanPartners = React.useMemo(() => {
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const seenPans = new Set<string>();
    const seenCodes = new Set<string>();
    const seenPhones = new Set<string>();
    return partners.filter((p) => {
      if (p.id === 'usr_tejas_subdsa_alias' || p.email === 'tejas.subdsa@quickfinsure.com') {
        return false;
      }
      const id = (p.id || '').toLowerCase().trim();
      const email = (p.email || '').toLowerCase().trim();
      const pan = (p.panNumber || '').toUpperCase().trim();
      const code = (p.partnerCode || '').toUpperCase().trim();
      const phone = (p.phone || '').replace(/\D/g, '').slice(-10);

      if (id && seenIds.has(id)) return false;
      if (email && seenEmails.has(email)) return false;
      if (pan && pan.length === 10 && seenPans.has(pan)) return false;
      if (code && seenCodes.has(code)) return false;
      if (phone && phone.length === 10 && seenPhones.has(phone)) return false;

      if (id) seenIds.add(id);
      if (email) seenEmails.add(email);
      if (pan && pan.length === 10) seenPans.add(pan);
      if (code) seenCodes.add(code);
      if (phone && phone.length === 10) seenPhones.add(phone);

      return true;
    });
  }, [partners]);

  // Sub-DSA Team Size Map
  const teamSizeMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of cleanPartners) {
      if (p.parentSubDsaId) {
        map.set(p.parentSubDsaId, (map.get(p.parentSubDsaId) || 0) + 1);
      }
    }
    return map;
  }, [cleanPartners]);

  // Onboarding Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [assignedRmId, setAssignedRmId] = useState(isRM && currentUserId ? currentUserId : '');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [password, setPassword] = useState('Quickfin@123');
  const [onboardStatus, setOnboardStatus] = useState<'PENDING_APPROVAL' | 'APPROVED'>('PENDING_APPROVAL');
  const [onboardCommissionRate, setOnboardCommissionRate] = useState<string>('');

  // Set Commission Modal State
  const [editingCommissionPartner, setEditingCommissionPartner] = useState<User | null>(null);
  const [editCommissionInput, setEditCommissionInput] = useState<string>('');
  const [commissionModalLoading, setCommissionModalLoading] = useState(false);
  const [commissionModalError, setCommissionModalError] = useState<string | null>(null);
  const [commissionModalSuccess, setCommissionModalSuccess] = useState<string | null>(null);

  // Add Project / Construction Site Modal State
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteDeveloper, setSiteDeveloper] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [sitePhone, setSitePhone] = useState('');
  const [siteEmail, setSiteEmail] = useState('');
  const [siteDedicatedRmId, setSiteDedicatedRmId] = useState('');
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [siteSuccess, setSiteSuccess] = useState<string | null>(null);
  const [copiedSiteLink, setCopiedSiteLink] = useState<string | null>(null);

  // Agent Activity Inspection Modal State
  const [selectedPartnerForActivity, setSelectedPartnerForActivity] = useState<User | null>(null);
  const [activityTab, setActivityTab] = useState<'APPLICATIONS' | 'REWARDS'>('APPLICATIONS');

  // Active Agent activity metrics
  const activeAgentApps = React.useMemo(() => {
    if (!selectedPartnerForActivity) return [];
    return applications.filter(
      (app) =>
        app.channelPartnerId === selectedPartnerForActivity.id ||
        app.createdById === selectedPartnerForActivity.id
    );
  }, [selectedPartnerForActivity, applications]);

  const activeAgentCrpEntries = React.useMemo(() => {
    if (!selectedPartnerForActivity) return [];
    return rewardLedger.filter((e) => e.partnerId === selectedPartnerForActivity.id);
  }, [selectedPartnerForActivity, rewardLedger]);

  const activeAgentStats = React.useMemo(() => {
    const totalApps = activeAgentApps.length;
    const disbursedApps = activeAgentApps.filter((a) => a.status === 'DISBURSED');
    const disbursedVolume = disbursedApps.reduce((acc, a) => acc + (a.disbursedAmount || a.loanAmount || 0), 0);
    const inProgressApps = activeAgentApps.filter(
      (a) => a.status !== 'DISBURSED' && a.status !== 'REJECTED'
    );
    const approvedApps = activeAgentApps.filter((a) => a.status === 'APPROVED');
    const totalCrpEarned = activeAgentCrpEntries
      .filter((e) => e.type === 'COMMISSION_EARNING' && e.status === 'CREDITED')
      .reduce((acc, e) => acc + e.points, 0);

    const subDsaOverrideInr = isSubDsa ? Math.round(disbursedVolume * 0.001) : 0; // 0.1% override

    return {
      totalApps,
      disbursedCount: disbursedApps.length,
      disbursedVolume,
      inProgressCount: inProgressApps.length,
      approvedCount: approvedApps.length,
      totalCrpEarned,
      subDsaOverrideInr,
    };
  }, [activeAgentApps, activeAgentCrpEntries, isSubDsa]);

  const isSataraUser = Boolean(
    userBranchId === 'br_satara_01' ||
    userBranchName?.toLowerCase().includes('satara') ||
    userBranchName?.toLowerCase().includes('lendbridge') ||
    branches.some(
      (b) =>
        (b.id === userBranchId || b.name === userBranchName) &&
        (b.id === 'br_satara_01' || b.name.toLowerCase().includes('satara') || b.coBrandName?.toLowerCase().includes('lendbridge'))
    )
  );

  // Active target branch for generating onboarding & Sub-DSA share links
  // Defaults strictly to Satara branch (Lendbridge Capital) for Admin, RMs, and Satara users
  const [selectedShareBranchId, setSelectedShareBranchId] = useState<string>(
    isBranchOps && userBranchId ? userBranchId : 'br_satara_01'
  );

  const activeShareBranch =
    branches.find((b) => b.id === selectedShareBranchId) ||
    (isSataraUser ? branches.find((b) => b.id === 'br_satara_01') : null);

  const isSatara = Boolean(
    isSataraUser ||
    selectedShareBranchId === 'br_satara_01' ||
    selectedShareBranchId === 'STR01' ||
    activeShareBranch?.name?.toLowerCase().includes('satara') ||
    activeShareBranch?.coBrandName?.toLowerCase().includes('lendbridge')
  );

  const getOnboardingUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const branchParam = isSatara
      ? '&branchId=br_satara_01'
      : (selectedShareBranchId && selectedShareBranchId !== 'all' ? `&branchId=${encodeURIComponent(selectedShareBranchId)}` : '');

    if (isSatara) {
      if (isSubDsa && currentUserId) {
        return `${origin}/lendbridge/onboard?subDsaId=${currentUserId}`;
      }
      if (isRM && currentUserId) {
        return `${origin}/lendbridge/onboard?rmId=${currentUserId}`;
      }
      return `${origin}/lendbridge/onboard`;
    }

    if (isSubDsa && currentUserId) {
      return `${origin}/partner/onboard?subDsaId=${currentUserId}${branchParam}`;
    }
    if (isRM && currentUserId) {
      return `${origin}/partner/onboard?rmId=${currentUserId}${branchParam}`;
    }
    if (selectedShareBranchId && selectedShareBranchId !== 'all') {
      return `${origin}/partner/onboard?branchId=${encodeURIComponent(selectedShareBranchId)}`;
    }
    return `${origin}/partner/onboard`;
  };

  const getSubDsaOnboardingUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const branchParam = isSatara
      ? '&branchId=br_satara_01'
      : (selectedShareBranchId && selectedShareBranchId !== 'all' ? `&branchId=${encodeURIComponent(selectedShareBranchId)}` : '');

    if (isSatara) {
      if (isRM && currentUserId) {
        return `${origin}/lendbridge/sub-dsa?rmId=${currentUserId}`;
      }
      const refParam = currentUserId ? `?ref=${currentUserId}` : '';
      return `${origin}/lendbridge/sub-dsa${refParam}`;
    }

    if (isRM && currentUserId) {
      return `${origin}/partner/onboard?role=SUB_DSA&rmId=${currentUserId}${branchParam}`;
    }
    const refParam = currentUserId ? `&ref=${currentUserId}` : '';
    if (selectedShareBranchId && selectedShareBranchId !== 'all') {
      return `${origin}/partner/onboard?role=SUB_DSA&branchId=${encodeURIComponent(selectedShareBranchId)}${refParam}`;
    }
    return `${origin}/partner/onboard?role=SUB_DSA${refParam}`;
  };

  const openDirectOnboard = (role: 'CHANNEL_PARTNER' | 'SUB_DSA') => {
    setSelectedOnboardRole(role);
    setOnboardError(null);
    setOnboardSuccess(null);
    if (isBranchOps && userBranchId) {
      setSelectedBranchId(userBranchId);
    }
    setShowOnboardModal(true);
  };

  const copyOnboardingLink = () => {
    const link = getOnboardingUrl();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copySubDsaLink = () => {
    const link = getSubDsaOnboardingUrl();
    navigator.clipboard.writeText(link);
    setCopiedSubDsaLink(true);
    setTimeout(() => setCopiedSubDsaLink(false), 2500);
  };

  const copySiteLoanLink = (siteId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/branch/create-link?siteId=${encodeURIComponent(siteId)}`;
    navigator.clipboard.writeText(link);
    setCopiedSiteLink(`loan_${siteId}`);
    setTimeout(() => setCopiedSiteLink(null), 2500);
  };

  const copySitePartnerLink = (siteId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/partner/onboard?branchId=${encodeURIComponent(siteId)}`;
    navigator.clipboard.writeText(link);
    setCopiedSiteLink(`partner_${siteId}`);
    setTimeout(() => setCopiedSiteLink(null), 2500);
  };

  const shareViaWhatsApp = () => {
    const link = getOnboardingUrl();
    const branchTitle = isSatara ? 'Lendbridge Capital (Satara Branch)' : (userBranchName || 'our branch');
    const text = encodeURIComponent(
      isSatara
        ? `Hello! Join Lendbridge Capital (Satara Branch) as an authorized Channel Partner (Agent). Submit retail and commercial loan files digitally, get rapid bank approvals, and earn top commission slabs on every disbursement. Register directly using our official link: ${link}`
        : isSubDsa
        ? `Hi! Join my agency network at Money Shelter as an authorized Channel Partner (Agent). Submit retail loans digitally, get instant bank approvals, and earn top commission slabs on every disbursement. Register directly using my link: ${link}`
        : isBranchOps
        ? `Hello! Join ${branchTitle} loan distribution network as an authorized Channel Partner. Sourced digital leads, real-time file tracking, and direct bank payouts. Register directly using our branch onboarding link: ${link}`
        : `Hello! Register as an authorized Channel Partner with Money Shelter using my direct onboarding link: ${link}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareSubDsaViaWhatsApp = () => {
    const link = getSubDsaOnboardingUrl();
    const branchTitle = isSatara ? 'Lendbridge Capital (Satara Branch)' : (userBranchName || 'our branch');
    const text = encodeURIComponent(
      isSatara
        ? `Hello! Partner with Lendbridge Capital (Satara Branch) as an authorized Sub-DSA (Master Partner). Recruit channel partners, manage retail loan originations, and earn direct overrides on every disbursement. Register directly using our official branch Sub-DSA link: ${link}`
        : isBranchOps
        ? `Hello! Join ${branchTitle} distribution network as an authorized Sub-DSA (Master Partner) with Money Shelter. Recruit channel partners, manage retail loan originations, and earn direct overrides on every disbursement. Register directly using our branch Sub-DSA link: ${link}`
        : `Hello! We invite you to join Money Shelter as an authorized Sub-DSA. Build your own agent team, earn override commissions on your network's business, and access direct loan disbursements: ${link}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const openShareModal = (type: 'CHANNEL_PARTNER' | 'SUB_DSA') => {
    const branchTitle = isSatara ? 'Lendbridge Capital (Satara Branch)' : (userBranchName || 'our branch');
    if (type === 'CHANNEL_PARTNER') {
      const url = getOnboardingUrl();
      const shareText = isSatara
        ? `Hello! Join Lendbridge Capital (Satara Branch) as an authorized Channel Partner (Agent). Submit retail and commercial loan files digitally, get rapid bank approvals, and earn top commission slabs on every disbursement. Register directly using our official link: ${url}`
        : isSubDsa
        ? `Hi! Join my agency network at Money Shelter as an authorized Channel Partner (Agent). Submit retail loans digitally, get instant bank approvals, and earn top commission slabs on every disbursement. Register directly using my link: ${url}`
        : isBranchOps
        ? `Hello! Join ${branchTitle} loan distribution network as an authorized Channel Partner with Money Shelter. Digital lead sourcing, real-time file tracking, and direct bank payouts. Register directly using our branch onboarding link: ${url}`
        : `Hello! Register as an authorized Channel Partner with Money Shelter using my direct onboarding link: ${url}`;

      setShareConfig({
        title: isSatara
          ? 'Lendbridge Capital — Channel Partner Onboarding'
          : isBranchOps
          ? `${branchTitle} Channel Partner Onboarding`
          : 'Channel Partner Registration',
        subtitle: isSatara
          ? 'Official onboarding link for prospective channel partners and agents under Lendbridge Capital (Satara Branch).'
          : `Official onboarding link for prospective channel partners and agents under ${branchTitle}.`,
        roleName: 'Channel Partner (Agent)',
        url,
        shareText,
        emailSubject: isSatara
          ? 'Invitation: Join Lendbridge Capital (Satara Branch) as an Authorized Channel Partner'
          : `Invitation: Join ${branchTitle} as an Authorized Channel Partner (Money Shelter)`,
        badge: isSatara ? 'Lendbridge Capital • Satara' : isBranchOps ? `Locked to ${branchTitle}` : 'Direct Origination',
        icon: '🤝',
        colorTheme: 'emerald',
      });
    } else {
      const url = getSubDsaOnboardingUrl();
      const shareText = isSatara
        ? `Hello! Partner with Lendbridge Capital (Satara Branch) as an authorized Sub-DSA (Master Partner). Recruit channel partners, manage retail loan originations, and earn direct overrides on every disbursement. Register directly using our official branch Sub-DSA link: ${url}`
        : isBranchOps
        ? `Hello! Join ${branchTitle} distribution network as an authorized Sub-DSA (Master Partner) with Money Shelter. Recruit channel partners, manage retail loan originations, and earn direct overrides on every disbursement. Register directly using our branch Sub-DSA link: ${url}`
        : `Hello! We invite you to join Money Shelter as an authorized Sub-DSA. Build your own agent team, earn override commissions on your network's business, and access direct loan disbursements: ${url}`;

      setShareConfig({
        title: isSatara
          ? 'Lendbridge Capital — Sub-DSA Master Partner Onboarding'
          : isBranchOps
          ? `${branchTitle} Sub-DSA Master Partner Onboarding`
          : 'Sub-DSA Master Partner Registration',
        subtitle: isSatara
          ? 'Share with Master DSAs and agency leaders to build and manage their own partner team under Lendbridge Capital (Satara Branch).'
          : `Share with Master DSAs and agency leaders to build and manage their own partner team under ${branchTitle}.`,
        roleName: 'Sub-DSA (Master Tier Partner)',
        url,
        shareText,
        emailSubject: isSatara
          ? 'Invitation: Appoint as Authorized Sub-DSA Master Partner (Lendbridge Capital - Satara)'
          : `Invitation: Appoint as Authorized Sub-DSA Master Partner (${branchTitle})`,
        badge: isSatara ? 'Lendbridge Capital • Sub-DSA Hub' : '⚡ 0.1% Team Override Engine',
        icon: '🏢',
        colorTheme: 'indigo',
      });
    }
  };

  const copyModalLink = () => {
    if (!shareConfig) return;
    navigator.clipboard.writeText(shareConfig.url);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleDeviceShare = async () => {
    if (!shareConfig) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareConfig.title,
          text: shareConfig.shareText,
          url: shareConfig.url,
        });
      } catch {
        // User cancelled
      }
    } else {
      copyModalLink();
    }
  };

  async function handleCreateSite(e: React.FormEvent) {
    e.preventDefault();
    setSiteError(null);
    setSiteSuccess(null);

    if (!siteName.trim()) {
      return setSiteError('Project / Construction site name is required.');
    }

    setSiteLoading(true);
    const fd = new FormData();
    fd.append('name', siteName.trim());
    if (siteCode.trim()) fd.append('code', siteCode.trim());
    if (siteDeveloper.trim()) fd.append('developerName', siteDeveloper.trim());
    if (siteAddress.trim()) fd.append('address', siteAddress.trim());
    if (sitePhone.trim()) fd.append('phone', sitePhone.trim());
    if (siteEmail.trim()) fd.append('email', siteEmail.trim());
    if (siteDedicatedRmId) fd.append('dedicatedRmId', siteDedicatedRmId);
    if (userBranchId) fd.append('mappedBranchId', userBranchId);

    const res = await createSiteForBranchAction(fd);
    setSiteLoading(false);

    if (res.ok) {
      setSiteSuccess(res.message || 'Project site created successfully!');
      setTimeout(() => {
        setShowAddSiteModal(false);
        setSiteName('');
        setSiteCode('');
        setSiteDeveloper('');
        setSiteAddress('');
        setSitePhone('');
        setSiteEmail('');
        setSiteDedicatedRmId('');
        setSiteSuccess(null);
        router.refresh();
      }, 1200);
    } else {
      setSiteError(res.error || 'Failed to create project site.');
    }
  }

  function openBlockModal(partner: User) {
    setSelectedPartner(partner);
    setBlockReason(partner.blockedReason || '');
    setError(null);
    setShowBlockModal(true);
  }

  async function handleToggleBlock(partner: User, shouldBlock: boolean) {
    setLoading(true);
    setError(null);

    const res = await blockPartnerAction(
      partner.id,
      shouldBlock,
      shouldBlock ? blockReason : undefined
    );

    setLoading(false);
    if (res.ok) {
      setShowBlockModal(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to update partner compliance status.');
    }
  }

  async function handleDirectOnboard(e: React.FormEvent) {
    e.preventDefault();
    setOnboardError(null);
    setOnboardSuccess(null);

    if (!fullName.trim()) return setOnboardError('Full legal name is required.');
    if (!email.trim()) return setOnboardError('Email address is required.');
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) return setOnboardError('Please enter a valid 10-digit mobile number.');
    if (!selectedBranchId) return setOnboardError('Please select an operating branch.');

    setOnboardLoading(true);
    const res = await directAdminOnboardPartnerAction({
      fullName,
      email,
      mobile: cleanMobile,
      password: password || 'Quickfin@123',
      branchId: selectedBranchId,
      assignedRmId: isRM ? currentUserId : assignedRmId || null,
      panNumber: panNumber ? panNumber.toUpperCase() : null,
      aadhaarNumber: aadhaarNumber || null,
      role: selectedOnboardRole,
      partnerStatus: onboardStatus,
      commissionRate: onboardCommissionRate.trim() ? Number(onboardCommissionRate) : null,
    });
    setOnboardLoading(false);

    if (res.ok) {
      setOnboardSuccess(res.message || 'Partner onboarded successfully!');
      setTimeout(() => {
        setShowOnboardModal(false);
        setOnboardSuccess(null);
        setFullName('');
        setEmail('');
        setMobile('');
        setPanNumber('');
        setAadhaarNumber('');
        setOnboardCommissionRate('');
        setOnboardStatus('PENDING_APPROVAL');
        router.refresh();
      }, 1200);
    } else {
      setOnboardError(res.error || 'Failed to onboard partner.');
    }
  }

  function openCommissionModal(partner: User) {
    setEditingCommissionPartner(partner);
    setEditCommissionInput(
      partner.commissionRate !== undefined && partner.commissionRate !== null
        ? String(partner.commissionRate)
        : ''
    );
    setCommissionModalError(null);
    setCommissionModalSuccess(null);
  }

  async function handleSaveCommissionRate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCommissionPartner) return;
    setCommissionModalLoading(true);
    setCommissionModalError(null);
    setCommissionModalSuccess(null);

    const rate = editCommissionInput.trim() ? Number(editCommissionInput) : null;
    if (rate !== null && (isNaN(rate) || rate < 0 || rate > 100)) {
      setCommissionModalError('Please enter a valid commission rate percentage between 0 and 100.');
      setCommissionModalLoading(false);
      return;
    }

    const res = await updatePartnerCommissionRateAction({
      partnerId: editingCommissionPartner.id,
      commissionRate: rate,
    });

    setCommissionModalLoading(false);
    if (res.ok) {
      setCommissionModalSuccess(res.message || 'Commission rate updated successfully!');
      setTimeout(() => {
        setEditingCommissionPartner(null);
        setCommissionModalSuccess(null);
        router.refresh();
      }, 1000);
    } else {
      setCommissionModalError(res.error || 'Failed to update commission rate.');
    }
  }

  async function handleQuickApprove(partner: User) {
    setApprovingId(partner.id);
    const rmIdToAssign = partner.assignedRmId || (isRM && currentUserId ? currentUserId : relationshipManagers[0]?.id || '');
    const res = await approvePartnerAction({
      partnerId: partner.id,
      assignedRmId: rmIdToAssign,
      remark: 'Directly verified & approved by Partner Management.',
    });
    setApprovingId(null);
    if (res.ok) {
      router.refresh();
    } else {
      alert(res.error || 'Could not approve partner.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isSubDsa
              ? `My Team (${cleanPartners.length})`
              : isRM
              ? `My Assigned Channel Partners (${cleanPartners.length})`
              : isBranchOps
              ? `${userBranchName || 'Branch'} Channel Partner Compliance & Network (${cleanPartners.length})`
              : 'Channel Partner Compliance & Network'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSubDsa
              ? 'Directory of channel partner agents in your network. Click any agent name or Activity button to inspect their live loan applications, volume, and override payouts.'
              : isRM
              ? 'Directory of Channel Partners mapped to your RM portfolio. Monitor their performance, codes, and activities.'
              : isBranchOps
              ? `Monitor channel partner originations for ${userBranchName || 'your branch'} and mapped project sites, onboard new partners with instant approval, and manage network compliance.`
              : 'Monitor Channel Partner originations, onboard new partners with instant approval, and manage network compliance.'}
          </p>
        </div>

      </div>

      {/* Active Branch Selector Bar for Partner Links (For Admin, Ops, and RMs) */}
      {!isDedicatedSiteRm && !isSubDsa && !isBranchOps && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center text-sm font-bold">
              🏛️
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Partner Link Brand & Branch Selection:
              </div>
              <div className="text-[11px] text-slate-500">
                Generate and share official partner onboarding links with branch-specific branding.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedShareBranchId('br_satara_01')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                isSatara
                  ? 'bg-amber-600 border-amber-600 text-white shadow-xs ring-2 ring-amber-400/30'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>🏛️ Lendbridge Capital (Satara Branch)</span>
              {isSatara && (
                <span className="bg-amber-700/80 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                  ACTIVE
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                const hqBranch = branches.find((b) => b.id !== 'br_satara_01') || branches[0];
                setSelectedShareBranchId(hqBranch?.id || 'all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                !isSatara
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs ring-2 ring-blue-400/30'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>🏢 Money Shelter (HQ)</span>
              {!isSatara && (
                <span className="bg-blue-700/80 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                  ACTIVE
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Partner & Sub-DSA Onboarding Cards (Unified self-contained cards with zero repeated buttons) */}
      {!isDedicatedSiteRm && (
        <div className={`grid grid-cols-1 ${!isSubDsa ? 'lg:grid-cols-2' : ''} gap-3.5`}>
          {/* 1. Channel Partner Link Card (Emerald / Amber for Satara) */}
          <div className={`bg-gradient-to-br ${isSatara ? 'from-amber-50/70 via-white to-slate-50/50 border-amber-200/90 hover:border-amber-300' : 'from-emerald-50/70 via-white to-slate-50/50 border-emerald-200/90 hover:border-emerald-300'} border rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs transition`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${isSatara ? 'bg-amber-600' : 'bg-emerald-600'} text-white flex items-center justify-center text-lg shrink-0 shadow-xs`}>
                {isSatara ? '🏛️' : '🤝'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {isSubDsa
                      ? 'My Agent Referral & Onboarding Link'
                      : isSatara
                      ? 'Lendbridge Capital (Satara) Channel Partner Link'
                      : isRM
                      ? 'Channel Partner Onboarding Link'
                      : isBranchOps
                      ? `${userBranchName || 'Branch'} Channel Partner Link`
                      : 'Public Partner Registration Link'}
                  </h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isSatara ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'}`}>
                    {isSatara
                      ? '🏛️ Lendbridge Capital (Satara)'
                      : isSubDsa
                      ? 'Agent Network'
                      : isBranchOps
                      ? `Locked to ${userBranchName || 'Branch'}`
                      : 'Direct Origination'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {isSubDsa
                    ? 'Share with prospective agents. Any partner registering through this link will map automatically under your Sub-DSA network.'
                    : isSatara
                    ? 'Share with prospective partners in Satara. Onboarded agents register with Lendbridge Capital co-branding and auto-map to Satara branch.'
                    : isRM
                    ? 'Share with prospective partners to auto-assign directly to your RM portfolio.'
                    : isBranchOps
                    ? `Share with prospective channel partners. Any partner registering through this link will be mapped strictly under ${userBranchName || 'your branch'}.`
                    : 'Share with prospective partners to submit KYC, agree to terms, and register online.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
              <button
                type="button"
                onClick={copyOnboardingLink}
                className={`px-3 py-1.5 ${isSatara ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1 cursor-pointer`}
              >
                <span>{copiedLink ? '✓ Copied' : isSatara ? '📋 Copy Lendbridge Link' : isBranchOps ? '📋 Copy Partner Link' : (isRM || isSubDsa) ? '📋 Copy My Link' : '📋 Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => openShareModal('CHANNEL_PARTNER')}
                className={`px-2.5 py-1.5 ${isSatara ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'} border text-xs font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer`}
                title="Share link via WhatsApp, Email, SMS, Telegram, Apps or QR Code"
              >
                <span>📤 Share Link</span>
              </button>
              <a
                href={getOnboardingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Preview</span>
                <span>↗</span>
              </a>
              {(isRM || isSubDsa || isBranchOps || isSatara) && (
                <button
                  type="button"
                  onClick={shareViaWhatsApp}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>WhatsApp</span>
                </button>
              )}
              {(isAdmin || isBranchOps || isRM) && (
                <button
                  type="button"
                  onClick={() => openDirectOnboard('CHANNEL_PARTNER')}
                  className="ml-auto px-2.5 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>➕ Instant Onboard</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Sub-DSA Onboarding Link Card (Indigo / Amber for Satara) - For Branch Ops, Admin, and RM */}
          {!isSubDsa && (
            <div className={`bg-gradient-to-br ${isSatara ? 'from-amber-50/70 via-white to-indigo-50/30 border-indigo-200/90 hover:border-indigo-300' : 'from-indigo-50/70 via-white to-slate-50/50 border-indigo-200/90 hover:border-indigo-300'} border rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs transition`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${isSatara ? 'bg-gradient-to-br from-amber-600 to-indigo-700' : 'bg-indigo-600'} text-white flex items-center justify-center text-lg shrink-0 shadow-xs`}>
                  🏢
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      {isSatara
                        ? 'Lendbridge Capital (Satara) Sub-DSA Master Partner Link'
                        : isBranchOps
                        ? `${userBranchName || 'Branch'} Sub-DSA Onboarding Link`
                        : isRM
                        ? 'Sub-DSA Master Onboarding Link'
                        : 'Sub-DSA Master Partner Link'}
                    </h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isSatara ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-indigo-100 text-indigo-800'}`}>
                      {isSatara ? '🏛️ Lendbridge Capital Sub-DSA' : '⚡ 0.1% Team Override Engine'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {isSatara
                      ? 'Share with agency leaders & master brokers in Satara to recruit their own agent networks with Lendbridge Capital branding and override payouts.'
                      : isBranchOps
                      ? `Share with Master DSAs & agencies to recruit their own agent networks mapped under ${userBranchName || 'your branch'} with override payouts.`
                      : 'Share with agency leaders to recruit and build their own sub-agent network with override commissions.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-2 border-t border-indigo-100/80 flex-wrap">
                <button
                  type="button"
                  onClick={copySubDsaLink}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{copiedSubDsaLink ? '✓ Copied' : '📋 Copy Sub-DSA Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openShareModal('SUB_DSA')}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                  title="Share link via WhatsApp, Email, SMS, Telegram, Apps or QR Code"
                >
                  <span>📤 Share Link</span>
                </button>
                <a
                  href={getSubDsaOnboardingUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Preview</span>
                  <span>↗</span>
                </a>
                {(isRM || isBranchOps) && (
                  <button
                    type="button"
                    onClick={shareSubDsaViaWhatsApp}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>WhatsApp</span>
                  </button>
                )}
                {(isAdmin || isBranchOps || isRM) && (
                  <button
                    type="button"
                    onClick={() => openDirectOnboard('SUB_DSA')}
                    className="ml-auto px-2.5 py-1.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-800 text-xs font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>🏢 Appoint Sub-DSA</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branch Mapped Project & Construction Sites Section */}
      {(isBranchOps || (branchSites && branchSites.length > 0)) && (
        <div className="bg-white border border-amber-200/90 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🏗️</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {userBranchName || 'Branch'} Mapped Project & Construction Sites ({branchSites.length})
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Direct Site Tracking
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Direct company construction sites mapped under this branch. Share dedicated site links for customer loan applications and partner onboarding.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSiteError(null);
                setSiteSuccess(null);
                setShowAddSiteModal(true);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>+ Add Project Site</span>
            </button>
          </div>

          {branchSites.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <p className="font-semibold text-slate-600">No construction project sites added yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click &quot;+ Add Project Site&quot; to register a builder project site under {userBranchName || 'your branch'}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {branchSites.map((site) => (
                <div
                  key={site.id}
                  className="p-3 bg-gradient-to-br from-amber-50/30 to-white border border-slate-200 rounded-xl flex flex-col justify-between gap-2 hover:border-amber-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{site.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                          {site.code}
                        </span>
                      </div>
                      {site.developerName && (
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          Developer: <span className="text-slate-700">{site.developerName}</span>
                        </p>
                      )}
                      {site.dedicatedRmName && (
                        <p className="text-[11px] text-slate-500">
                          Dedicated RM: <span className="text-slate-700">{site.dedicatedRmName}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Active Site
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    <button
                      type="button"
                      onClick={() => copySiteLoanLink(site.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{copiedSiteLink === `loan_${site.id}` ? '✓ Copied Loan Link' : '📋 Loan Link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copySitePartnerLink(site.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{copiedSiteLink === `partner_${site.id}` ? '✓ Copied Partner Link' : '📋 Partner Onboard Link'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'ALL', label: `All Network Partners (${cleanPartners.length})` },
          { id: 'SUB_DSA', label: `Sub-DSAs (${cleanPartners.filter((p) => p.role === 'SUB_DSA').length})` },
          { id: 'CHANNEL_PARTNER', label: `Channel Partners (${cleanPartners.filter((p) => p.role === 'CHANNEL_PARTNER').length})` },
          { id: 'PENDING', label: `Pending KYC (${cleanPartners.filter((p) => p.partnerStatus === 'PENDING_APPROVAL').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setRoleFilter(tab.id as any)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              roleFilter === tab.id
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Partners Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                <th className="px-4 py-3">Partner / Organization</th>
                <th className="px-4 py-3">Branch / Assigned RM</th>
                <th className="px-4 py-3">Phone / Contact</th>
                <th className="px-4 py-3">Commission Slab</th>
                <th className="px-4 py-3">Approval & Compliance</th>
                <th className="px-4 py-3">Registered</th>
                {(isAdmin || isSupport) && <th className="px-4 py-3 text-right">Actions</th>}
                {isSubDsa && <th className="px-4 py-3 text-right">Connect</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cleanPartners.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin || isSupport || isSubDsa ? 7 : 6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    {isSubDsa
                      ? "You haven't appointed any agents yet. Share your Agent Referral Link above to recruit your first partner!"
                      : "No Channel Partners registered yet. Click \u201C\u2795 Onboard New Partner\u201D above to add your first partner."}
                  </td>
                </tr>
              ) : (
                cleanPartners
                  .filter((p) => {
                    if (roleFilter === 'SUB_DSA') return p.role === 'SUB_DSA';
                    if (roleFilter === 'CHANNEL_PARTNER') return p.role === 'CHANNEL_PARTNER';
                    if (roleFilter === 'PENDING') return p.partnerStatus === 'PENDING_APPROVAL';
                    return true;
                  })
                  .map((p) => {
                    const isBlocked = Boolean(p.isBlocked);
                    const status = p.partnerStatus || 'APPROVED';
                    const isPending = status === 'PENDING_APPROVAL';
                    const isPartnerSubDsa = p.role === 'SUB_DSA';
                    const teamCount = teamSizeMap.get(p.id) || 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPartnerForActivity(p)}
                              className="font-bold text-slate-900 hover:text-emerald-700 text-left transition inline-flex items-center gap-1.5 cursor-pointer hover:underline"
                              title="Click to view live activity & loan cases"
                            >
                              <span>{p.name}</span>
                              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                📊 View Activity
                              </span>
                            </button>
                            {p.partnerCode && (
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                  isPartnerSubDsa
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                                }`}
                              >
                                {p.partnerCode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isPartnerSubDsa
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isPartnerSubDsa ? '🏢 Sub-DSA' : '👤 Channel Partner (Agent)'}
                            </span>
                            {isPartnerSubDsa && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                👥 {teamCount} Mapped Agents
                              </span>
                            )}
                            {p.parentSubDsaName && (
                              <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                Mapped to: 🏢 {p.parentSubDsaName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{p.email}</p>
                          {p.panNumber && (
                            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                              PAN: {p.panNumber} • Aadhaar: •••• {p.aadhaarNumber?.slice(-4) || 'Verified'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          <p className="font-medium text-slate-800">
                            {branches.find((b) => b.id === p.branchId)?.name || p.branchName || 'Head Office'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            RM: {p.assignedRmName || 'Not Assigned'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                          {p.phone || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-emerald-700">
                              {p.commissionRate !== undefined && p.commissionRate !== null
                                ? `${p.commissionRate}%`
                                : 'Standard Slab'}
                            </span>
                            {(isAdmin || isSupport) && (
                              <button
                                type="button"
                                onClick={() => openCommissionModal(p)}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded border border-slate-200 transition inline-flex items-center gap-1"
                                title="Set / Edit Partner Commission Percentage"
                              >
                                <span>✏️ Set Rate</span>
                              </button>
                            )}
                          </div>
                        </td>
                      <td className="px-4 py-3.5">
                        {isBlocked ? (
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              BLOCKED / FRAUD
                            </span>
                            {p.blockedReason && (
                              <p className="text-[11px] text-rose-600 max-w-xs mt-0.5 font-medium truncate" title={p.blockedReason}>
                                {p.blockedReason}
                              </p>
                            )}
                          </div>
                        ) : isPending ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              PENDING APPROVAL
                            </span>
                            {(isAdmin || isSupport) && (
                              <button
                                type="button"
                                onClick={() => handleQuickApprove(p)}
                                disabled={approvingId === p.id}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs transition disabled:opacity-50"
                              >
                                {approvingId === p.id ? 'Approving…' : 'Approve Now'}
                              </button>
                            )}
                          </div>
                        ) : status === 'DOCUMENTS_REQUIRED' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                            DOCS REQUIRED
                          </span>
                        ) : status === 'REJECTED' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            REJECTED
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            APPROVED & ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 block">{formatDate(p.createdAt)}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <span>🕒</span>
                          <span>{formatDateTime(p.createdAt).split(',')[1]?.trim() || ''}</span>
                        </span>
                      </td>
                      {(isAdmin || isSupport || isRM) && (
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedPartnerForActivity(p)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition inline-flex items-center gap-1 cursor-pointer"
                              title="View Partner Activity"
                            >
                              <span>📊 Activity</span>
                            </button>
                            {(isAdmin || isSupport) && (
                              isBlocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlock(p, false)}
                                  disabled={loading}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition"
                                >
                                  Unblock
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openBlockModal(p)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition"
                                >
                                  Block
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      )}
                      {isSubDsa && (
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedPartnerForActivity(p)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition inline-flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                              title="Inspect this agent's loan applications, volume & override earnings"
                            >
                              <span>📊 Activity</span>
                            </button>
                            {p.phone && (
                              <a
                                href={`https://api.whatsapp.com/send?phone=91${p.phone.replace(/[^0-9]/g, '').slice(-10)}&text=Hi%20${encodeURIComponent(p.name)},%20checking%20in%20on%20your%20active%20loan%20cases!`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition inline-flex items-center gap-1"
                              >
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct Onboard Channel Partner Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Onboard Channel Partner</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct registration. Partner will be auto-approved and issued an official Partner Code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {onboardError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {onboardError}
              </div>
            )}

            {onboardSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-1.5">
                <span>✓</span>
                <span>{onboardSuccess}</span>
              </div>
            )}

            <form onSubmit={handleDirectOnboard} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Appointment Role & Network Tier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedOnboardRole}
                  onChange={(e) => setSelectedOnboardRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                >
                  <option value="CHANNEL_PARTNER">Channel Partner (Agent) — Direct Origination Tier</option>
                  <option value="SUB_DSA">Sub-DSA (Master Tier) — Team Recruitment & Override Engine</option>
                </select>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {selectedOnboardRole === 'SUB_DSA'
                    ? 'Generates a QFS-SUB-XXXX code. Sub-DSA can recruit agents and earn override commissions.'
                    : 'Generates a QFS-PRT-XXXX code for direct customer sourcing.'}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Partner Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Verma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10-Digit Mobile <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9820011223"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Login ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedBranchId}
                    disabled={isBranchOps}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:bg-slate-100"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned RM
                  </label>
                  {isRM ? (
                    <input
                      type="text"
                      disabled
                      value="Mapped to you (Self)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-medium"
                    />
                  ) : (
                    <select
                      value={assignedRmId}
                      onChange={(e) => setAssignedRmId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">No RM Assigned (Head Office)</option>
                      {relationshipManagers.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name} ({rm.branchName || 'HQ'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN Card (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aadhaar Number (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="12-digit number"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard Commission Rate (%) (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 1.50 (Leave blank for default)"
                      value={onboardCommissionRate}
                      onChange={(e) => setOnboardCommissionRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono pr-7"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Agreed payout percentage for disbursed loan cases.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Onboarding Routing / Approval Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={onboardStatus}
                    onChange={(e) => setOnboardStatus(e.target.value as 'PENDING_APPROVAL' | 'APPROVED')}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="PENDING_APPROVAL">
                      ⏳ Send to Partner Requests / Approval Bucket (Pending Verification)
                    </option>
                    <option value="APPROVED">
                      ⚡ Direct Instant Approval (Active Immediately in Directory)
                    </option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Choose whether this partner lands in review queue or activates directly.
                  </span>
                </div>
              </div>

              <div className={`p-3 rounded-xl text-[11px] border ${
                onboardStatus === 'PENDING_APPROVAL'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
              }`}>
                {onboardStatus === 'PENDING_APPROVAL' ? (
                  <>⏳ <strong>Review Pipeline:</strong> Partner will be registered and placed in the <strong>Partner Onboarding Approvals</strong> bucket. Central Support / Admin can verify KYC and assign an RM before issuing credentials.</>
                ) : (
                  <>⚡ <strong>Instant Setup:</strong> Official Reference Code (e.g. {selectedOnboardRole === 'SUB_DSA' ? 'QFS-SUB-XXXX' : 'QFS-PRT-XXXX'}) is generated immediately. The partner can log in and originate loans right away.</>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5 ${
                    onboardStatus === 'PENDING_APPROVAL'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {onboardLoading
                    ? 'Submitting…'
                    : onboardStatus === 'PENDING_APPROVAL'
                    ? '⏳ Register & Send to Approval Bucket'
                    : '✓ Create & Approve Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Partner Commission Rate Modal */}
      {editingCommissionPartner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                  💰
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Configure Commission Rate</h3>
                  <p className="text-xs text-slate-500">
                    {editingCommissionPartner.name} • {editingCommissionPartner.partnerCode || 'No Code'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCommissionPartner(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {commissionModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {commissionModalError}
              </div>
            )}

            {commissionModalSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
                {commissionModalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveCommissionRate} className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Network Role:</span>
                  <span className="font-bold text-slate-800">
                    {editingCommissionPartner.role === 'SUB_DSA' ? '🏢 Sub-DSA Master Partner' : '👤 Channel Partner'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Operating Branch:</span>
                  <span className="font-semibold text-slate-800">
                    {branches.find((b) => b.id === editingCommissionPartner.branchId)?.name || editingCommissionPartner.branchName || 'Head Office'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Payout Slab:</span>
                  <span className="font-bold text-emerald-700">
                    {editingCommissionPartner.commissionRate !== undefined && editingCommissionPartner.commissionRate !== null
                      ? `${editingCommissionPartner.commissionRate}%`
                      : 'Standard Product Slab (Default)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agreed Commission Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 1.50 (Leave blank to use default bank slab)"
                    value={editCommissionInput}
                    onChange={(e) => setEditCommissionInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {editingCommissionPartner.role === 'SUB_DSA'
                    ? 'Sets the primary commission for direct loans closed by this Sub-DSA. (Override commissions on team downline volume are separately configured in Admin Commission Settings).'
                    : 'Sets the standard commission percentage earned by this Channel Partner for all closed loan files.'}
                </p>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditCommissionInput('')}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Reset to Standard Slab
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCommissionPartner(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={commissionModalLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {commissionModalLoading ? 'Saving…' : '✓ Save Commission'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appoint Sub-DSA Invitation Link Modal */}
      {showSubDsaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                  🏢
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Appoint Sub-DSA (Master Partner)</h3>
                  <p className="text-xs text-slate-500">Automated link-based onboarding for franchise networks.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSubDsaModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                <span>🌟</span>
                <span>Sub-DSA Capabilities & Commission Structure</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                When a broker registers using this link, they are designated as a <strong>Sub-DSA</strong>. They can:
              </p>
              <ul className="text-[11px] space-y-1 text-slate-600 list-disc list-inside">
                <li>Generate agent referral links to recruit their own team of Channel Partners.</li>
                <li>Earn <strong>Override Commissions</strong> (e.g. 0.1% PL) on all loans disbursed by their agents.</li>
                <li>Originate direct customer loans and earn the full standard Partner commission.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Sub-DSA Registration Link
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedShareBranchId('br_satara_01')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                      isSatara
                        ? 'bg-amber-600 border-amber-600 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏛️ Lendbridge (Satara)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const hqBranch = branches.find((b) => b.id !== 'br_satara_01') || branches[0];
                      setSelectedShareBranchId(hqBranch?.id || 'all');
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                      !isSatara
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏢 Money Shelter
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getSubDsaOnboardingUrl()}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
                <button
                  type="button"
                  onClick={copySubDsaLink}
                  className={`px-4 py-2 ${isSatara ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white text-xs font-bold rounded-lg shadow-2xs transition whitespace-nowrap cursor-pointer`}
                >
                  {copiedSubDsaLink ? '✓ Copied' : '📋 Copy Link'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <a
                href={getSubDsaOnboardingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Preview Registration Portal</span>
                <span>↗</span>
              </a>
              <button
                type="button"
                onClick={shareSubDsaViaWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1.5"
              >
                <span>Share via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Partner Modal */}
      {showBlockModal && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-rose-900">Block Channel Partner</h3>
                <p className="text-xs text-slate-500">
                  {selectedPartner.name} ({selectedPartner.email})
                </p>
              </div>
              <button onClick={() => setShowBlockModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Blocking disables link creation, commissions, and origination for this partner immediately.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Compliance Block *
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Coercive bundling, fake documentation, high early default rate…"
                rows={3}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleBlock(selectedPartner, true)}
                disabled={loading || !blockReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {loading ? 'Blocking…' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Activity & Performance Inspection Modal */}
      {selectedPartnerForActivity && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 md:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700 shadow-2xs">
                  {selectedPartnerForActivity.name?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-bold text-slate-900">
                      {selectedPartnerForActivity.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedPartnerForActivity.partnerCode || 'AGENT'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedPartnerForActivity.isBlocked
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : selectedPartnerForActivity.partnerStatus === 'PENDING_APPROVAL'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {selectedPartnerForActivity.isBlocked ? 'BLOCKED' : (selectedPartnerForActivity.partnerStatus || 'ACTIVE')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span>✉ {selectedPartnerForActivity.email}</span>
                    <span>📞 {selectedPartnerForActivity.phone || 'No Phone'}</span>
                    {selectedPartnerForActivity.commissionRate !== undefined && selectedPartnerForActivity.commissionRate !== null && (
                      <span className="text-emerald-700 font-semibold">
                        🏷️ Comm: {selectedPartnerForActivity.commissionRate}%
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedPartnerForActivity.phone && (
                  <a
                    href={`https://wa.me/91${selectedPartnerForActivity.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${selectedPartnerForActivity.name}, checking in on your loan applications with Money Shelter.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                  >
                    <span>💬 WhatsApp</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPartnerForActivity(null)}
                  className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold transition"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Sourced
                </span>
                <span className="text-base font-extrabold text-slate-800">
                  {activeAgentStats.totalApps} <span className="text-xs font-normal text-slate-400">cases</span>
                </span>
                <span className="text-[10px] text-indigo-600 block mt-0.5">
                  {activeAgentStats.inProgressCount} in-progress
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Disbursed Volume
                </span>
                <span className="text-base font-extrabold text-emerald-700">
                  ₹{activeAgentStats.disbursedVolume.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  {activeAgentStats.disbursedCount} disbursed
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Agent CRP Earned
                </span>
                <span className="text-base font-extrabold text-amber-600">
                  {activeAgentStats.totalCrpEarned} <span className="text-xs font-bold text-amber-500">CRP</span>
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5">
                  ≈ ₹{(activeAgentStats.totalCrpEarned * 10).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Sub-DSA Override
                </span>
                <span className="text-base font-extrabold text-indigo-700">
                  ₹{activeAgentStats.subDsaOverrideInr.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  0.10% on disbursed vol
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActivityTab('APPLICATIONS')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                  activityTab === 'APPLICATIONS'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📋 Loan Applications</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-semibold">
                  {activeAgentApps.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('REWARDS')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                  activityTab === 'REWARDS'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>🪙 Reward & CRP Ledger</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-semibold">
                  {activeAgentCrpEntries.length}
                </span>
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto flex-1 min-h-[220px] max-h-[420px] pr-1">
              {activityTab === 'APPLICATIONS' && (
                <div>
                  {activeAgentApps.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <div className="text-3xl mb-2">📂</div>
                      <p className="text-xs font-bold text-slate-700">No Loan Applications Logged Yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        When this agent sources loans or submits borrower cases, their live pipeline will show here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                      <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          <tr>
                            <th className="px-3 py-2.5">Ref / App ID</th>
                            <th className="px-3 py-2.5">Customer / Borrower</th>
                            <th className="px-3 py-2.5">Product</th>
                            <th className="px-3 py-2.5">Amount</th>
                            <th className="px-3 py-2.5">Preferred Bank</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {activeAgentApps.map((app) => (
                            <tr key={app.id} className="hover:bg-slate-50/70 transition">
                              <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-900">
                                {app.id.slice(0, 10)}…
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-semibold text-slate-900">{app.fullName || 'Borrower'}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{app.mobile || '—'}</div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                  {app.loanType ? (LOAN_TYPE_LABELS[app.loanType] || app.loanType) : 'Loan'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-bold text-slate-900">
                                ₹{(app.disbursedAmount || app.loanAmount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 text-[11px]">
                                {app.bankName || '—'}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  app.status === 'DISBURSED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : app.status === 'APPROVED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : app.status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {STATUS_LABELS[app.status] || app.status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-slate-400 whitespace-nowrap">
                                {new Date(app.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activityTab === 'REWARDS' && (
                <div>
                  {activeAgentCrpEntries.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <div className="text-3xl mb-2">🪙</div>
                      <p className="text-xs font-bold text-slate-700">No Reward Points Logged Yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Disbursed loans generate CRP (1 CRP = ₹10) which will appear here with customer references.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                      <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          <tr>
                            <th className="px-3 py-2.5">Entry Type</th>
                            <th className="px-3 py-2.5">Customer / Ref</th>
                            <th className="px-3 py-2.5">CRP Points</th>
                            <th className="px-3 py-2.5">Cash Equiv.</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {activeAgentCrpEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50/70 transition">
                              <td className="px-3 py-2.5">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  entry.type === 'COMMISSION_EARNING'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {entry.type === 'COMMISSION_EARNING' ? 'Earning' : 'Redemption'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-semibold text-slate-900">{entry.customerName || 'Direct'}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {entry.applicationId ? `Ref #${entry.applicationId.slice(0, 8)}` : entry.description || '—'}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-extrabold text-amber-600">
                                {entry.points > 0 ? `+${entry.points}` : entry.points} CRP
                              </td>
                              <td className="px-3 py-2.5 font-bold text-slate-800">
                                ₹{(Math.abs(entry.points) * 10).toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {entry.status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-slate-400 whitespace-nowrap">
                                {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPartnerForActivity(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Close Activity Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PROJECT / CONSTRUCTION SITE ================= */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏗️</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add Direct Project / Construction Site</h3>
                  <p className="text-[11px] text-slate-500">
                    Mapped under {userBranchName || 'operating branch'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSiteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {siteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                ⚠️ {siteError}
              </div>
            )}

            {siteSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
                ✓ {siteSuccess}
              </div>
            )}

            <form onSubmit={handleCreateSite} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project / Construction Site Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Godrej Rivergreens Phase 2 / Satara Heights Tower A"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SAT-SITE-01"
                    value={siteCode}
                    onChange={(e) => setSiteCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Leave blank to auto-generate</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Developer / Builder Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Godrej Properties"
                    value={siteDeveloper}
                    onChange={(e) => setSiteDeveloper(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site Location / Physical Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Survey No, Near Landmark, Sector / Taluka, City"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={sitePhone}
                    onChange={(e) => setSitePhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dedicated Site RM (Optional)
                  </label>
                  <select
                    value={siteDedicatedRmId}
                    onChange={(e) => setSiteDedicatedRmId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">No dedicated RM (Branch Pool)</option>
                    {relationshipManagers.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} ({rm.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-slate-700">
                  <span>🏢 Parent Operating Branch:</span>
                  <span className="text-amber-800 font-bold">{userBranchName || 'Branch'}</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  This site will automatically inherit branch co-branding and will be strictly manageable by {userBranchName || 'your branch'} and Pune HQ.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={siteLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {siteLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Site...</span>
                    </>
                  ) : (
                    <span>Create Construction Site</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Share Onboarding Link Modal */}
      {shareConfig && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl text-white flex items-center justify-center text-xl font-bold shadow-xs ${
                    shareConfig.colorTheme === 'emerald' ? 'bg-emerald-600' : 'bg-indigo-600'
                  }`}
                >
                  {shareConfig.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">{shareConfig.title}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        shareConfig.colorTheme === 'emerald'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {shareConfig.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{shareConfig.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareConfig(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Direct URL with Copy Button */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Official Registration URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareConfig.url}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={copyModalLink}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg shadow-2xs transition whitespace-nowrap text-white cursor-pointer ${
                    shareConfig.colorTheme === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {copiedShareLink ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Quick Share Grid */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Share Across Channels
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareConfig.shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-xl flex flex-col items-center justify-center gap-1 text-center transition cursor-pointer"
                >
                  <span className="text-lg">📲</span>
                  <span className="text-[11px] font-bold">WhatsApp</span>
                </a>

                {/* Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(shareConfig.emailSubject)}&body=${encodeURIComponent(shareConfig.shareText)}`}
                  className="p-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 rounded-xl flex flex-col items-center justify-center gap-1 text-center transition cursor-pointer"
                >
                  <span className="text-lg">✉️</span>
                  <span className="text-[11px] font-bold">Email</span>
                </a>

                {/* SMS */}
                <a
                  href={`sms:?body=${encodeURIComponent(shareConfig.shareText)}`}
                  className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl flex flex-col items-center justify-center gap-1 text-center transition cursor-pointer"
                >
                  <span className="text-lg">💬</span>
                  <span className="text-[11px] font-bold">SMS</span>
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareConfig.url)}&text=${encodeURIComponent(shareConfig.shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-xl flex flex-col items-center justify-center gap-1 text-center transition cursor-pointer"
                >
                  <span className="text-lg">✈️</span>
                  <span className="text-[11px] font-bold">Telegram</span>
                </a>
              </div>
            </div>

            {/* Device Share Button (if supported) & QR Code Preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(shareConfig.url)}`}
                  alt="Onboarding QR Code"
                  className="w-16 h-16 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Scan QR to Register</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Display at branch reception counter or download for flyers.
                  </p>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareConfig.url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download="partner-onboarding-qr.png"
                    className="text-[10px] font-bold text-emerald-700 hover:underline mt-1 inline-block"
                  >
                    📥 Download High-Res QR
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDeviceShare}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>📱</span>
                <span>Device Share</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
