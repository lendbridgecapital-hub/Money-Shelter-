export interface FinancialInstitution {
  name: string;
  category: 'PUBLIC_BANK' | 'PRIVATE_BANK' | 'SMALL_FINANCE_BANK' | 'NBFC_HFC';
  code: string;
}

export const STANDARD_LOAN_PRODUCTS = [
  'Home Loan',
  'Personal Loan',
  'Business Loan',
  'Education Loan',
  'Balance Transfer',
  'Property Loan',
] as const;

export const INDIAN_BANKS_AND_NBFCS: FinancialInstitution[] = [
  // --- Public Sector Banks ---
  { name: 'State Bank of India (SBI)', code: 'SBI', category: 'PUBLIC_BANK' },
  { name: 'Punjab National Bank (PNB)', code: 'PNB', category: 'PUBLIC_BANK' },
  { name: 'Bank of Baroda', code: 'BOB', category: 'PUBLIC_BANK' },
  { name: 'Canara Bank', code: 'CANARA', category: 'PUBLIC_BANK' },
  { name: 'Union Bank of India', code: 'UBI', category: 'PUBLIC_BANK' },
  { name: 'Bank of India', code: 'BOI', category: 'PUBLIC_BANK' },
  { name: 'Indian Bank', code: 'INDIAN', category: 'PUBLIC_BANK' },
  { name: 'Central Bank of India', code: 'CBI', category: 'PUBLIC_BANK' },
  { name: 'Indian Overseas Bank', code: 'IOB', category: 'PUBLIC_BANK' },
  { name: 'UCO Bank', code: 'UCO', category: 'PUBLIC_BANK' },
  { name: 'Bank of Maharashtra', code: 'BOM', category: 'PUBLIC_BANK' },
  { name: 'Punjab & Sind Bank', code: 'PSB', category: 'PUBLIC_BANK' },

  // --- Private Sector Banks ---
  { name: 'HDFC Bank', code: 'HDFC', category: 'PRIVATE_BANK' },
  { name: 'ICICI Bank', code: 'ICICI', category: 'PRIVATE_BANK' },
  { name: 'Axis Bank', code: 'AXIS', category: 'PRIVATE_BANK' },
  { name: 'Kotak Mahindra Bank', code: 'KOTAK', category: 'PRIVATE_BANK' },
  { name: 'IndusInd Bank', code: 'INDUSIND', category: 'PRIVATE_BANK' },
  { name: 'Yes Bank', code: 'YES', category: 'PRIVATE_BANK' },
  { name: 'IDFC FIRST Bank', code: 'IDFC', category: 'PRIVATE_BANK' },
  { name: 'Federal Bank', code: 'FEDERAL', category: 'PRIVATE_BANK' },
  { name: 'South Indian Bank', code: 'SIB', category: 'PRIVATE_BANK' },
  { name: 'RBL Bank', code: 'RBL', category: 'PRIVATE_BANK' },
  { name: 'Bandhan Bank', code: 'BANDHAN', category: 'PRIVATE_BANK' },
  { name: 'City Union Bank', code: 'CUB', category: 'PRIVATE_BANK' },
  { name: 'Karur Vysya Bank', code: 'KVB', category: 'PRIVATE_BANK' },
  { name: 'Tamilnad Mercantile Bank', code: 'TMB', category: 'PRIVATE_BANK' },
  { name: 'CSB Bank', code: 'CSB', category: 'PRIVATE_BANK' },
  { name: 'DCB Bank', code: 'DCB', category: 'PRIVATE_BANK' },

  // --- Small Finance Banks ---
  { name: 'AU Small Finance Bank', code: 'AU_SFB', category: 'SMALL_FINANCE_BANK' },
  { name: 'Equitas Small Finance Bank', code: 'EQUITAS_SFB', category: 'SMALL_FINANCE_BANK' },
  { name: 'Ujjivan Small Finance Bank', code: 'UJJIVAN_SFB', category: 'SMALL_FINANCE_BANK' },
  { name: 'Jana Small Finance Bank', code: 'JANA_SFB', category: 'SMALL_FINANCE_BANK' },
  { name: 'Capital Small Finance Bank', code: 'CAPITAL_SFB', category: 'SMALL_FINANCE_BANK' },

  // --- Top NBFCs & Housing Finance Companies (HFCs) ---
  { name: 'Bajaj Finance', code: 'BAJAJ_FIN', category: 'NBFC_HFC' },
  { name: 'Tata Capital', code: 'TATA_CAP', category: 'NBFC_HFC' },
  { name: 'Aditya Birla Finance', code: 'ABFL', category: 'NBFC_HFC' },
  { name: 'L&T Finance', code: 'LT_FIN', category: 'NBFC_HFC' },
  { name: 'Poonawalla Fincorp', code: 'POONAWALLA', category: 'NBFC_HFC' },
  { name: 'Piramal Capital & Housing Finance', code: 'PIRAMAL', category: 'NBFC_HFC' },
  { name: 'Cholamandalam Investment & Finance', code: 'CHOLA', category: 'NBFC_HFC' },
  { name: 'Shriram Finance', code: 'SHRIRAM', category: 'NBFC_HFC' },
  { name: 'HDB Financial Services', code: 'HDB_FS', category: 'NBFC_HFC' },
  { name: 'Muthoot Finance', code: 'MUTHOOT', category: 'NBFC_HFC' },
  { name: 'Hero FinCorp', code: 'HERO_FIN', category: 'NBFC_HFC' },
  { name: 'Godrej Capital', code: 'GODREJ_CAP', category: 'NBFC_HFC' },
  { name: 'PNB Housing Finance', code: 'PNB_HF', category: 'NBFC_HFC' },
  { name: 'LIC Housing Finance', code: 'LIC_HF', category: 'NBFC_HFC' },
  { name: 'Can Fin Homes', code: 'CANFIN', category: 'NBFC_HFC' },
  { name: 'Aadhar Housing Finance', code: 'AADHAR_HF', category: 'NBFC_HFC' },
  { name: 'Home First Finance Company', code: 'HOME_FIRST', category: 'NBFC_HFC' },
  { name: 'Indiabulls Housing Finance', code: 'IBULLS_HF', category: 'NBFC_HFC' },
  { name: 'SMFG India Credit (Fullerton)', code: 'SMFG_INDIA', category: 'NBFC_HFC' },
  { name: 'InCred Financial Services', code: 'INCRED', category: 'NBFC_HFC' },
  { name: 'Mahindra & Mahindra Financial Services', code: 'MAHINDRA_FS', category: 'NBFC_HFC' },
  { name: 'Sundaram Finance', code: 'SUNDARAM', category: 'NBFC_HFC' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  PUBLIC_BANK: 'Public Sector Banks',
  PRIVATE_BANK: 'Private Sector Banks',
  SMALL_FINANCE_BANK: 'Small Finance Banks',
  NBFC_HFC: 'NBFCs & Housing Finance',
};
