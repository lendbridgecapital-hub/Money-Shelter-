'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { requireUser, requireRole } from '@/lib/auth';
import {
  emailExists,
  getUserById,
  getUserByEmail,
  getPartnerByCode,
  listAllNetworkPartners,
  createUser,
  createPartnerOnboarding,
  listRelationshipManagers,
  approvePartnerOnboarding,
  requestPartnerDocUpdate,
  rejectPartnerOnboarding,
  resubmitPartnerDocuments,
  updatePartnerCommissionRate,
  isUserDedicatedSiteRm,
} from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import { createNotification } from '@/lib/repos/workflowRepo';
import { syncDatabase } from '@/lib/db';
import type { User, Branch } from '@/types/db';
import { isPuneHqOperationsUser } from '@/lib/repos/applicationsRepo';
import {
  notifyTouchpoint09_PartnerOnboarded,
  notifyTouchpoint10_PartnerApproved,
  notifyTouchpoint11_PartnerDocsRequested,
} from '@/lib/touchpoints';

// Ephemeral in-memory OTP store for onboarding verification
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export interface RequestOtpResult {
  ok: boolean;
  error?: string;
  message?: string;
  demoOtp?: string;
}

export interface CompleteOnboardingResult {
  ok: boolean;
  error?: string;
  partnerCode?: string;
  partnerName?: string;
  email?: string;
  mobile?: string;
  partnerStatus?: string;
}

export async function requestPartnerOtpAction(payload: {
  email: string;
  mobile: string;
}): Promise<RequestOtpResult> {
  const email = (payload.email || '').trim().toLowerCase();
  const mobile = (payload.mobile || '').trim();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const cleanMobile = mobile.replace(/[^0-9]/g, '');
  if (cleanMobile.length < 10) {
    return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };
  }

  if (emailExists(email)) {
    return {
      ok: false,
      error: 'An account with this email address already exists. Please sign in to your existing account.',
    };
  }

  // Generate 6-digit OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, {
    otp: generatedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
  });

  return {
    ok: true,
    message: `Verification OTP dispatched to +91 ${cleanMobile.slice(-10)} and ${email}.`,
    demoOtp: generatedOtp,
  };
}

