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

export const PROPERTY_PAPER_OPTIONS = [
  'Agreement / Sale Deed',
  'Builder Project File',
  'Completion Certificate',
  'Society Registration Certificate',
  'Share Certificate',
  'Conveyance Deed',
] as const;

export function getDocumentGroupsForApplication(
  loanTypeInput?: string | null,
  incomeTypeInput?: string | null
): DocumentGroup[] {
  const loanType = (loanTypeInput || 'HOME_LOAN').toUpperCase();
  const incomeType = (incomeTypeInput || (loanType === 'BUSINESS_LOAN' ? 'SELF_EMPLOYED_BUSINESS' : 'SALARIED')).toUpperCase();

  const groups: DocumentGroup[] = [
    // 1. PAN Card
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
    // 2. Aadhaar Card
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
    // 3. Residence Proof
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
  ];

  // If Business Loan:
  if (loanType === 'BUSINESS_LOAN') {
    // 4. Photo
    groups.push({
      category: 'PHOTO',
      title: 'Applicant Photograph',
      description: 'Recent passport size color photograph of the business owner / promoter.',
      required: true,
      fields: [
        {
          name: 'applicant_photo',
          label: 'Passport Size Photo',
          helperText: 'Clear passport-style photo (JPG or PNG up to 10MB)',
          accept: 'image/*',
        },
      ],
    });

    // 5. Business Registration & Compliance (Shop Act, Udyam, GST)
    groups.push({
      category: 'SHOP_ACT',
      title: 'Shop Act Licence (Both Sides)',
      description: 'Shop Act licence / Gumasta certificate (front & back with renewal page).',
      required: true,
      fields: [
        {
          name: 'shop_act_front',
          label: 'Shop Act Licence (Front Side)',
          helperText: 'Valid Shop Act / Municipal Trade Licence',
          accept: '.pdf,image/*',
        },
        {
          name: 'shop_act_back',
          label: 'Shop Act Licence (Back Side)',
          helperText: 'Back page showing address & endorsements',
          accept: '.pdf,image/*',
        },
      ],
    });

    groups.push({
      category: 'UDYAM_CERTIFICATE',
      title: 'Udyam Certificate',
      description: 'Government of India MSME Udyam Registration Certificate.',
      required: true,
      fields: [
        {
          name: 'udyam_certificate',
          label: 'Udyam Registration Certificate',
          helperText: 'Official Udyam Certificate PDF with QR code',
          accept: '.pdf,image/*',
        },
      ],
    });

    groups.push({
      category: 'GST_CERTIFICATE',
      title: 'GST Certificate',
      description: 'GST Registration Certificate (Form GST REG-06) and latest returns.',
      required: true,
      fields: [
        {
          name: 'gst_certificate',
          label: 'GST Registration Certificate',
          helperText: 'Form GST REG-06 (All 3 pages)',
          accept: '.pdf,image/*',
        },
        {
          name: 'gst_returns',
          label: 'Latest GST 3B / GSTR-1 Returns (Last 12 Months)',
          helperText: 'Optional but speeds up higher sanction limits',
          accept: '.pdf',
        },
      ],
    });

    // 6. Latest 3 Year ITR for Business Loan
    groups.push({
      category: 'INCOME_PROOF',
      title: 'Latest 3 Years Income Tax Returns (ITR)',
      description: 'ITR-V, Computation of Income, Balance Sheet & Profit & Loss statements for last 3 Assessment Years.',
      required: true,
      fields: [
        {
          name: 'itr_year_1',
          label: 'Latest Year ITR (Year 1) + Computation & Financials',
          helperText: 'ITR-V with Computation, P&L, Balance Sheet & Audit Report if audited',
          accept: '.pdf,image/*',
        },
        {
          name: 'itr_year_2',
          label: 'Previous Year ITR (Year 2) + Computation & Financials',
          helperText: 'ITR-V with Computation, P&L, Balance Sheet',
          accept: '.pdf,image/*',
        },
        {
          name: 'itr_year_3',
          label: '3rd Year ITR (Year 3) + Computation & Financials',
          helperText: 'ITR-V with Computation, P&L, Balance Sheet',
          accept: '.pdf,image/*',
        },
      ],
    });

    // 7. Bank Statement for Business
    groups.push({
      category: 'BANK_STATEMENT',
      title: 'Business Bank Statements',
      description: 'Last 12 months primary current / CC / OD / savings bank account statement.',
      required: true,
      fields: [
        {
          name: 'bank_statement',
          label: 'Primary Business Bank Account Statement (Last 12 Months)',
          helperText: 'Net banking PDF with clear transaction history & closing balance',
          accept: '.pdf',
        },
        {
          name: 'bank_statement_extra',
          label: 'Additional Bank Statement (Other Accounts / Co-applicant)',
          helperText: 'Optional',
          accept: '.pdf',
        },
      ],
    });
  } else if (loanType === 'LOAN_AGAINST_PROPERTY') {
    // LAP
    if (incomeType === 'SALARIED') {
      groups.push({
        category: 'INCOME_PROOF',
        title: '3 Months Salary Slips (Income Proof)',
        description: 'Last 3 months salary slips and Form 16 / appointment letter.',
        required: true,
        fields: [
          {
            name: 'salary_slip_1',
            label: 'Latest Month Salary Slip (Month 1)',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'salary_slip_2',
            label: 'Second Month Salary Slip (Month 2)',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'salary_slip_3',
            label: 'Third Month Salary Slip (Month 3)',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'form_16',
            label: 'Form 16 (Latest 1-2 Years) / Appointment Letter',
            helperText: 'Optional but speeds up sanction',
            accept: '.pdf,image/*',
          },
        ],
      });
    } else {
      // Self Employed (Business / Professional)
      groups.push({
        category: 'INCOME_PROOF',
        title: 'Latest 3 Years Income Tax Returns (ITR)',
        description: 'ITR-V with Computation of Income, Balance Sheet, and P&L statements for the last 3 assessment years.',
        required: true,
        fields: [
          {
            name: 'itr_year_1',
            label: 'Latest Year ITR (Year 1) + Computation & Financials',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'itr_year_2',
            label: 'Previous Year ITR (Year 2) + Computation & Financials',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'itr_year_3',
            label: '3rd Year ITR (Year 3) + Computation & Financials',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
        ],
      });
    }

    // Bank Statement
    groups.push({
      category: 'BANK_STATEMENT',
      title: 'Bank Account Statements',
      description: incomeType === 'SALARIED' ? 'Last 6 to 12 months salary credit bank statement.' : 'Last 12 months primary operative bank account statement.',
      required: true,
      fields: [
        {
          name: 'bank_statement',
          label: 'Primary Bank Statement (Last 6–12 Months)',
          helperText: 'Official net banking PDF format',
          accept: '.pdf',
        },
        {
          name: 'bank_statement_extra',
          label: 'Additional Bank Statement (Savings / Other Accounts)',
          helperText: 'Optional',
          accept: '.pdf',
        },
      ],
    });

    // Track record of loan (All Running Loans)
    groups.push({
      category: 'LOAN_TRACK_RECORD',
      title: 'Track Record of Loans (All Running Loans)',
      description: 'Loan Account Statement (SOA), Repayment Track Record (RTR), or sanction letters for all active ongoing loans.',
      required: false,
      fields: [
        {
          name: 'loan_track_record',
          label: 'Running Loan Account Statement (SOA) / RTR',
          helperText: 'Statement of Account showing EMI repayment track for ongoing loans (if no running loans, leave blank)',
          accept: '.pdf,image/*',
        },
        {
          name: 'loan_sanction_letters',
          label: 'Sanction Letter / Repayment Schedule',
          helperText: 'Optional additional loan repayment document',
          accept: '.pdf,image/*',
        },
      ],
    });

    // Property Papers with Dropdown
    groups.push({
      category: 'PROPERTY_PAPERS',
      title: 'Property Papers',
      description: 'Select property paper type and upload the title/ownership document.',
      required: true,
      fields: [
        {
          name: 'property_paper_file',
          label: 'Property Document Copy',
          helperText: 'Select document type from the dropdown above and upload complete document',
          accept: '.pdf,image/*',
        },
        {
          name: 'property_paper_extra',
          label: 'Additional Property Paper (Chain deed, Tax receipt, Sanction plan)',
          helperText: 'Optional supplementary title document',
          accept: '.pdf,image/*',
        },
      ],
    });
  } else if (loanType === 'BALANCE_TRANSFER') {
    // Balance Transfer Requirements
    // 1. Foreclosure Letter or Loan Repayment Statement (SOA)
    groups.push({
      category: 'FORECLOSURE_LETTER',
      title: 'Foreclosure Letter / Loan Repayment Statement',
      description: 'Latest Foreclosure Letter showing outstanding principal or complete 12-month Statement of Account (SOA) / Repayment Track from existing lender.',
      required: true,
      fields: [
        {
          name: 'foreclosure_letter',
          label: 'Foreclosure Letter / SOA Repayment Statement',
          helperText: 'Official bank foreclosure letter or 12-month loan repayment statement (PDF or image)',
          accept: '.pdf,image/*',
        },
        {
          name: 'existing_sanction_letter',
          label: 'Existing Loan Sanction Letter / Amortization Schedule',
          helperText: 'Optional copy of original sanction letter or repayment schedule',
          accept: '.pdf,image/*',
        },
      ],
    });

    // 2. Income Proof
    if (incomeType === 'SALARIED') {
      groups.push({
        category: 'INCOME_PROOF',
        title: '3 Months Salary Slips (Income Proof)',
        description: 'Last 3 months salary slips and Form 16 / appointment letter.',
        required: true,
        fields: [
          {
            name: 'salary_slip_1',
            label: 'Latest Month Salary Slip (Month 1)',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'salary_slip_2',
            label: 'Second Month Salary Slip (Month 2)',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'salary_slip_3',
            label: 'Third Month Salary Slip (Month 3)',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'form_16',
            label: 'Form 16 (Latest 1-2 Years) / Appointment Letter',
            helperText: 'Optional but speeds up sanction',
            accept: '.pdf,image/*',
          },
        ],
      });
    } else {
      groups.push({
        category: 'INCOME_PROOF',
        title: 'Latest 2-3 Years Income Tax Returns (ITR)',
        description: 'ITR-V with Computation of Income and Financials for the last 2-3 assessment years.',
        required: true,
        fields: [
          {
            name: 'itr_year_1',
            label: 'Latest Year ITR (Year 1) + Computation & Financials',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'itr_year_2',
            label: 'Previous Year ITR (Year 2) + Computation & Financials',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'itr_year_3',
            label: '3rd Year ITR (Year 3) + Computation & Financials',
            helperText: 'Optional supplementary year',
            accept: '.pdf,image/*',
          },
        ],
      });
    }

    // 3. Bank Statement
    groups.push({
      category: 'BANK_STATEMENT',
      title: 'Bank Account Statements',
      description: incomeType === 'SALARIED' ? 'Last 6 to 12 months salary credit bank statement.' : 'Last 12 months primary operative bank account statement.',
      required: true,
      fields: [
        {
          name: 'bank_statement',
          label: 'Primary Bank Statement (Last 6–12 Months)',
          helperText: 'Official net banking PDF format',
          accept: '.pdf',
        },
        {
          name: 'bank_statement_extra',
          label: 'Additional Bank Statement (Savings / Other Accounts)',
          helperText: 'Optional',
          accept: '.pdf',
        },
      ],
    });

    // 4. Property Papers (if transferring Home Loan or LAP)
    groups.push({
      category: 'PROPERTY_PAPERS',
      title: 'Property Papers / LOD from Existing Bank',
      description: 'List of Documents (LOD) held by existing bank or copy of Sale Deed / Agreement (if property backed).',
      required: false,
      fields: [
        {
          name: 'property_paper_file',
          label: 'List of Documents (LOD) / Property Paper Copy',
          helperText: 'Optional LOD certificate or property title document copy',
          accept: '.pdf,image/*',
        },
      ],
    });
  } else {
    // Other loans (Home Loan, Personal Loan, etc.)
    if (incomeType === 'SALARIED') {
      groups.push({
        category: 'INCOME_PROOF',
        title: 'Income Proof (Salaried)',
        description: 'Salary slips (last 3 months) and Form-16.',
        required: true,
        fields: [
          {
            name: 'salary_slip_1',
            label: 'Latest Month Salary Slip (Month 1)',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'salary_slip_2',
            label: 'Second Month Salary Slip (Month 2)',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'salary_slip_3',
            label: 'Third Month Salary Slip (Month 3)',
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
      });
    } else {
      groups.push({
        category: 'INCOME_PROOF',
        title: 'Income Tax Returns (ITR)',
        description: 'Latest 2-3 years ITR with Computation of Income & Financials.',
        required: true,
        fields: [
          {
            name: 'itr_year_1',
            label: 'Latest Year ITR (Year 1) + Computation',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'itr_year_2',
            label: 'Previous Year ITR (Year 2) + Computation',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
          {
            name: 'itr_year_3',
            label: '3rd Year ITR (Year 3) + Computation',
            helperText: 'PDF or image',
            accept: '.pdf,image/*',
          },
        ],
      });
    }

    groups.push({
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
    });

    if (loanType === 'HOME_LOAN') {
      groups.push({
        category: 'PROPERTY_PAPERS',
        title: 'Property Papers (if finalized)',
        description: 'Agreement to sale / Allotment letter / Title document (if property is selected).',
        required: false,
        fields: [
          {
            name: 'property_paper_file',
            label: 'Property Agreement / Allotment Letter',
            helperText: 'Optional if property is not yet finalized',
            accept: '.pdf,image/*',
          },
        ],
      });
    }
  }

  // Supporting other docs
  groups.push({
    category: 'OTHER',
    title: 'Additional Supporting Documents',
    description: 'Any extra documents requested by your loan advisor or co-applicant documents.',
    required: false,
    fields: [
      {
        name: 'other_documents',
        label: 'Other Documents',
        helperText: 'Optional supporting papers',
        accept: '.pdf,image/*',
      },
    ],
  });

  return groups;
}

export const DOCUMENT_GROUPS: DocumentGroup[] = getDocumentGroupsForApplication();
