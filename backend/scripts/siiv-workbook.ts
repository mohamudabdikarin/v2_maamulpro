import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import ExcelJS from 'exceljs';

export const SHEET_HEADERS: Record<string, string[]> = {
  Staff: ['Employee ID', 'Magaca', 'Doorka', 'Nooca', 'Qiimaha', 'Unit'],
  'Daily Attendance': ['Project', 'Employee ID', 'Magaca', 'Xirfadda', 'Bisha', 'Maalmo Shaqeeyay', 'Qiimaha/Day', 'Wadarta'],
  'Monthly Payroll': ['Employee ID', 'Magaca', 'Doorka', 'Project', 'Bisha', 'Gross Salary', 'Deduction', 'Net Salary', 'Status'],
  Subcontractors: ['Contract ID', 'Shaqada', 'Qandaraasle', 'Contract Value', 'Start', 'End', 'Advance 30%', 'Progress 30%', 'Progress 20%', 'Final 20%', 'Paid To Date', 'Status'],
  Materials: ['Material ID', 'Date', 'Alaabta', 'Unit', 'Qty', 'Unit Price', 'Total', 'Supplier', 'Payment Method'],
  'Site Expenses': ['Expense ID', 'Date', 'Faahfaahin', 'Category', 'Amount', 'Payment Method', 'Project'],
  'Cash Ledger': ['Transaction ID', 'Date', 'Nooca', 'Category', 'Faahfaahin', 'Project', 'Income', 'Expense', 'Payment Method', 'Money Destination'],
  'Budget vs Actual': ['Qaybta', 'Amount', '% Budget'],
  Progress: ['Work Package', 'Progress %', 'Status'],
  'Monthly Summary': ['Bisha', 'Daily Labor', 'Monthly Payroll', 'Subcontractors', 'Materials', 'Overhead', 'Total Spent'],
};

export const SOMALI_MONTHS: Record<string, number> = {
  Janaayo: 1,
  Febraayo: 2,
  Maarso: 3,
  Abriil: 4,
  Maajo: 5,
  Juun: 6,
  Luuliyo: 7,
  Agoosto: 8,
  Sebtembar: 9,
  Oktoobar: 10,
  Nofembar: 11,
  Diseembar: 12,
};

export const UNIT_MAP: Record<string, string> = {
  Bag: 'BAG',
  Piece: 'PIECE',
  'Truck Load': 'TRUCK_LOAD',
  Lot: 'LOT',
  'Square Meter': 'SQUARE_METER',
  Set: 'SET',
  Bucket: 'BUCKET',
};

export type WorkbookRow = Record<string, string | number | Date | null> & { __row: number };

export interface SiivWorkbook {
  sourcePath: string;
  sourceSha256: string;
  overview: Record<string, string | number | Date | null>;
  sheets: Record<string, WorkbookRow[]>;
  validation: {
    errors: string[];
    warnings: string[];
    totals: Record<string, number>;
  };
}

function cellValue(cell: ExcelJS.Cell): string | number | Date | null {
  const raw: any = cell.value;
  if (raw == null) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === 'object') {
    if ('result' in raw) return raw.result == null ? null : raw.result;
    if ('formula' in raw) return null;
    if ('text' in raw) return String(raw.text);
    if ('richText' in raw) return raw.richText.map((part: any) => part.text).join('');
  }
  return raw as string | number;
}

function textValue(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function money(value: unknown): number {
  return Math.round((numberValue(value) + Number.EPSILON) * 100) / 100;
}

function close(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

function readTable(sheet: ExcelJS.Worksheet, expectedHeaders: string[], errors: string[]): WorkbookRow[] {
  const actual = expectedHeaders.map((_, index) => textValue(cellValue(sheet.getCell(2, index + 1))));
  if (actual.join('|') !== expectedHeaders.join('|')) {
    errors.push(`${sheet.name}: headers do not match. Expected ${expectedHeaders.join(' | ')}, received ${actual.join(' | ')}`);
  }
  const rows: WorkbookRow[] = [];
  for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const first = cellValue(sheet.getCell(rowNumber, 1));
    if (first == null || textValue(first) === '') continue;
    const row: WorkbookRow = { __row: rowNumber };
    expectedHeaders.forEach((header, index) => {
      row[header] = cellValue(sheet.getCell(rowNumber, index + 1));
    });
    rows.push(row);
  }
  return rows;
}

function uniqueIds(rows: WorkbookRow[], sheet: string, column: string, errors: string[]) {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = textValue(row[column]);
    if (!value) errors.push(`${sheet} row ${row.__row}: ${column} is required`);
    else if (seen.has(value)) errors.push(`${sheet} row ${row.__row}: duplicate ${column} ${value}`);
    seen.add(value);
  }
}