export async function completePartnerOnboardingAction(payload: {
  fullName: string;
  fatherSpouseName: string;
  mobile: string;
  email: string;
  address: string;
  panNumber: string;
  panDocumentUrl?: string | null;
  aadhaarNumber: string;
  aadhaarDocumentUrl?: string | null;
  agreementAuthorizedText?: string | null;
  password: string;
  otp?: string;
  branchId?: string;
  assignedRmId?: string | null;
  assignedRmName?: string | null;
  agreementAccepted: boolean;
  targetRole?: 'SUB_DSA' | 'CHANNEL_PARTNER';
  parentSubDsaId?: string | null;
  parentSubDsaName?: string | null;
}): Promise<CompleteOnboardingResult> {
  const fullName = (payload.fullName || '').trim();
  const fatherSpouseName = (payload.fatherSpouseName || '').trim();
  const email = (payload.email || '').trim().toLowerCase();
  const mobile = (payload.mobile || '').trim().replace(/[^0-9]/g, '').slice(-10);
  const address = (payload.address || '').trim();
  const panNumber = (payload.panNumber || '').trim().toUpperCase();
  const aadhaarNumber = (payload.aadhaarNumber || '').trim().replace(/[^0-9]/g, '');
  const password = payload.password || '';
  const targetRole = payload.targetRole === 'SUB_DSA' ? 'SUB_DSA' : 'CHANNEL_PARTNER';

  if (!fullName) return { ok: false, error: 'Full name is required.' };
  if (!fatherSpouseName) return { ok: false, error: "Father's / Spouse's name is required." };
  if (mobile.length !== 10) return { ok: false, error: 'Valid 10-digit mobile number is required.' };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'Valid email address is required.' };
  if (!address || address.length < 10) return { ok: false, error: 'Please provide your complete residential / business address.' };
  
  // PAN validation: 5 uppercase letters, 4 digits, 1 uppercase letter
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
    return { ok: false, error: 'Please enter a valid 10-digit alphanumeric PAN (e.g. ABCDE1234F).' };
  }

  // Aadhaar validation: 12 digits
  if (aadhaarNumber.length !== 12) {
    return { ok: false, error: 'Please enter a valid 12-digit Aadhaar number.' };
  }

  if (!password || password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters long.' };
  }

  if (!payload.agreementAccepted) {
    return { ok: false, error: 'You must read and agree to the Partnership / Referral Agreement.' };
  }

  const existingUser = getUserByEmail(email);
  if (existingUser && existingUser.partnerStatus !== 'PENDING_APPROVAL') {
    return { ok: false, error: 'An account with this email address already exists. Please sign in or use another email.' };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const branches = listBranches();
    let branchId = payload.branchId || (branches[0] ? branches[0].id : 'default');
    if (branchId) {
      const bObj = branches.find(
        (b) =>
          b.id === branchId ||
          b.code.toLowerCase() === branchId.toLowerCase() ||
          b.name.toLowerCase().includes(branchId.toLowerCase())
      );
      if (bObj) branchId = bObj.id;
    }

    const isLendbridgeSatara = Boolean(
      payload.branchId === 'br_satara_01' ||
      payload.branchId?.toLowerCase().includes('satara') ||
      payload.branchId?.toLowerCase().includes('lendbridge') ||
      payload.branchId?.toUpperCase() === 'STR01' ||
      payload.agreementAuthorizedText?.toLowerCase().includes('lendbridge') ||
      payload.agreementAuthorizedText?.toLowerCase().includes('satara') ||
      payload.email?.toLowerCase().includes('satara') ||
      payload.email?.toLowerCase().includes('lendbridge')
    );

    if (isLendbridgeSatara) {
      branchId = 'br_satara_01';
    }

    let assignedRmId = payload.assignedRmId || null;
    let assignedRmName = payload.assignedRmName || null;

    if (assignedRmId) {
      const rms = listRelationshipManagers();
      const matchedRm = rms.find((r) => r.id === assignedRmId);
      if (matchedRm) {
        assignedRmName = matchedRm.name;
        if (matchedRm.branchId && !payload.branchId) {
          branchId = matchedRm.branchId;
        }
      }
    }

    const createdPartner = createPartnerOnboarding({
      name: fullName,
      email,
      phone: mobile,
      passwordHash,
      fatherSpouseName,
      address,
      panNumber,
      panDocumentUrl: payload.panDocumentUrl,
      aadhaarNumber,
      aadhaarDocumentUrl: payload.aadhaarDocumentUrl,
      agreementAuthorizedText: payload.agreementAuthorizedText,
      branchId,
      assignedRmId,
      assignedRmName,
      role: targetRole,
      parentSubDsaId: payload.parentSubDsaId || null,
      parentSubDsaName: payload.parentSubDsaName || null,
    });

    // Clear OTP after successful use
    otpStore.delete(email);

    // Trigger Touchpoint 09: Channel Partner Onboarding Submission (In-App to RM & Support + Welcome email)
    try {
      const assignedRm = createdPartner.assignedRmId ? getUserById(createdPartner.assignedRmId) : null;
      await notifyTouchpoint09_PartnerOnboarded(createdPartner, assignedRm);
    } catch (e) {
      console.warn('[completePartnerOnboardingAction] Error dispatching Touchpoint 09:', e);
    }

    // Also notify parent Sub-DSA if an agent signed up via Sub-DSA referral link
    if (payload.parentSubDsaId) {
      try {
        createNotification({
          recipientId: payload.parentSubDsaId,
          recipientRole: 'SUB_DSA',
          applicationId: 'sub-dsa-network',
          title: 'New Agent Joined Your Team! 👥',
          message: `${fullName} has registered using your referral link and is now mapped to your Sub-DSA network!`,
        });
      } catch {}
    }

    safeRevalidate('/admin/partner-requests');
    safeRevalidate('/admin/partners');
    safeRevalidate('/admin/users');

    await syncDatabase();

    return {
      ok: true,
      partnerCode: createdPartner.partnerCode,
      partnerName: createdPartner.name,
      email: createdPartner.email,
      mobile: createdPartner.phone || mobile,
      partnerStatus: createdPartner.partnerStatus || 'PENDING_APPROVAL',
    };
  } catch (err) {
    console.error('[partner-onboarding] Error creating partner:', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to create partner account. Please try again or contact support.',
    };
  }
}

