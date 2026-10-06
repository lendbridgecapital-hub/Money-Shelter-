import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { listBankPolicyCards } from '@/lib/repos/policyCardsRepo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') || 'default';
    const cards = listBankPolicyCards(tenantId);

    // 1. Bank Policies Summary
    const summaryData = cards.map((c, index) => {
      const allowedIncome = Array.isArray(c.allowedIncomeTypes)
        ? c.allowedIncomeTypes.join(', ')
        : String(c.allowedIncomeTypes || '');

      return {
        'Sr No': index + 1,
        'Card ID': c.id,
        'Bank Name': c.bankName,
        'Bank Code': c.bankCode,
        'Loan Type': c.loanType,
        'Base Interest Rate (% p.a.)': c.baseInterestRate,
        'Max FOIR (%)': c.maxFoirPct,
        'Min CIBIL': c.minCibil,
        'Max CIBIL': c.maxCibil,
        'Min Monthly Income (₹)': c.minMonthlyIncome,
        'Min Tenure (Months)': c.minTenureMonths,
        'Max Tenure (Months)': c.maxTenureMonths,
        'Max Tenure (Years)': (c.maxTenureMonths / 12).toFixed(1),
        'Min Loan Amount (₹)': c.minLoanAmount,
        'Max Loan Amount (₹)': c.maxLoanAmount,
        'Processing Fee (%)': c.processingFeePct !== null && c.processingFeePct !== undefined ? `${c.processingFeePct}%` : 'N/A',
        'Processing Fee Flat (₹)': c.processingFeeFlat || 0,
        'Turnaround Time (Days)': c.tatDays || 3,
        'Allowed Income Types': allowedIncome,
        'Priority Weight': c.priorityWeight || 0,
        'Status': c.active ? 'ACTIVE' : 'INACTIVE',
        'Created At': c.createdAt,
        'Last Updated': c.updatedAt || c.createdAt
      };
    });

    // 2. Dynamic Rules & Eligibility
    const criteriaData = cards.map((c, index) => {
      const dc: Record<string, any> = c.dynamicCriteria || {};
      const features: string[] = Array.isArray(c.specialFeatures) ? c.specialFeatures : [];

      return {
        'Sr No': index + 1,
        'Bank Name': c.bankName,
        'Bank Code': c.bankCode,
        'Loan Type': c.loanType,
        'Min Age (Years)': dc.minAge || 'N/A',
        'Max Age (Years)': dc.maxAge || 'N/A',
        'Min Work Experience (Months)': dc.minWorkExperienceMonths || 'N/A',
        'Min Business Vintage (Months)': dc.minBusinessVintageMonths || 'N/A',
        'Allowed Company Categories': Array.isArray(dc.allowedCompanyCategories) ? dc.allowedCompanyCategories.join(', ') : 'All',
        'Allowed Salary Modes': Array.isArray(dc.allowedSalaryModes) ? dc.allowedSalaryModes.join(', ') : 'Any',
        'Location Tiers': Array.isArray(dc.locationTiers) ? dc.locationTiers.join(', ') : 'All',
        'Max FOIR Tier Override (%)': c.maxFoirPct,
        'Special Features & USPs': features.join(' | ')
      };
    });

    // 3. Tiered Rate Matrix (Risk Bands)
    const rateMatrixRows: Record<string, any>[] = [];
    cards.forEach((c) => {
      const matrix = Array.isArray(c.rateMatrix) ? c.rateMatrix : [];
      if (matrix.length === 0) {
        rateMatrixRows.push({
          'Bank Name': c.bankName,
          'Bank Code': c.bankCode,
          'Loan Type': c.loanType,
          'Tier Description': 'Default Base Rate',
          'Min CIBIL': c.minCibil,
          'Max CIBIL': c.maxCibil,
          'Interest Rate (% p.a.)': c.baseInterestRate,
          'Max FOIR (%)': c.maxFoirPct,
          'Processing Fee (%)': c.processingFeePct || 0,
          'Min Loan Amount (₹)': c.minLoanAmount,
          'Max Loan Amount (₹)': c.maxLoanAmount
        });
      } else {
        matrix.forEach((tier, tIdx) => {
          rateMatrixRows.push({
            'Bank Name': c.bankName,
            'Bank Code': c.bankCode,
            'Loan Type': c.loanType,
            'Tier Description': tier.description || `Tier ${tIdx + 1}`,
            'Min CIBIL': tier.cibilMin ?? c.minCibil,
            'Max CIBIL': tier.cibilMax ?? c.maxCibil,
            'Interest Rate (% p.a.)': tier.interestRate ?? c.baseInterestRate,
            'Max FOIR (%)': tier.maxFoirPct ?? c.maxFoirPct,
            'Processing Fee (%)': tier.processingFeePct ?? c.processingFeePct ?? 0,
            'Min Loan Amount (₹)': tier.loanAmountMin ?? c.minLoanAmount,
            'Max Loan Amount (₹)': tier.loanAmountMax ?? c.maxLoanAmount
          });
        });
      }
    });

    // Build Workbook
    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Bank Policies Summary');

    const wsCriteria = XLSX.utils.json_to_sheet(criteriaData);
    XLSX.utils.book_append_sheet(wb, wsCriteria, 'Eligibility & Dynamic Rules');

    const wsMatrix = XLSX.utils.json_to_sheet(rateMatrixRows);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'CIBIL Rate Matrix');

    [wsSummary, wsCriteria, wsMatrix].forEach((ws) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      const colWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        colWidths.push({ wch: 22 });
      }
      ws['!cols'] = colWidths;
    });

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Quickfinsure_Bank_Policy_Cards.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('[ExportPolicyCardsAPI] Failed to export Excel:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
