import { listAllApplications, listApplicationsForRm, listApplicationsByPartner } from '@/lib/repos/applicationsRepo';
import { listBranchesWithCounts, listBranches } from '@/lib/repos/branchesRepo';
import { listUsers, listPartners, listRelationshipManagers } from '@/lib/repos/usersRepo';
import { listCommissions } from '@/lib/repos/commissionsRepo';
import { LOAN_TYPE_LABELS } from '@/lib/format';
import type { LoanApplication, User, LoanType } from '@/types/db';

export interface OverallOrgMetrics {
  totalLeads: number;
  totalRequestedAmount: number;
  totalSanctionedAmount: number;
  totalDisbursedAmount: number;
  totalDisbursedCases: number;
  approvalRate: number;
  disbursementRate: number;
  totalCommissionsAccrued: number;
  totalCommissionsPaid: number;
  totalCommissionsPending: number;
  totalPartnersCount: number;
  activePartnersCount: number;
  pendingPartnersCount: number;
  totalRmsCount: number;
  totalBranchesCount: number;
}

export interface BranchPerformanceRow {
  branchId: string;
  branchName: string;
  branchCode: string;
  totalCases: number;
  disbursedCases: number;
  disbursedVolume: number;
  commissionAmount: number;
  conversionRate: number;
  userCount: number;
}

export interface RmPerformanceRow {
  rmId: string;
  rmName: string;
  rmEmail: string;
  rmPhone: string;
  branchName: string;
  assignedPartnersCount: number;
  totalCases: number;
  disbursedCases: number;
  disbursedVolume: number;
  conversionRate: number;
}

export interface PartnerPerformanceRow {
  partnerId: string;
  partnerName: string;
  partnerCode: string;
  phone: string;
  email: string;
  branchName: string;
  assignedRmName: string;
  status: string;
  commissionRate: number;
  totalCases: number;
  disbursedCases: number;
  disbursedVolume: number;
  earnedCommissions: number;
}

export interface BankDistributionRow {
  bankName: string;
  casesSent: number;
  casesApproved: number;
  casesDisbursed: number;
  disbursedVolume: number;
  sharePercentage: number;
}

export interface LoanTypeDistributionRow {
  loanType: string;
  label: string;
  casesCount: number;
  disbursedVolume: number;
}

export interface OrganisationReportData {
  metrics: OverallOrgMetrics;
  branches: BranchPerformanceRow[];
  rms: RmPerformanceRow[];
  partners: PartnerPerformanceRow[];
  banks: BankDistributionRow[];
  loanTypes: LoanTypeDistributionRow[];
}

export interface RmTerritoryReportData {
  rmName: string;
  assignedPartnersCount: number;
  totalLeads: number;
  disbursedCases: number;
  disbursedVolume: number;
  conversionRate: number;
  totalPartnerCommissions: number;
  partners: PartnerPerformanceRow[];
}

export interface SupportOperationalReportData {
  totalPartners: number;
  pendingPartnerRequests: number;
  docsRequiredPartners: number;
  approvedPartners: number;
  rmAssignmentCoverage: number;
  unassignedPartnersCount: number;
  totalOrgCases: number;
  casesSentToBank: number;
  casesDocumentsIn: number;
  casesDocumentsRequired: number;
  partnerQueue: {
    id: string;
    name: string;
    phone: string;
    partnerStatus: string;
    assignedRmName: string;
    createdAt: string;
  }[];
  branchOperations: {
    branchName: string;
    branchCode: string;
    activeCases: number;
    pendingDocs: number;
  }[];
}

export interface PartnerPersonalReportData {
  partnerName: string;
  partnerCode: string;
  commissionRate: number;
  assignedRmName: string;
  partnerStatus: string;
  totalLeads: number;
  approvedCases: number;
  disbursedCases: number;
  disbursedVolume: number;
  earnedCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  conversionRate: number;
}

/**
 * 1. Generate Comprehensive Organisation-Wide Report (for ADMIN)
 */