/**
 * Direct Partner Onboarding Action for Admins and RMs
 * Instantly creates an APPROVED channel partner without requiring OTP or manual verification queues.
 */
export async function directAdminOnboardPartnerAction(payload: {
  fullName: string;
  email: string;
  mobile: string;
  password?: string;
  branchId: string;
  assignedRmId?: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  commissionRate?: number | null;
  role?: 'SUB_DSA' | 'CHANNEL_PARTNER';
  partnerStatus?: 'APPROVED' | 'PENDING_APPROVAL';
}): Promise<{ ok: boolean; message?: string; error?: string; partner?: User }> {
  try {
    const sessionUser = await requireUser();
    if (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'RELATIONSHIP_MANAGER') {
      return { ok: false, error: 'Unauthorized to onboard partners or appoint Sub-DSAs.' };
    }

    if (sessionUser.role === 'RELATIONSHIP_MANAGER' && isUserDedicatedSiteRm(sessionUser)) {
      return { ok: false, error: 'Dedicated Site Relationship Managers cannot appoint Sub-DSAs or onboard partners.' };
    }

    const fullName = (payload.fullName || '').trim();
    const email = (payload.email || '').trim().toLowerCase();
    const mobile = (payload.mobile || '').trim().replace(/[^0-9]/g, '').slice(-10);
    const password = payload.password || 'Quickfin@123';
    const branchId = payload.branchId;
    const isSubDsa = payload.role === 'SUB_DSA';
    const partnerStatus = payload.partnerStatus || 'APPROVED';
    const isPending = partnerStatus === 'PENDING_APPROVAL';

    if (!fullName) return { ok: false, error: 'Partner full name is required.' };
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'A valid email address is required.' };
    if (mobile.length !== 10) return { ok: false, error: 'A valid 10-digit mobile number is required.' };
    if (!branchId) return { ok: false, error: 'Please select a branch.' };

    if (emailExists(email)) {
      return { ok: false, error: `An account with email "${email}" already exists.` };
    }

    let assignedRmId = payload.assignedRmId || null;
    let assignedRmName: string | null = null;

    // If an RM is onboarding the partner, automatically map to themselves
    if (sessionUser.role === 'RELATIONSHIP_MANAGER') {
      assignedRmId = sessionUser.id;
      assignedRmName = sessionUser.name;
    } else if (assignedRmId) {
      const rms = listRelationshipManagers();
      const matched = rms.find((r) => r.id === assignedRmId);
      if (matched) assignedRmName = matched.name;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const partnerCode = isSubDsa ? `QFS-SUB-${randomSuffix}` : `QFS-PRT-${randomSuffix}`;

    const created = createUser({
      name: fullName,
      email,
      phone: mobile,
      passwordHash,
      role: isSubDsa ? 'SUB_DSA' : 'CHANNEL_PARTNER',
      branchId,
      partnerCode,
      partnerStatus,
      assignedRmId,
      assignedRmName,
      panNumber: payload.panNumber ? payload.panNumber.trim().toUpperCase() : null,
      aadhaarNumber: payload.aadhaarNumber ? payload.aadhaarNumber.trim() : null,
      commissionRate:
        payload.commissionRate !== undefined && payload.commissionRate !== null && !isNaN(Number(payload.commissionRate))
          ? Number(payload.commissionRate)
          : undefined,
    });

    if (assignedRmId && assignedRmId !== sessionUser.id) {
      try {
        createNotification({
          recipientId: assignedRmId,
          recipientRole: 'RELATIONSHIP_MANAGER',
          applicationId: 'partner-onboarding',
          title: isSubDsa ? 'New Sub-DSA Assigned! 🏢' : 'New Channel Partner Assigned! 🤝',
          message: `${fullName} (${partnerCode}) has been registered (${isPending ? 'Pending Review' : 'Approved'}) and assigned to your portfolio.`,
        });
      } catch {}
    }

    safeRevalidate('/admin/partners');
    safeRevalidate('/admin/users');
    safeRevalidate('/admin/partner-requests');

    await syncDatabase();

    return {
      ok: true,
      message: isPending
        ? `${isSubDsa ? 'Sub-DSA' : 'Partner'} "${fullName}" registered and landed in Partner Onboarding Approvals bucket (Pending Review).`
        : `${isSubDsa ? 'Sub-DSA' : 'Partner'} "${fullName}" onboarded and approved successfully with Partner Code: ${partnerCode}.`,
      partner: created,
    };
  } catch (err) {
    console.error('[directAdminOnboardPartnerAction] Error:', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to onboard partner.',
    };
  }
}

