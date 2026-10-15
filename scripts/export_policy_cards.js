const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Load database
const dbPath = path.join(__dirname, '..', 'data', 'app-portable.json');
const rawData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const cards = rawData.bank_policy_cards || [];

console.log(`Found ${cards.length} policy cards.`);

// Sheet 1: Summary Overview
const summaryData = cards.map((c, index) => {
  const allowedIncome = Array.isArray(c.allowed_income_types)
    ? c.allowed_income_types.join(', ')
    : typeof c.allowed_income_types === 'string'
      ? JSON.parse(c.allowed_income_types || '[]').join(', ')
      : '';

  return {
    'Sr No': index + 1,
    'Card ID': c.id,
    'Bank Name': c.bank_name,
    'Bank Code': c.bank_code,
    'Loan Type': c.loan_type,
    'Base Interest Rate (% p.a.)': c.base_interest_rate,
    'Max FOIR (%)': c.max_foir_pct,
    'Min CIBIL': c.min_cibil,
    'Max CIBIL': c.max_cibil,
    'Min Monthly Income (₹)': c.min_monthly_income,
    'Min Tenure (Months)': c.min_tenure_months,
    'Max Tenure (Months)': c.max_tenure_months,
    'Max Tenure (Years)': (c.max_tenure_months / 12).toFixed(1),
    'Min Loan Amount (₹)': c.min_loan_amount,
    'Max Loan Amount (₹)': c.max_loan_amount,
    'Processing Fee (%)': c.processing_fee_pct !== null && c.processing_fee_pct !== undefined ? `${c.processing_fee_pct}%` : 'N/A',
    'Processing Fee Flat (₹)': c.processing_fee_flat || 0,
    'Turnaround Time (Days)': c.tat_days || 3,
    'Allowed Income Types': allowedIncome,
    'Priority Weight': c.priority_weight || 0,
    'Status': c.active ? 'ACTIVE' : 'INACTIVE',
    'Created At': c.created_at,
    'Last Updated': c.updated_at
  };
});

// Sheet 2: Dynamic Criteria & Operational Rules
const criteriaData = cards.map((c, index) => {
  let dc = {};
  try {
    dc = typeof c.dynamic_criteria === 'string' ? JSON.parse(c.dynamic_criteria) : (c.dynamic_criteria || {});
  } catch (e) {
    dc = {};
  }

  let features = [];
  try {
    features = typeof c.special_features === 'string' ? JSON.parse(c.special_features) : (c.special_features || []);
  } catch (e) {
    features = [];
  }

  return {
    'Sr No': index + 1,
    'Bank Name': c.bank_name,
    'Bank Code': c.bank_code,
    'Loan Type': c.loan_type,
    'Min Age (Years)': dc.minAge || 'N/A',
    'Max Age (Years)': dc.maxAge || 'N/A',
    'Min Work Experience (Months)': dc.minWorkExperienceMonths || 'N/A',
    'Min Business Vintage (Months)': dc.minBusinessVintageMonths || 'N/A',
    'Allowed Company Categories': Array.isArray(dc.allowedCompanyCategories) ? dc.allowedCompanyCategories.join(', ') : 'All',
    'Allowed Salary Modes': Array.isArray(dc.allowedSalaryModes) ? dc.allowedSalaryModes.join(', ') : 'Any',
    'Location Tiers': Array.isArray(dc.locationTiers) ? dc.locationTiers.join(', ') : 'All',
    'Max FOIR Tier Override (%)': c.max_foir_pct,
    'Special Features & USPs': features.join(' | ')
  };
});

// Sheet 3: Tiered Rate Matrix (Risk Bands)
const rateMatrixRows = [];
cards.forEach((c) => {
  let matrix = [];
  try {
    matrix = typeof c.rate_matrix === 'string' ? JSON.parse(c.rate_matrix) : (c.rate_matrix || []);
  } catch (e) {
    matrix = [];
  }

  if (matrix.length === 0) {
    rateMatrixRows.push({
      'Bank Name': c.bank_name,
      'Bank Code': c.bank_code,
      'Loan Type': c.loan_type,
      'Tier Description': 'Default Base Rate',
      'Min CIBIL': c.min_cibil,
      'Max CIBIL': c.max_cibil,
      'Interest Rate (% p.a.)': c.base_interest_rate,
      'Max FOIR (%)': c.max_foir_pct,
      'Processing Fee (%)': c.processing_fee_pct || 0,
      'Min Loan Amount (₹)': c.min_loan_amount,
      'Max Loan Amount (₹)': c.max_loan_amount
    });
  } else {
    matrix.forEach((tier, tIdx) => {
      rateMatrixRows.push({
        'Bank Name': c.bank_name,
        'Bank Code': c.bank_code,
        'Loan Type': c.loan_type,
        'Tier Description': tier.description || `Tier ${tIdx + 1}`,
        'Min CIBIL': tier.cibilMin ?? c.min_cibil,
        'Max CIBIL': tier.cibilMax ?? c.max_cibil,
        'Interest Rate (% p.a.)': tier.interestRate ?? c.base_interest_rate,
        'Max FOIR (%)': tier.maxFoirPct ?? c.max_foir_pct,
        'Processing Fee (%)': tier.processingFeePct ?? c.processing_fee_pct ?? 0,
        'Min Loan Amount (₹)': tier.loanAmountMin ?? c.min_loan_amount,
        'Max Loan Amount (₹)': tier.loanAmountMax ?? c.max_loan_amount
      });
    });
  }
});

// Create Workbook
const wb = XLSX.utils.book_new();

// Sheet 1: Bank Policy Overview
const wsSummary = XLSX.utils.json_to_sheet(summaryData);
XLSX.utils.book_append_sheet(wb, wsSummary, 'Bank Policies Summary');

// Sheet 2: Eligibility & Dynamic Rules
const wsCriteria = XLSX.utils.json_to_sheet(criteriaData);
XLSX.utils.book_append_sheet(wb, wsCriteria, 'Eligibility & Dynamic Rules');

// Sheet 3: Tiered Rate Matrix
const wsMatrix = XLSX.utils.json_to_sheet(rateMatrixRows);
XLSX.utils.book_append_sheet(wb, wsMatrix, 'CIBIL Rate Matrix');

// Format column widths for readability
[wsSummary, wsCriteria, wsMatrix].forEach((ws) => {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const colWidths = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    colWidths.push({ wch: 22 });
  }
  ws['!cols'] = colWidths;
});

// Export destinations
const rootExportPath = path.join(__dirname, '..', 'Money_Shelter_Bank_Policy_Cards.xlsx');
const publicDir = path.join(__dirname, '..', 'public', 'downloads');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const publicExportPath = path.join(publicDir, 'Money_Shelter_Bank_Policy_Cards.xlsx');

// Write Excel files
XLSX.writeFile(wb, rootExportPath);
XLSX.writeFile(wb, publicExportPath);

// Also generate CSV for direct compatibility
const csvPath = path.join(__dirname, '..', 'Money_Shelter_Bank_Policy_Cards.csv');
const csvContent = XLSX.utils.sheet_to_csv(wsSummary);
fs.writeFileSync(csvPath, csvContent, 'utf8');

console.log(`Excel files generated successfully:`);
console.log(`1. Root: ${rootExportPath}`);
console.log(`2. Public Download: ${publicExportPath}`);
console.log(`3. CSV: ${csvPath}`);