export function parseSomaliMonth(value: unknown): { year: number; month: number; key: string } {
  const [name, rawYear] = textValue(value).split(/\s+/);
  const month = SOMALI_MONTHS[name];
  const year = Number(rawYear);
  if (!month || !Number.isInteger(year)) throw new Error(`Unsupported Somali month '${textValue(value)}'`);
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
}

export function sourceDate(value: unknown): Date {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  if (typeof value === 'number') {
    const utc = Date.UTC(1899, 11, 30) + value * 86_400_000;
    return new Date(utc);
  }
  const parsed = new Date(`${textValue(value)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid source date '${textValue(value)}'`);
  return parsed;
}

export function monthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0));
}

export function sourceText(value: unknown): string {
  return textValue(value);
}

export function sourceNumber(value: unknown): number {
  return numberValue(value);
}

export async function readSiivWorkbook(sourcePath: string): Promise<SiivWorkbook> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(sourcePath);

  const expectedSheets = ['Project Overview', ...Object.keys(SHEET_HEADERS)];
  const actualSheets = workbook.worksheets.map((sheet) => sheet.name);
  for (const name of expectedSheets) {
    if (!actualSheets.includes(name)) errors.push(`Missing required sheet '${name}'`);
  }
  for (const name of actualSheets) {
    if (!expectedSheets.includes(name)) warnings.push(`Unmapped extra sheet '${name}'`);
  }

  const overviewSheet = workbook.getWorksheet('Project Overview');
  const overview: Record<string, string | number | Date | null> = {};
  if (overviewSheet) {
    for (let row = 2; row <= overviewSheet.rowCount; row += 1) {
      const key = textValue(cellValue(overviewSheet.getCell(row, 1)));
      if (key) overview[key] = cellValue(overviewSheet.getCell(row, 2));
    }
  }

  const sheets: Record<string, WorkbookRow[]> = {};
  for (const [name, headers] of Object.entries(SHEET_HEADERS)) {
    const sheet = workbook.getWorksheet(name);
    sheets[name] = sheet ? readTable(sheet, headers, errors) : [];
  }
  const monthlySheet = workbook.getWorksheet('Monthly Summary');
  if (monthlySheet) {
    for (let row = 3; row <= 8; row += 1) {
      const formula = (monthlySheet.getCell(row, 7).value as any)?.formula;
      if (formula !== `SUM(B${row}:F${row})`) errors.push(`Monthly Summary row ${row}: Total Spent formula must be SUM(B${row}:F${row})`);
    }
  }

  uniqueIds(sheets.Staff, 'Staff', 'Employee ID', errors);
  uniqueIds(sheets.Subcontractors, 'Subcontractors', 'Contract ID', errors);
  uniqueIds(sheets.Materials, 'Materials', 'Material ID', errors);
  uniqueIds(sheets['Site Expenses'], 'Site Expenses', 'Expense ID', errors);
  uniqueIds(sheets['Cash Ledger'], 'Cash Ledger', 'Transaction ID', errors);

  const staffIds = new Set(sheets.Staff.map((row) => textValue(row['Employee ID'])));
  const projectId = 'PRJ-001';
  for (const row of [...sheets['Daily Attendance'], ...sheets['Monthly Payroll']]) {
    if (!staffIds.has(textValue(row['Employee ID']))) {
      errors.push(`Row ${row.__row}: unknown Employee ID ${textValue(row['Employee ID'])}`);
    }
  }
  for (const [sheetName, column] of [['Daily Attendance', 'Project'], ['Monthly Payroll', 'Project'], ['Site Expenses', 'Project'], ['Cash Ledger', 'Project']] as const) {
    for (const row of sheets[sheetName]) {
      if (textValue(row[column]) !== projectId) errors.push(`${sheetName} row ${row.__row}: unsupported project ${textValue(row[column])}`);
    }
  }

  for (const row of sheets['Daily Attendance']) {
    const expected = money(numberValue(row['Maalmo Shaqeeyay']) * numberValue(row['Qiimaha/Day']));
    if (!close(expected, money(row.Wadarta))) errors.push(`Daily Attendance row ${row.__row}: days x rate does not equal Wadarta`);
    try { parseSomaliMonth(row.Bisha); } catch (error) { errors.push(`Daily Attendance row ${row.__row}: ${(error as Error).message}`); }
  }
  for (const row of sheets['Monthly Payroll']) {
    if (!close(money(row['Gross Salary']) - money(row.Deduction), money(row['Net Salary']))) {
      errors.push(`Monthly Payroll row ${row.__row}: gross - deduction does not equal net`);
    }
    if (textValue(row.Status) !== 'La bixiyay') errors.push(`Monthly Payroll row ${row.__row}: unsupported status ${textValue(row.Status)}`);
    try { parseSomaliMonth(row.Bisha); } catch (error) { errors.push(`Monthly Payroll row ${row.__row}: ${(error as Error).message}`); }
  }
  for (const row of sheets.Materials) {
    if (!UNIT_MAP[textValue(row.Unit)]) errors.push(`Materials row ${row.__row}: unsupported unit ${textValue(row.Unit)}`);
    const calculated = money(numberValue(row.Qty) * numberValue(row['Unit Price']));
    const stated = money(row.Total);
    if (!close(calculated, stated)) {
      warnings.push(`Materials ${textValue(row['Material ID'])}: Qty x Unit Price is ${calculated.toFixed(2)}, stated Total is ${stated.toFixed(2)}; both will be preserved and stated Total will drive finance`);
    }
  }

  const dailyLabor = money(sheets['Daily Attendance'].reduce((sum, row) => sum + numberValue(row.Wadarta), 0));
  const monthlyPayroll = money(sheets['Monthly Payroll'].reduce((sum, row) => sum + numberValue(row['Net Salary']), 0));
  const subcontractors = money(sheets.Subcontractors.reduce((sum, row) => sum + numberValue(row['Paid To Date']), 0));
  const materials = money(sheets.Materials.reduce((sum, row) => sum + numberValue(row.Total), 0));
  const siteExpenses = money(sheets['Site Expenses'].reduce((sum, row) => sum + numberValue(row.Amount), 0));
  const detailedExpenses = money(dailyLabor + monthlyPayroll + subcontractors + materials + siteExpenses);
  const funding = money(sheets['Cash Ledger'].slice(0, 4).reduce((sum, row) => sum + numberValue(row.Income), 0));
  const monthlySummary = money(sheets['Monthly Summary'].reduce((sum, row) => sum
    + numberValue(row['Daily Labor'])
    + numberValue(row['Monthly Payroll'])
    + numberValue(row.Subcontractors)
    + numberValue(row.Materials)
    + numberValue(row.Overhead), 0));
  const reportedActual = money(overview['Actual Spent']);

  if (!close(reportedActual, detailedExpenses)) {
    warnings.push(`Project Overview Actual Spent ${reportedActual.toFixed(2)} differs from detailed source total ${detailedExpenses.toFixed(2)} by ${(reportedActual - detailedExpenses).toFixed(2)}`);
  }
  if (!close(monthlySummary, detailedExpenses)) {
    warnings.push(`Monthly Summary total ${monthlySummary.toFixed(2)} differs from detailed source total ${detailedExpenses.toFixed(2)} by ${(monthlySummary - detailedExpenses).toFixed(2)}`);
  }
  warnings.push('Cash Ledger TXN-005 through TXN-024 are derived rollups or duplicate source details; they are verification-only and will not be inserted again');
  warnings.push('Payroll payment dates are absent; month-end dates will be recorded as explicit import inferences');
  warnings.push('Most subcontractor milestone dates are absent; proportional contract dates will be recorded as explicit import inferences');

  return {
    sourcePath,
    sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'),
    overview,
    sheets,
    validation: {
      errors,
      warnings,
      totals: { dailyLabor, monthlyPayroll, subcontractors, materials, siteExpenses, detailedExpenses, funding, monthlySummary, reportedActual },
    },
  };
}