// ----------------------------------------------------
// Central Support / Admin Partner Approval Actions
// ----------------------------------------------------

function checkPartnerBranchAccess(
  sessionUser: User,
  partner: User
): { allowed: boolean; error?: string; userBranch?: Branch; allowedBranchIds?: Set<string> } {
  const isPuneHq = sessionUser.role === 'OPERATIONS' && isPuneHqOperationsUser(sessionUser);
  if (sessionUser.role === 'ADMIN' || sessionUser.role === 'CENTRAL_SUPPORT' || isPuneHq) {
    return { allowed: true };
  }

  let userBranchId = sessionUser.branchId;
  if (
    !userBranchId &&
    (sessionUser.email?.toLowerCase().includes('lendbridge') ||
      sessionUser.email?.toLowerCase().includes('satara') ||
      sessionUser.name?.toLowerCase().includes('lendbridge') ||
      sessionUser.name?.toLowerCase().includes('satara'))
  ) {
    userBranchId = 'br_satara_01';
  }

  const allBranches = listBranches(sessionUser.tenantId || 'default');
  const userBranch = userBranchId
    ? allBranches.find(
        (b) =>
          b.id.toLowerCase() === userBranchId!.toLowerCase() ||
          b.code.toLowerCase() === userBranchId!.toLowerCase() ||
          b.name.toLowerCase() === userBranchId!.toLowerCase()
      )
    : null;

  if (!userBranch) {
    return {
      allowed: false,
      error: 'Access Denied: Your user account is not assigned to an active regional branch.',
    };
  }

  const branchSites = allBranches.filter(
    (b) => b.type === 'SITE' && (b.mappedBranchId === userBranch.id || b.mappedBranchId === userBranch.code)
  );

  const allowedBranchIds = new Set<string>();
  allowedBranchIds.add(userBranch.id.toLowerCase());
  allowedBranchIds.add(userBranch.code.toLowerCase());
  allowedBranchIds.add(userBranch.name.toLowerCase());
  if (userBranch.coBrandName) allowedBranchIds.add(userBranch.coBrandName.toLowerCase());
  for (const s of branchSites) {
    allowedBranchIds.add(s.id.toLowerCase());
    allowedBranchIds.add(s.code.toLowerCase());
    allowedBranchIds.add(s.name.toLowerCase());
  }

  const pBranchId = (partner.branchId || '').toLowerCase();
  const pBranchName = (partner.branchName || '').toLowerCase();
  const isAllowed =
    allowedBranchIds.has(pBranchId) ||
    allowedBranchIds.has(pBranchName) ||
    (userBranch.id === 'br_satara_01' &&
      (partner.email.toLowerCase().includes('satara') ||
        partner.email.toLowerCase().includes('lendbridge') ||
        pBranchName.includes('satara') ||
        pBranchId === 'str01'));

  if (!isAllowed) {
    return {
      allowed: false,
      error: 'Access Denied: You are only authorized to review and approve partners registered under your specific branch.',
    };
  }

  return { allowed: true, userBranch, allowedBranchIds };
}

function resolvePartnerCandidate(
  partnerId: string,
  partnerEmail?: string,
  partnerCode?: string,
  tenantId = 'default'
): User | undefined {
  if (partnerId) {
    const direct = getUserById(partnerId);
    if (direct) return direct;
  }
  if (partnerEmail) {
    const byEmail = getUserByEmail(partnerEmail);
    if (byEmail) return byEmail;
  }
  if (partnerCode) {
    const byCode = getPartnerByCode(partnerCode);
    if (byCode) return byCode;
  }
  const all = listAllNetworkPartners(tenantId);
  return all.find(
    (p) =>
      (partnerId && p.id.toLowerCase() === partnerId.toLowerCase()) ||
      (partnerEmail && p.email.toLowerCase() === partnerEmail.toLowerCase()) ||
      (partnerCode && (p.partnerCode || '').toUpperCase() === partnerCode.toUpperCase())
  );
}