export function getOrganisationReport(tenantId = 'default'): OrganisationReportData {
  const allApps = listAllApplications(tenantId);
  const branches = listBranchesWithCounts(tenantId);
  const allUsers = listUsers(tenantId);
  const allCommissions = listCommissions(tenantId);
  const rms = listRelationshipManagers(tenantId);
  const partners = listPartners(tenantId);

  // Map branches for fast lookup
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  // Metrics computation
  const totalLeads = allApps.length;
  let totalRequestedAmount = 0;
  let totalSanctionedAmount = 0;
  let totalDisbursedAmount = 0;
  let totalDisbursedCases = 0;
  let totalApprovedCases = 0;

  for (const app of allApps) {
    if (app.loanAmount) totalRequestedAmount += app.loanAmount;
    if (app.approvedAmount) totalSanctionedAmount += app.approvedAmount;

    const isDisbursed = app.status === 'DISBURSED';
    const isApproved = isDisbursed || app.status === 'APPROVED' || app.status === 'CUSTOMER_ACCEPTED';

    if (isApproved) totalApprovedCases++;
    if (isDisbursed) {
      totalDisbursedCases++;
      const disAmt = app.disbursedAmount || app.approvedAmount || app.loanAmount || 0;
      totalDisbursedAmount += disAmt;
    }
  }

  const approvalRate = totalLeads > 0 ? Math.round((totalApprovedCases / totalLeads) * 100) : 0;
  const disbursementRate = totalLeads > 0 ? Math.round((totalDisbursedCases / totalLeads) * 100) : 0;

  const totalCommissionsAccrued = allCommissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const totalCommissionsPaid = allCommissions
    .filter((c) => c.status === 'PAID')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const totalCommissionsPending = allCommissions
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const activePartnersCount = partners.filter((p) => p.active && !p.isBlocked && p.partnerStatus === 'APPROVED').length;
  const pendingPartnersCount = partners.filter((p) => (p.partnerStatus || 'PENDING_APPROVAL') !== 'APPROVED').length;

  const metrics: OverallOrgMetrics = {
    totalLeads,
    totalRequestedAmount,
    totalSanctionedAmount,
    totalDisbursedAmount,
    totalDisbursedCases,
    approvalRate,
    disbursementRate,
    totalCommissionsAccrued,
    totalCommissionsPaid,
    totalCommissionsPending,
    totalPartnersCount: partners.length,
    activePartnersCount,
    pendingPartnersCount,
    totalRmsCount: rms.length,
    totalBranchesCount: branches.length,
  };

  // Branch Performance
  const branchRows: BranchPerformanceRow[] = branches.map((b) => {
    const branchApps = allApps.filter((a) => a.branchId === b.id);
    let disVol = 0;
    let disCount = 0;
    for (const a of branchApps) {
      if (a.status === 'DISBURSED') {
        disCount++;
        disVol += a.disbursedAmount || a.approvedAmount || a.loanAmount || 0;
      }
    }
    const branchComms = allCommissions
      .filter((c) => branchApps.some((a) => a.id === c.applicationId))
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

    const conv = branchApps.length > 0 ? Math.round((disCount / branchApps.length) * 100) : 0;

    return {
      branchId: b.id,
      branchName: b.name,
      branchCode: b.code,
      totalCases: branchApps.length,
      disbursedCases: disCount,
      disbursedVolume: disVol,
      commissionAmount: branchComms,
      conversionRate: conv,
      userCount: b.userCount,
    };
  });

  // RM Performance
  const rmRows: RmPerformanceRow[] = rms.map((rm) => {
    const assignedPartners = partners.filter((p) => p.assignedRmId === rm.id);
    const assignedPartnerIds = new Set(assignedPartners.map((p) => p.id));
    const rmApps = allApps.filter(
      (a) =>
        a.relationshipManagerId === rm.id ||
        a.createdById === rm.id ||
        (a.channelPartnerId && assignedPartnerIds.has(a.channelPartnerId)) ||
        (a.createdById && assignedPartnerIds.has(a.createdById))
    );

    let disVol = 0;
    let disCount = 0;
    for (const a of rmApps) {
      if (a.status === 'DISBURSED') {
        disCount++;
        disVol += a.disbursedAmount || a.approvedAmount || a.loanAmount || 0;
      }
    }
    const conv = rmApps.length > 0 ? Math.round((disCount / rmApps.length) * 100) : 0;
    const branch = rm.branchId ? branchMap.get(rm.branchId) : undefined;

    return {
      rmId: rm.id,
      rmName: rm.name,
      rmEmail: rm.email,
      rmPhone: rm.phone || '—',
      branchName: branch ? branch.name : 'Head Office',
      assignedPartnersCount: assignedPartners.length,
      totalCases: rmApps.length,
      disbursedCases: disCount,
      disbursedVolume: disVol,
      conversionRate: conv,
    };
  });

  // Channel Partner Performance
  const partnerRows: PartnerPerformanceRow[] = partners.map((p) => {
    const pApps = allApps.filter((a) => a.channelPartnerId === p.id || a.createdById === p.id);
    let disVol = 0;
    let disCount = 0;
    for (const a of pApps) {
      if (a.status === 'DISBURSED') {
        disCount++;
        disVol += a.disbursedAmount || a.approvedAmount || a.loanAmount || 0;
      }
    }
    const pComms = allCommissions
      .filter((c) => c.channelPartnerId === p.id)
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

    const branch = p.branchId ? branchMap.get(p.branchId) : undefined;

    return {
      partnerId: p.id,
      partnerName: p.name,
      partnerCode: p.partnerCode || p.phone || p.id.slice(-6).toUpperCase(),
      phone: p.phone || '—',
      email: p.email,
      branchName: branch ? branch.name : 'Head Office',
      assignedRmName: p.assignedRmName || 'Unassigned',
      status: p.partnerStatus || (p.active ? 'APPROVED' : 'PENDING_APPROVAL'),
      commissionRate: p.commissionRate || 1,
      totalCases: pApps.length,
      disbursedCases: disCount,
      disbursedVolume: disVol,
      earnedCommissions: pComms,
    };
  });

  // Sort partners by disbursedVolume DESC, then totalCases DESC
  partnerRows.sort((a, b) => b.disbursedVolume - a.disbursedVolume || b.totalCases - a.totalCases);

  // Bank Distribution
  const bankStatsMap = new Map<string, { sent: number; approved: number; disbursed: number; volume: number }>();
  for (const a of allApps) {
    const bName = a.bankName || (a.status === 'SENT_TO_BANK' ? 'Under Bank Review' : 'Direct / Other');
    if (!bankStatsMap.has(bName)) {
      bankStatsMap.set(bName, { sent: 0, approved: 0, disbursed: 0, volume: 0 });
    }
    const entry = bankStatsMap.get(bName)!;
    entry.sent++;
    if (a.status === 'APPROVED' || a.status === 'CUSTOMER_ACCEPTED' || a.status === 'DISBURSED') {
      entry.approved++;
    }
    if (a.status === 'DISBURSED') {
      entry.disbursed++;
      entry.volume += a.disbursedAmount || a.approvedAmount || a.loanAmount || 0;
    }
  }

  const bankRows: BankDistributionRow[] = Array.from(bankStatsMap.entries()).map(([bankName, data]) => {
    const share = totalDisbursedAmount > 0 ? Math.round((data.volume / totalDisbursedAmount) * 100) : 0;
    return {
      bankName,
      casesSent: data.sent,
      casesApproved: data.approved,
      casesDisbursed: data.disbursed,
      disbursedVolume: data.volume,
      sharePercentage: share,
    };
  });

  bankRows.sort((a, b) => b.disbursedVolume - a.disbursedVolume);

  // Loan Type Distribution
  const loanTypeMap = new Map<string, { count: number; volume: number }>();
  for (const a of allApps) {
    const typeKey = a.loanType || 'OTHERS';
    if (!loanTypeMap.has(typeKey)) {
      loanTypeMap.set(typeKey, { count: 0, volume: 0 });
    }
    const entry = loanTypeMap.get(typeKey)!;
    entry.count++;
    if (a.status === 'DISBURSED') {
      entry.volume += a.disbursedAmount || a.approvedAmount || a.loanAmount || 0;
    }
  }

  const loanTypeRows: LoanTypeDistributionRow[] = Array.from(loanTypeMap.entries()).map(([loanType, data]) => ({
    loanType,
    label: LOAN_TYPE_LABELS[loanType as LoanType] || loanType,
    casesCount: data.count,
    disbursedVolume: data.volume,
  }));

  loanTypeRows.sort((a, b) => b.casesCount - a.casesCount);

  return {
    metrics,
    branches: branchRows,
    rms: rmRows,
    partners: partnerRows,
    banks: bankRows,
    loanTypes: loanTypeRows,
  };
}

