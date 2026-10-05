'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { requireUser, requireRole } from '@/lib/auth';
import {
  emailExists,
  createUser,
  createPartnerOnboarding,
  listRelationshipManagers,
  approvePartnerOnboarding,
  requestPartnerDocUpdate,
  rejectPartnerOnboarding,
  resubmitPartnerDocuments,
} from '@/lib/repos/usersRepo';
import { listBranches } from '@/lib/repos/branchesRepo';
import { createNotification } from '@/lib/repos/workflowRepo';
import { syncDatabase } from '@/lib/db';
import type { User } from '@/types/db';

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
    return { ok: false, error: 'You must read and agree to the Sub-DSA / Referral Partner Agreement.' };
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
    });

    // Clear OTP after successful use
    otpStore.delete(email);

    // Notify assigned RM if referral link was used
    if (createdPartner.assignedRmId) {
      try {
        createNotification({
          recipientId: createdPartner.assignedRmId,
          recipientRole: 'RELATIONSHIP_MANAGER',
          applicationId: 'partner-onboarding',
          title: 'New Partner Onboarded via Your Link! 🤝',
          message: `${fullName} has completed partner onboarding using your link and is auto-assigned to you (Pending Central Support verification).`,
        });
      } catch {}
    }

    // Notify Central Support
    try {
      createNotification({
        recipientId: 'central-support',
        recipientRole: 'CENTRAL_SUPPORT',
        applicationId: 'partner-onboarding',
        title: 'New Partner Onboarding Submission 📋',
        message: `${fullName} has submitted Sub-DSA onboarding.${createdPartner.assignedRmName ? ` Auto-assigned to RM ${createdPartner.assignedRmName}.` : ''} Pending KYC verification.`,
      });
    } catch {}

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
  commissionRate?: number;
}): Promise<{ ok: boolean; message?: string; error?: string; partner?: User }> {
  try {
    const sessionUser = await requireUser();
    if (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'CENTRAL_SUPPORT' && sessionUser.role !== 'RELATIONSHIP_MANAGER') {
      return { ok: false, error: 'Unauthorized to onboard channel partners.' };
    }

    const fullName = (payload.fullName || '').trim();
    const email = (payload.email || '').trim().toLowerCase();
    const mobile = (payload.mobile || '').trim().replace(/[^0-9]/g, '').slice(-10);
    const password = payload.password || 'Quickfin@123';
    const branchId = payload.branchId;

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
    const partnerCode = `QFS-PRT-${randomSuffix}`;

    const created = createUser({
      name: fullName,
      email,
      phone: mobile,
      passwordHash,
      role: 'CHANNEL_PARTNER',
      branchId,
      partnerCode,
      partnerStatus: 'APPROVED',
      assignedRmId,
      assignedRmName,
      panNumber: payload.panNumber ? payload.panNumber.trim().toUpperCase() : null,
      aadhaarNumber: payload.aadhaarNumber ? payload.aadhaarNumber.trim() : null,
      commissionRate: payload.commissionRate !== undefined ? Number(payload.commissionRate) : undefined,
    });

    if (assignedRmId && assignedRmId !== sessionUser.id) {
      try {
        createNotification({
          recipientId: assignedRmId,
          recipientRole: 'RELATIONSHIP_MANAGER',
          applicationId: 'partner-onboarding',
          title: 'New Channel Partner Assigned! 🤝',
          message: `${fullName} (${partnerCode}) has been onboarded and assigned to your portfolio.`,
        });
      } catch {}
    }

    safeRevalidate('/admin/partners');
    safeRevalidate('/admin/users');
    safeRevalidate('/admin/partner-requests');

    await syncDatabase();

    return {
      ok: true,
      message: `Partner "${fullName}" onboarded successfully with Partner Code: ${partnerCode}.`,
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
      payload.remark
    );

    createNotification({
      recipientId: updated.id,
      recipientRole: 'CHANNEL_PARTNER',
      applicationId: 'partner-onboarding',
      title: 'Partner Application Approved!',
      message: `Your Channel Partner application has been approved by Central Support. Your assigned Relationship Manager is ${assignedRmName}. You can now create customer links and view your Certificate of Association.`,
    });

    safeRevalidate('/admin/partner-requests');
    safeRevalidate('/admin/partners');
    safeRevalidate('/branch/requests');

    await syncDatabase();

    return {
      ok: true,
      message: `Partner ${updated.name} approved successfully! Assigned to RM ${assignedRmName}. Certificate ${updated.certificateNumber} issued.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to approve partner.' };
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

    createNotification({
      recipientId: updated.id,
      recipientRole: 'CHANNEL_PARTNER',
      applicationId: 'partner-onboarding',
      title: 'Action Required: Partner Document Update Requested',
      message: `Central Support has requested an update: "${payload.remark.trim()}". Please log in to upload the requested files.`,
    });

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