export async function approvePartnerAction(payload: {
  partnerId: string;
  partnerEmail?: string;
  partnerCode?: string;
  assignedRmId?: string;
  remark?: string;
  commissionRate?: number | null;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const sessionUser = await requireUser();
    const allowedRoles = ['CENTRAL_SUPPORT', 'ADMIN', 'RELATIONSHIP_MANAGER', 'OPERATIONS'];
    if (!allowedRoles.includes(sessionUser.role)) {
      return { ok: false, error: 'Unauthorized: You do not have permission to approve partner applications.' };
    }

    const partner = resolvePartnerCandidate(
      payload.partnerId,
      payload.partnerEmail,
      payload.partnerCode,
      sessionUser.tenantId || 'default'
    );
    if (!partner) {
      return { ok: false, error: 'Partner application not found.' };
    }

    const access = checkPartnerBranchAccess(sessionUser, partner);
    if (!access.allowed) {
      return { ok: false, error: access.error || 'Access Denied' };
    }

    let finalRmId = payload.assignedRmId ? payload.assignedRmId.trim() : '';
    let finalRmName = 'Branch Relationship Manager';

    if (!finalRmId) {
      // If no RM was assigned, fallback to the approving operations user
      finalRmId = sessionUser.id;
      finalRmName = access.userBranch ? `${sessionUser.name} (${access.userBranch.name} Operations Desk)` : sessionUser.name;
    } else {
      const rms = listRelationshipManagers(sessionUser.tenantId || 'default');
      const assignedRm = rms.find((r) => r.id === finalRmId);
      if (assignedRm) {
        finalRmName = assignedRm.name;
        if (access.allowedBranchIds && assignedRm.branchId) {
          const rmBId = assignedRm.branchId.toLowerCase();
          if (!access.allowedBranchIds.has(rmBId)) {
            return {
              ok: false,
              error: 'Assigned Relationship Manager must belong to your branch or mapped sites.',
            };
          }
        }
      } else if (finalRmId === sessionUser.id) {
        finalRmName = access.userBranch ? `${sessionUser.name} (${access.userBranch.name} Operations Desk)` : sessionUser.name;
      }
    }

    const updated = approvePartnerOnboarding(
      payload.partnerId,
      finalRmId,
      finalRmName,
      { id: sessionUser.id, name: sessionUser.name },
      payload.remark,
      payload.commissionRate
    );

    const isSubDsa = updated.role === 'SUB_DSA';

    // Trigger Touchpoint 10: Channel Partner KYC Approved & Certified (In-App + Welcome & Certificate email)
    try {
      await notifyTouchpoint10_PartnerApproved(updated, finalRmName, { tenantId: updated.tenantId });
    } catch (e) {
      console.warn('[approvePartnerAction] Error dispatching Touchpoint 10:', e);
    }

    safeRevalidate('/admin/partner-requests');
    safeRevalidate('/admin/partners');
    safeRevalidate('/branch/requests');
    safeRevalidate('/dashboard');

    await syncDatabase();

    return {
      ok: true,
      message: `${isSubDsa ? 'Sub-DSA' : 'Partner'} ${updated.name} approved successfully! Assigned to RM ${finalRmName}. Certificate ${updated.certificateNumber} issued.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to approve partner.' };
  }
}

export async function updatePartnerCommissionRateAction(payload: {
  partnerId: string;
  partnerEmail?: string;
  partnerCode?: string;
  commissionRate: number | null;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const sessionUser = await requireUser();
    const allowedRoles = ['ADMIN', 'CENTRAL_SUPPORT', 'OPERATIONS'];
    if (!allowedRoles.includes(sessionUser.role)) {
      return { ok: false, error: 'Unauthorized: Only Administrators and Operations can configure partner commission rates.' };
    }

    const partner = resolvePartnerCandidate(
      payload.partnerId,
      payload.partnerEmail,
      payload.partnerCode,
      sessionUser.tenantId || 'default'
    );
    if (!partner) {
      return { ok: false, error: 'Partner not found.' };
    }

    const access = checkPartnerBranchAccess(sessionUser, partner);
    if (!access.allowed) {
      return { ok: false, error: access.error || 'Access Denied' };
    }

    const rate =
      payload.commissionRate !== null && payload.commissionRate !== undefined && !isNaN(Number(payload.commissionRate))
        ? Number(Number(payload.commissionRate).toFixed(2))
        : null;

    updatePartnerCommissionRate(partner.id, rate);

    safeRevalidate('/admin/partners');
    safeRevalidate('/admin/partner-requests');
    safeRevalidate('/admin/commissions');

    await syncDatabase();

    return {
      ok: true,
      message:
        rate !== null
          ? `Commission rate for ${partner.name} set to ${rate}%.`
          : `Commission rate for ${partner.name} reset to Standard Bank Product Slab.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update commission rate.' };
  }
}

export async function requestPartnerDocsAction(payload: {
  partnerId: string;
  partnerEmail?: string;
  partnerCode?: string;
  remark: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const sessionUser = await requireUser();
    const allowedRoles = ['CENTRAL_SUPPORT', 'ADMIN', 'RELATIONSHIP_MANAGER', 'OPERATIONS'];
    if (!allowedRoles.includes(sessionUser.role)) {
      return { ok: false, error: 'Unauthorized: You do not have permission to request document updates.' };
    }

    const partner = resolvePartnerCandidate(
      payload.partnerId,
      payload.partnerEmail,
      payload.partnerCode,
      sessionUser.tenantId || 'default'
    );
    if (!partner) {
      return { ok: false, error: 'Partner not found.' };
    }

    const access = checkPartnerBranchAccess(sessionUser, partner);
    if (!access.allowed) {
      return { ok: false, error: access.error || 'Access Denied' };
    }

    if (!payload.remark || !payload.remark.trim()) {
      return { ok: false, error: 'Please specify the reason or document updates required.' };
    }

    const updated = requestPartnerDocUpdate(
      partner.id,
      payload.remark.trim(),
      { id: sessionUser.id, name: sessionUser.name }
    );

    // Trigger Touchpoint 11: Partner KYC Document Update Requested (In-App + Document re-upload email)
    try {
      await notifyTouchpoint11_PartnerDocsRequested(updated, payload.remark.trim(), { tenantId: updated.tenantId });
    } catch (e) {
      console.warn('[requestPartnerDocsAction] Error dispatching Touchpoint 11:', e);
    }

    safeRevalidate('/admin/partner-requests');
    safeRevalidate('/admin/partners');

    await syncDatabase();

    return {
      ok: true,
      message: `Update request sent to ${updated.name}. Status updated to Documents Required.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to request update.' };
  }
}

export async function rejectPartnerAction(payload: {
  partnerId: string;
  partnerEmail?: string;
  partnerCode?: string;
  reason: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const sessionUser = await requireUser();
    const allowedRoles = ['CENTRAL_SUPPORT', 'ADMIN', 'RELATIONSHIP_MANAGER', 'OPERATIONS'];
    if (!allowedRoles.includes(sessionUser.role)) {
      return { ok: false, error: 'Unauthorized: You do not have permission to reject partner applications.' };
    }

    const partner = resolvePartnerCandidate(
      payload.partnerId,
      payload.partnerEmail,
      payload.partnerCode,
      sessionUser.tenantId || 'default'
    );
    if (!partner) {
      return { ok: false, error: 'Partner not found.' };
    }

    const access = checkPartnerBranchAccess(sessionUser, partner);
    if (!access.allowed) {
      return { ok: false, error: access.error || 'Access Denied' };
    }

    if (!payload.reason || !payload.reason.trim()) {
      return { ok: false, error: 'Please state the reason for rejecting this application.' };
    }

    const updated = rejectPartnerOnboarding(
      payload.partnerId,
      payload.reason.trim(),
      { id: sessionUser.id, name: sessionUser.name }
    );

    createNotification({
      recipientId: updated.id,
      recipientRole: 'CHANNEL_PARTNER',
      applicationId: 'partner-onboarding',
      title: 'Partner Application Decision',
      message: `Your partner application was not approved. Reason: ${payload.reason.trim()}. Please contact Central Support for queries.`,
    });

    safeRevalidate('/admin/partner-requests');
    safeRevalidate('/admin/partners');

    await syncDatabase();

    return {
      ok: true,
      message: `Partner application for ${updated.name} has been rejected.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to reject partner.' };
  }
}

export async function resubmitPartnerDocsAction(payload: {
  panDocumentUrl?: string;
  aadhaarDocumentUrl?: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const sessionUser = await requireUser();
    if (sessionUser.role !== 'CHANNEL_PARTNER') {
      return { ok: false, error: 'Only Channel Partners can resubmit onboarding documents.' };
    }

    if (!payload.panDocumentUrl && !payload.aadhaarDocumentUrl) {
      return { ok: false, error: 'Please attach at least one updated document file.' };
    }

    const updated = resubmitPartnerDocuments(
      sessionUser.id,
      payload.panDocumentUrl,
      payload.aadhaarDocumentUrl
    );

    safeRevalidate('/branch/create-link');
    safeRevalidate('/dashboard');
    safeRevalidate('/admin/partner-requests');

    await syncDatabase();

    return {
      ok: true,
      message: 'Updated documents submitted successfully. Central Support will review your application.',
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to resubmit documents.' };
  }
}

/**
 * Public Website Quick Onboard Partner Action
 * Allows website visitors clicking "Become a Partner" to register and be issued an official Partner Code instantly.
 */
export async function publicWebsiteOnboardPartnerAction(payload: {
  fullName: string;
  email: string;
  mobile: string;
  branchId?: string;
  role?: 'CHANNEL_PARTNER' | 'SUB_DSA';
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  password?: string;
}): Promise<{ ok: boolean; message?: string; error?: string; partnerCode?: string; partnerId?: string }> {
  try {
    const fullName = (payload.fullName || '').trim();
    const email = (payload.email || '').trim().toLowerCase();
    const mobile = (payload.mobile || '').trim().replace(/[^0-9]/g, '').slice(-10);
    const password = payload.password?.trim() || 'MoneyShelter@123';
    const role = payload.role === 'SUB_DSA' ? 'SUB_DSA' : 'CHANNEL_PARTNER';

    if (!fullName) return { ok: false, error: 'Partner full legal name is required.' };
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'A valid email address is required.' };
    if (mobile.length !== 10) return { ok: false, error: 'A valid 10-digit mobile number is required.' };

    if (emailExists(email)) {
      return { ok: false, error: `An account with email "${email}" already exists. Please sign in or use another email.` };
    }

    const branches = listBranches();
    const branchId = payload.branchId || branches[0]?.id || 'br_c95492722e36abe1';

    const cleanPan = payload.panNumber ? payload.panNumber.trim().toUpperCase() : null;
    if (cleanPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      return { ok: false, error: 'Please enter a valid 10-digit PAN (e.g. ABCDE1234F).' };
    }

    const cleanAadhaar = payload.aadhaarNumber ? payload.aadhaarNumber.trim().replace(/[^0-9]/g, '') : null;
    if (cleanAadhaar && cleanAadhaar.length !== 12) {
      return { ok: false, error: 'Please enter a valid 12-digit Aadhaar number.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const partner = createUser({
      name: fullName,
      email,
      passwordHash,
      role,
      branchId,
      phone: mobile,
      panNumber: cleanPan,
      aadhaarNumber: cleanAadhaar,
      partnerStatus: 'APPROVED',
    });

    // Notify new partner
    try {
      createNotification({
        recipientId: partner.id,
        recipientRole: role,
        applicationId: 'partner-onboarding',
        title: `Welcome to Money Shelter!`,
        message: `${fullName}, your official partner code is ${partner.partnerCode}. You can now login to track cases and commission payouts.`,
        tenantId: 'default',
      });
    } catch {}

    safeRevalidate('/admin/partners');
    safeRevalidate('/admin/partner-requests');
    safeRevalidate('/dashboard');

    await syncDatabase();

    return {
      ok: true,
      partnerCode: partner.partnerCode,
      partnerId: partner.id,
      message: `Welcome to Money Shelter! You have been onboarded as an authorized ${role === 'SUB_DSA' ? 'Sub-DSA' : 'Channel Partner'}. Your official Partner Code is ${partner.partnerCode}.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to complete partner onboarding.' };
  }
}