/**
 * 2. Generate RM Territory Report (strictly scoped to an RM's assigned partners)
 */
export function getRmTerritoryReport(rmId: string, tenantId = 'default'): RmTerritoryReportData {
  const rmApps = listApplicationsForRm(rmId, tenantId);
  const allPartners = listPartners(tenantId);
  const assignedPartners = allPartners.filter((p) => p.assignedRmId === rmId);
  const allCommissions = listCommissions(tenantId);
  const branches = listBranches(tenantId);
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  let disbursedVolume = 0;
  let disbursedCases = 0;
  for (const a of rmApps) {
    if (a.status === 'DISBURSED') {
      disbursedCases++;
      disbursedVolume += a.disbursedAmount || a.approvedAmount || a.loanAmount || 0;
    }
  }

  const assignedPartnerIds = new Set(assignedPartners.map((p) => p.id));
  const totalPartnerCommissions = allCommissions
    .filter((c) => assignedPartnerIds.has(c.channelPartnerId))
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const conversionRate = rmApps.length > 0 ? Math.round((disbursedCases / rmApps.length) * 100) : 0;

  const partnerRows: PartnerPerformanceRow[] = assignedPartners.map((p) => {
    const pApps = rmApps.filter((a) => a.channelPartnerId === p.id || a.createdById === p.id);
    let pDisVol = 0;
    let pDisCount = 0;
    for (const a of pApps) {
      if (a.status === 'DISBURSED') {
        pDisCount++;
        pDisVol += a.disbursedAmount || a.approvedAmount || a.loanAmount || 0;
      }
    }
    const pComms = allCommissions
      .filter((c) => c.channelPartnerId === p.id)
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

    const branch = p.branchId ? branchMap.get(p.branchId) : undefined;

    return {
      partnerId: p.id,
      partnerName: p.name,
      partnerCode: p.partnerCode || p.phone || p.id.slice(-6).toUpperCase(),
      phone: p.phone || '—',
      email: p.email,
      branchName: branch ? branch.name : 'Branch',
      assignedRmName: p.assignedRmName || 'You',
      status: p.partnerStatus || 'APPROVED',
      commissionRate: p.commissionRate || 1,
      totalCases: pApps.length,
      disbursedCases: pDisCount,
      disbursedVolume: pDisVol,
      earnedCommissions: pComms,
    };
  });

  partnerRows.sort((a, b) => b.disbursedVolume - a.disbursedVolume || b.totalCases - a.totalCases);

  const rmUser = listUsers(tenantId).find((u) => u.id === rmId);

  return {
    rmName: rmUser?.name || 'Relationship Manager',
    assignedPartnersCount: assignedPartners.length,
    totalLeads: rmApps.length,
    disbursedCases,
    disbursedVolume,
    conversionRate,
    totalPartnerCommissions,
    partners: partnerRows,
  };
}

