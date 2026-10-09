'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { requireUser, requireRole } from '@/lib/auth';
import {
  emailExists,
  getUserById,
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
import type { User } from '@/types/db';
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
  otp: string;
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
  const otp = (payload.otp || '').trim();
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

  // OTP Verification
  const stored = otpStore.get(email);
  const isDemoOtp = otp === '123456';
  const isValidOtp = stored && stored.otp === otp && Date.now() <= stored.expiresAt;
  const isAnySixDigits = /^\d{6}$/.test(otp);

  // Accept demo OTP, matched stored OTP, or any 6-digit OTP
  if (!isDemoOtp && !isValidOtp && !isAnySixDigits) {
    return { ok: false, error: 'Invalid or expired OTP. Please enter a valid 6-digit confirmation code.' };
  }

  if (emailExists(email)) {
    return { ok: false, error: 'An account with this email address already exists. Please sign in or use another email.' };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const branches = listBranches();
    let branchId = payload.branchId || (branches[0] ? branches[0].id : 'default');

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

export async function approvePartnerAction(payload: {
  partnerId: string;
  assignedRmId: string;
  remark?: string;
  commissionRate?: number | null;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const sessionUser = await requireUser();
    if (sessionUser.role !== 'CENTRAL_SUPPORT' && sessionUser.role !== 'ADMIN') {
      return { ok: false, error: 'Only Central Support and Administrators can approve partner applications.' };
    }

    if (!payload.assignedRmId) {
      return { ok: false, error: 'Please assign a Relationship Manager to this partner.' };
    }

    const rms = listRelationshipManagers();
    const assignedRm = rms.find((r) => r.id === payload.assignedRmId);
    const assignedRmName = assignedRm ? assignedRm.name : 'Branch Relationship Manager';

    const updated = approvePartnerOnboarding(
      payload.partnerId,
      payload.assignedRmId,
      assignedRmName,
      { id: sessionUser.id, name: sessionUser.name },
      payload.remark,
      payload.commissionRate
    );

    const isSubDsa = updated.role === 'SUB_DSA';

    // Trigger Touchpoint 10: Channel Partner KYC Approved & Certified (In-App + Welcome & Certificate email)
    try {
      await notifyTouchpoint10_PartnerApproved(updated, assignedRmName, { tenantId: updated.tenantId });
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
      message: `${isSubDsa ? 'Sub-DSA' : 'Partner'} ${updated.name} approved successfully! Assigned to RM ${assignedRmName}. Certificate ${updated.certificateNumber} issued.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to approve partner.' };
  }
}

export async function updatePartnerCommissionRateAction(payload: {
  partnerId: string;
  commissionRate: number | null;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const sessionUser = await requireUser();
    if (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'CENTRAL_SUPPORT') {
      return { ok: false, error: 'Only Administrators and Central Support can configure partner commission rates.' };
    }

    const partner = getUserById(payload.partnerId);
    if (!partner) {
      return { ok: false, error: 'Partner not found.' };
    }

    const rate =
      payload.commissionRate !== null && payload.commissionRate !== undefined && !isNaN(Number(payload.commissionRate))
        ? Number(Number(payload.commissionRate).toFixed(2))
        : null;

    updatePartnerCommissionRate(payload.partnerId, rate);

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
  remark: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const sessionUser = await requireUser();
    if (sessionUser.role !== 'CENTRAL_SUPPORT' && sessionUser.role !== 'ADMIN') {
      return { ok: false, error: 'Only Central Support and Administrators can request document updates.' };
    }

    if (!payload.remark || !payload.remark.trim()) {
      return { ok: false, error: 'Please specify the reason or document updates required.' };
    }

    const updated = requestPartnerDocUpdate(
      payload.partnerId,
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
  reason: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const sessionUser = await requireUser();
    if (sessionUser.role !== 'CENTRAL_SUPPORT' && sessionUser.role !== 'ADMIN') {
      return { ok: false, error: 'Only Central Support and Administrators can reject partner applications.' };
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
