export type Role =
  | 'ADMIN'
  | 'CENTRAL_SUPPORT'
  | 'OPERATIONS'
  | 'RELATIONSHIP_MANAGER'
  | 'SUB_DSA'
  | 'CHANNEL_PARTNER';

export type PartnerStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'DOCUMENTS_REQUIRED'
  | 'REJECTED';

export type ApplicationStatus =
  | 'LINK_SHARED'
  | 'DOCUMENTS_IN'
  | 'SENT_TO_BANK'
  | 'DOCUMENTS_REQUIRED'
  | 'APPROVED'
  | 'CUSTOMER_ACCEPTED'
  | 'DISBURSED'
  | 'REJECTED';

export type LoanType =
  | 'HOME_LOAN'
  | 'PERSONAL_LOAN'
  | 'BUSINESS_LOAN'
  | 'LOAN_AGAINST_PROPERTY'
  | 'EDUCATION_LOAN'
  | 'GOLD_LOAN'
  | 'BALANCE_TRANSFER'
  | 'OTHERS';

export type DocumentCategory =
  | 'PAN_CARD'
  | 'AADHAAR_CARD'
  | 'RESIDENCE_PROOF'
  | 'INCOME_PROOF'
  | 'BANK_STATEMENT'
  | 'ADDITIONAL_REQUIRED'
  | 'ACCEPTANCE_LETTER'
  | 'OTHER';

export interface Bank {
  id: string;
  tenantId?: string;
  name: string;
  code: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  commissionPct: number; // e.g. 0.75 for 0.75%
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BankProduct {
  id: string;
  tenantId?: string;
  productName: string; // 'Home Loan' | 'Personal Loan' | 'Business Loan' | 'Education Loan' | 'Balance Transfer' | 'Property Loan' | custom
  banks: string[]; // List of Indian bank & NBFC names
  baseRate: number; // Gross commission % receivable by Quickfinsure from the bank (e.g. 2.0%)
  partnerRate: number; // Commission % shared with the Channel Partner (e.g. 1.5%)
  subDsaRate: number; // Override commission % shared with the Sub-DSA (e.g. 0.1%)
  dedicatedPartnerId?: string | null; // null if applicable for all partners
  dedicatedPartnerName?: string | null;
  dedicatedPartnerMobile?: string | null;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Commission {
  id: string;
  tenantId?: string;
  applicationId: string;
  channelPartnerId: string;
  channelPartnerName?: string;
  bankId: string;
  bankName?: string;
  disbursedAmount: number;
  commissionRate: number; // percentage
  commissionAmount: number; // calculated rupees
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CLAWBACK';
  earningType?: 'DIRECT' | 'OVERRIDE';
  sourcePartnerId?: string | null;
  sourcePartnerName?: string | null;
  productName?: string | null;
  bankPayoutRate?: number | null;
  subDsaOverrideRate?: number | null;
  netCompanyMargin?: number | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface Clawback {
  id: string;
  tenantId?: string;
  channelPartnerId: string;
  channelPartnerName?: string;
  applicationId?: string | null;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface PartnerNotification {
  id: string;
  tenantId?: string;
  recipientId: string;
  recipientRole: Role;
  applicationId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface RequiredDocumentItem {
  id: string;
  applicationId: string;
  documentTitle: string;
  instruction?: string;
  status: 'PENDING' | 'UPLOADED';
  uploadedFileUrl?: string;
  uploadedAt?: string;
  createdAt: string;
}

export interface OperationalRemark {
  id: string;
  applicationId: string;
  authorId: string;
  authorName: string;
  authorRole: Role | 'BORROWER';
  statusChangedTo?: ApplicationStatus | null;
  remark: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  companyName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  officialEmail?: string | null;
  supportPhone?: string | null;
  websiteUrl?: string | null;
  footerText?: string | null;
  portalTitle?: string | null;
  smtpHost?: string | null;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFromName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  id?: string;
  tenantId?: string;
  companyName: string;
  tagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  accentColor: string;
  officialEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
  footerText?: string;
  portalTitle?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromName?: string;
}

export interface Branch {
  id: string;
  tenantId?: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BranchWithCounts extends Branch {
  userCount: number;
  applicationCount: number;
}

export interface User {
  id: string;
  tenantId?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  branchId: string;
  branchName?: string;
  active: boolean;
  isBlocked?: boolean;
  blockedReason?: string | null;
  phone?: string | null;
  commissionRate?: number; // custom partner commission %
  partnerCode?: string; // e.g. QFS-PRT-8421
  partnerStatus?: PartnerStatus;
  fatherSpouseName?: string | null;
  address?: string | null;
  panNumber?: string | null;
  panDocumentUrl?: string | null;
  aadhaarNumber?: string | null;
  aadhaarDocumentUrl?: string | null;
  agreementAccepted?: boolean;
  agreementSignedAt?: string | null;
  agreementAuthorizedText?: string | null;
  assignedRmId?: string | null;
  assignedRmName?: string | null;
  parentSubDsaId?: string | null;
  parentSubDsaName?: string | null;
  approvalRemark?: string | null;
  approvedAt?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  certificateNumber?: string | null;
  certificateIssuedAt?: string | null;
  photoUrl?: string | null;
  firmLogoUrl?: string | null;
  firmName?: string | null;
  bio?: string | null;
  city?: string | null;
  createdAt: string;
}

export interface LoanApplication {
  id: string;
  tenantId?: string;
  token: string;
  branchId: string;
  branchName?: string;
  createdById: string; // Partner who generated link
  createdByName?: string;
  channelPartnerId?: string;
  channelPartnerName?: string;
  relationshipManagerId?: string | null;
  relationshipManagerName?: string | null;
  status: ApplicationStatus;
  fullName?: string | null;
  mobile?: string | null;
  email?: string | null;
  loanType?: LoanType | null;
  loanAmount?: number | null;
  monthlyIncome?: number | null;
  existingEmi?: number | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  
  // Bank Workflow fields
  bankId?: string | null;
  bankName?: string | null;
  sentToBankAt?: string | null;
  approvedAmount?: number | null;
  interestRate?: number | null;
  tenureMonths?: number | null;
  approvedAt?: string | null;
  
  // Customer Acceptance
  customerAcceptedAt?: string | null;
  acceptanceLetterRef?: string | null;
  
  // Final Disbursement
  disbursedAmount?: number | null;
  disbursedAt?: string | null;
  
  // Commission info
  commissionAmount?: number | null;
  commissionStatus?: 'PENDING' | 'PAID' | 'CLAWBACK' | null;

  createdAt: string;
  submittedAt?: string | null;
  updatedAt?: string | null;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  category: DocumentCategory;
  label: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface StatusHistoryItem {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  note?: string | null;
  changedById?: string | null;
  changedByName?: string | null;
  changedAt: string;
}

export interface PipelineStats {
  total: number;
  linkShared: number;
  documentsIn: number;
  sentToBank: number;
  documentsRequired: number;
  approved: number;
  customerAccepted: number;
  disbursed: number;
  rejected: number;
}

export interface EmailLog {
  id: string;
  tenantId?: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  status: 'SENT' | 'FAILED' | 'SMTP_NOT_CONFIGURED';
  errorMessage?: string | null;
  messageId?: string | null;
  createdAt: string;
}

export * from './policy';