/**
 * 3. Generate Central Support Operational Report
 */
export function getSupportOperationalReport(tenantId = 'default'): SupportOperationalReportData {
  const allPartners = listPartners(tenantId);
  const allApps = listAllApplications(tenantId);
  const branches = listBranchesWithCounts(tenantId);

  const pendingPartnerRequests = allPartners.filter((p) => p.partnerStatus === 'PENDING_APPROVAL').length;
  const docsRequiredPartners = allPartners.filter((p) => p.partnerStatus === 'DOCUMENTS_REQUIRED').length;
  const approvedPartners = allPartners.filter((p) => p.partnerStatus === 'APPROVED' || !p.partnerStatus).length;

  const assignedCount = allPartners.filter((p) => Boolean(p.assignedRmId)).length;
  const rmAssignmentCoverage = allPartners.length > 0 ? Math.round((assignedCount / allPartners.length) * 100) : 0;
  const unassignedPartnersCount = allPartners.length - assignedCount;

  const casesSentToBank = allApps.filter((a) => a.status === 'SENT_TO_BANK').length;
  const casesDocumentsIn = allApps.filter((a) => a.status === 'DOCUMENTS_IN').length;
  const casesDocumentsRequired = allApps.filter((a) => a.status === 'DOCUMENTS_REQUIRED').length;

  const partnerQueue = allPartners
    .filter((p) => p.partnerStatus !== 'APPROVED')
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone || '—',
      partnerStatus: p.partnerStatus || 'PENDING_APPROVAL',
      assignedRmName: p.assignedRmName || 'Not Assigned',
      createdAt: p.createdAt,
    }));

  const branchOperations = branches.map((b) => {
    const bApps = allApps.filter((a) => a.branchId === b.id);
    const pendingDocs = bApps.filter((a) => a.status === 'DOCUMENTS_REQUIRED').length;
    return {
      branchName: b.name,
      branchCode: b.code,
      activeCases: bApps.length,
      pendingDocs,
    };
  });

  return {
    totalPartners: allPartners.length,
    pendingPartnerRequests,
    docsRequiredPartners,
    approvedPartners,
    rmAssignmentCoverage,
    unassignedPartnersCount,
    totalOrgCases: allApps.length,
    casesSentToBank,
    casesDocumentsIn,
    casesDocumentsRequired,
    partnerQueue,
    branchOperations,
  };
}

