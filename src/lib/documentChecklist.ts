import type { DocumentCategory } from '@/types/db';

export interface DocumentField {
  name: string;
  label: string;
  helperText?: string;
  accept?: string;
}

export interface DocumentGroup {
  category: DocumentCategory;
  title: string;
  description: string;
  required: boolean;
  fields: DocumentField[];
}

export const RESIDENCE_PROOF_OPTIONS = [
  'Passport',
  'Electricity Bill (latest month)',
  'Telephone / Landline Bill',
  'Postpaid Mobile Bill',
  'Driving License',
  'Ration Card',
  'Registered Rent Agreement (with owner latest electricity bill)',
  'Voter ID Card',
];

export const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    category: 'PAN_CARD',
    title: 'PAN Card',
    description: 'Clear photograph or scanned copy of applicant PAN Card (Mandatory).',
    required: true,
    fields: [
      {
        name: 'pan_card',
        label: 'PAN Card Copy',
        helperText: 'PDF, JPG, or PNG up to 10MB',
        accept: '.pdf,image/*',
      },
    ],
  },
  {
    category: 'AADHAAR_CARD',
    title: 'Aadhaar Card',
    description: 'Aadhaar Card (front & back, or full e-Aadhaar PDF with password if any).',
    required: true,
    fields: [
      {
        name: 'aadhaar_card',
        label: 'Aadhaar Card (Front / Full)',
        helperText: 'PDF, JPG, or PNG up to 10MB',
        accept: '.pdf,image/*',
      },
      {
        name: 'aadhaar_card_back',
        label: 'Aadhaar Card Back (optional if front includes address)',
        helperText: 'PDF, JPG, or PNG up to 10MB',
        accept: '.pdf,image/*',
      },
    ],
  },
  {
    category: 'RESIDENCE_PROOF',
    title: 'Current Residence Proof',
    description: 'Select your proof type and upload the document.',
    required: true,
    fields: [
      {
        name: 'residence_proof_file',
        label: 'Residence Proof Document',
        helperText: 'Must match current residing address',
        accept: '.pdf,image/*',
      },
    ],
  },
  {
    category: 'INCOME_PROOF',
    title: 'Income Proof',
    description: 'Salary slips (last 3 months), Form-16, or ITR for self-employed.',
    required: true,
    fields: [
      {
        name: 'salary_slip_1',
        label: 'Latest Month Salary Slip / ITR',
        helperText: 'PDF or image',
        accept: '.pdf,image/*',
      },
      {
        name: 'salary_slip_2',
        label: 'Second Month Salary Slip',
        helperText: 'PDF or image',
        accept: '.pdf,image/*',
      },
      {
        name: 'salary_slip_3',
        label: 'Third Month Salary Slip',
        helperText: 'PDF or image',
        accept: '.pdf,image/*',
      },
      {
        name: 'form_16',
        label: 'Form-16 (Latest 1-2 years) / Appointment Letter',
        helperText: 'Optional but speeds up approval',
        accept: '.pdf,image/*',
      },
    ],
  },
  {
    category: 'BANK_STATEMENT',
    title: 'Bank Statements & Financials',
    description: 'Last 6 to 12 months bank statement for primary salary/business account.',
    required: true,
    fields: [
      {
        name: 'bank_statement',
        label: 'Primary Bank Account Statement',
        helperText: 'PDF format downloaded from net banking with clear transactions',
        accept: '.pdf',
      },
      {
        name: 'bank_statement_extra',
        label: 'Additional Bank Statement (Co-applicant / Savings)',
        helperText: 'Optional',
        accept: '.pdf',
      },
    ],
  },
  {
    category: 'OTHER',
    title: 'Additional Supporting Documents',
    description: 'Property documents, loan sanction letters, or co-applicant documents (if applicable).',
    required: false,
    fields: [
      {
        name: 'other_documents',
        label: 'Other Documents',
        helperText: 'Any extra documents requested by loan advisor',
        accept: '.pdf,image/*',
      },
    ],
  },
];