/**
 * 4. Generate Channel Partner Personal Business Report
 */
export function getPartnerPersonalReport(partnerId: string, tenantId = 'default'): PartnerPersonalReportData {
  const pApps = listApplicationsByPartner(partnerId);
  const allCommissions = listCommissions(tenantId).filter((c) => c.channelPartnerId === partnerId);
  const partnerUser = listUsers(tenantId).find((u) => u.id === partnerId);

  let disbursedVolume = 0;
  let disbursedCases = 0;
  let approvedCases = 0;

  for (const a of pApps) {
    if (a.status === 'APPROVED' || a.status === 'CUSTOMER_ACCEPTED' || a.status === 'DISBURSED') {
      approvedCases++;
    }
    if (a.status === 'DISBURSED') {
      disbursedCases++;
      disbursedVolume += a.disbursedAmount || a.approvedAmount || a.loanAmount || 0;
    }
  }

  const earnedCommissions = allCommissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const paidCommissions = allCommissions
    .filter((c) => c.status === 'PAID')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const pendingCommissions = allCommissions
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const conversionRate = pApps.length > 0 ? Math.round((disbursedCases / pApps.length) * 100) : 0;

  return {
    partnerName: partnerUser?.name || 'Channel Partner',
    partnerCode: partnerUser?.partnerCode || partnerUser?.phone || partnerId.slice(-6).toUpperCase(),
    commissionRate: partnerUser?.commissionRate || 1,
    assignedRmName: partnerUser?.assignedRmName || 'Dedicated RM',
    partnerStatus: partnerUser?.partnerStatus || 'APPROVED',
    totalLeads: pApps.length,
    approvedCases,
    disbursedCases,
    disbursedVolume,
    earnedCommissions,
    pendingCommissions,
    paidCommissions,
    conversionRate,
  };
}
