import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CentralPrismaService } from '../src/common/database/central-prisma.service';
import { revealDatabaseUrl } from '../src/common/database/database-credentials';
import { TenantConnectionManager } from '../src/common/database/tenant-connection.manager';
import { TenantProvisioningService } from '../src/common/database/tenant-provisioning.service';
import { SubscriptionEntitlementService } from '../src/common/subscriptions/subscription-entitlement.service';
import { AccountMappingsService } from '../src/modules/accounting/account-mappings.service';
import { AccountingService } from '../src/modules/accounting/accounting.service';
import { ConstructionService } from '../src/modules/construction/construction.service';
import {
  ConstructionMaterialDto,
  ContractPaymentDto,
  DailyExpenseDto,
  InventoryMovementDto,
  ProjectDto,
  TaskDto,
  WorkforceContractDto,
} from '../src/modules/construction/dto/construction.dto';
import { FinancialsService } from '../src/modules/financials/financials.service';
import { AccountDto, CreateTransactionDto } from '../src/modules/financials/dto/financials.dto';
import { MaterialManagementService } from '../src/modules/material-management/material-management.service';
import { PayrollService } from '../src/modules/payroll/payroll.service';
import { SavePayrollDto } from '../src/modules/payroll/dto/payroll.dto';
import { ReportsService } from '../src/modules/reports/reports.service';
import { StaffService } from '../src/modules/staff/staff.service';
import { CreateStaffDto } from '../src/modules/staff/dto/staff.dto';
import {
  monthEnd,
  parseSomaliMonth,
  readSiivWorkbook,
  SiivWorkbook,
  sourceDate,
  sourceNumber,
  sourceText,
  UNIT_MAP,
  WorkbookRow,
} from './siiv-workbook';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

type Status = 'success' | 'skipped' | 'failed' | 'warning' | 'verified';
type Event = { at: string; stage: string; sheet: string; sourceId?: string; status: Status; message: string };

const SOURCE = 'siiv-apartments-v1';
const args = new Set(process.argv.slice(2));
const option = (name: string, fallback?: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const sourcePath = path.resolve(option('--source', path.join(__dirname, '..', '..', 'Siiv_Apartments_MaamulPro_Test_Data.xlsx'))!);
const databaseName = option('--database', 'tenant_hiiraan')!;
const validateOnly = args.has('--validate-only');
const preflightOnly = args.has('--preflight-only');
const execute = args.has('--execute');
const applySchema = args.has('--apply-schema');

const events: Event[] = [];
const record = (stage: string, sheet: string, status: Status, message: string, sourceId?: string) => {
  const event = { at: new Date().toISOString(), stage, sheet, sourceId, status, message };
  events.push(event);
  console.log(JSON.stringify(event));
};

function sourceMarker(id: string) {
  return `[source:${SOURCE}:${id}]`;
}

function asJson(value: unknown) {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item));
}

function validateDto<T extends object>(type: new () => T, data: object, label: string): T {
  const dto = plainToInstance(type, data);
  const errors = validateSync(dto as object, { whitelist: false, forbidUnknownValues: false });
  if (errors.length) {
    const details = errors.flatMap((error) => Object.values(error.constraints || {})).join('; ');
    throw new Error(`${label}: ${details}`);
  }
  return dto;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts.shift() || fullName, lastName: parts.join(' ') || '-' };
}

function cents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function inferredMilestoneDate(start: Date, end: Date, fraction: number) {
  return new Date(start.getTime() + Math.round((end.getTime() - start.getTime()) * fraction));
}

async function writeResult(payload: object) {
  const directory = path.join(__dirname, '..', 'import-results');
  fs.mkdirSync(directory, { recursive: true });
  const reportPath = path.join(directory, `siiv-apartments-${databaseName}.json`);
  const jsonlPath = path.join(directory, `siiv-apartments-${databaseName}.jsonl`);
  fs.writeFileSync(reportPath, `${JSON.stringify(asJson(payload), null, 2)}\n`, 'utf8');
  fs.writeFileSync(jsonlPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`, 'utf8');
  return { reportPath, jsonlPath };
}

async function locateCompany(central: any) {
  const companies = await central.company.findMany({
    select: {
      id: true,
      name: true,
      subdomain: true,
      status: true,
      subscriptionStatus: true,
      constructionEnabled: true,
      dbUrl: true,
    },
  });
  for (const company of companies) {
    const databaseUrl = revealDatabaseUrl(company.dbUrl);
    const routedName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\/+/, ''));
    if (routedName === databaseName) return { company, databaseUrl };
  }
  throw new Error(`No company is routed to database '${databaseName}'`);
}

async function preflightDb(db: any, company: any) {
  if (company.status !== 'ACTIVE') throw new Error(`Company is ${company.status}, not ACTIVE`);
  if (!company.constructionEnabled) throw new Error('Construction module is disabled for the target company');
  const owner = await db.user.findFirst({
    where: { deletedAt: null, isActive: true, role: { in: ['COMPANY_OWNER', 'SUPER_ADMIN'] } },
    select: { id: true, role: true },
  });
  if (!owner) throw new Error('No active company owner is available to record the import');
  const requiredAccounts = ['1120', '2000', '2300', '3100', '5100'];
  const accounts = await db.account.findMany({ where: { code: { in: requiredAccounts }, isActive: true }, select: { code: true } });
  const missing = requiredAccounts.filter((code) => !accounts.some((account: any) => account.code === code));
  if (missing.length) throw new Error(`Required accounting accounts are missing: ${missing.join(', ')}`);
  const existingProject = await db.project.findFirst({ where: { deletedAt: null, description: { contains: sourceMarker('PRJ-001') } } });
  const conflicts = await db.project.findMany({ where: { deletedAt: null, name: sourceText('Siiv Apartments'), NOT: { id: existingProject?.id } }, select: { id: true, name: true } });
  if (conflicts.length) throw new Error('An unmarked active project named Siiv Apartments already exists; refusing an ambiguous import');
  return owner;
}

async function ensureProject(workbook: SiivWorkbook, db: any, construction: ConstructionService, companyId: string) {
  const marker = sourceMarker('PRJ-001');
  let project = await db.project.findFirst({ where: { deletedAt: null, description: { contains: marker } } });
  if (project) record('project', 'Project Overview', 'skipped', 'Existing source project reused', 'PRJ-001');
  else {
    project = await construction.createProject(db, companyId, validateDto(ProjectDto, {
      name: sourceText(workbook.overview['Project Name']),
      description: `${sourceText(workbook.overview.Description)}\n${marker}`,
      location: sourceText(workbook.overview.Location),
      budget: sourceNumber(workbook.overview.Budget),
      startDate: sourceDate(workbook.overview['Start Date']),
      endDate: sourceDate(workbook.overview['Planned 6-Month Phase End']),
      status: 'ONGOING',
      progress: Math.round(sourceNumber(workbook.overview['Physical Progress']) * 100),
    }, 'Project Overview'));
    record('project', 'Project Overview', 'success', 'Project created through ConstructionService', 'PRJ-001');
  }

  for (const row of workbook.sheets.Progress.filter((item) => sourceText(item['Work Package']) !== 'OVERALL PHYSICAL PROGRESS')) {
    const sourceId = `task:${sourceText(row['Work Package'])}`;
    const taskMarker = sourceMarker(sourceId);
    const existing = await db.projectTask.findFirst({ where: { projectId: project.id, deletedAt: null, description: { contains: taskMarker } } });
    if (existing) record('project-tasks', 'Progress', 'skipped', 'Existing source task reused', sourceText(row['Work Package']));
    else {
      const sourceStatus = sourceText(row.Status);
      await construction.createTask(db, validateDto(TaskDto, {
        projectId: project.id,
        title: sourceText(row['Work Package']),
        description: taskMarker,
        status: sourceStatus === 'Dhammaystiran' ? 'COMPLETED' : 'IN_PROGRESS',
        priority: 'MEDIUM',
        progress: Math.round(sourceNumber(row['Progress %']) * 100),
      }, `Progress row ${row.__row}`));
      record('project-tasks', 'Progress', 'success', 'Task created through ConstructionService', sourceText(row['Work Package']));
    }
  }
  return project;
}

async function ensureStaff(workbook: SiivWorkbook, db: any, construction: ConstructionService, staffService: StaffService, companyId: string, project: any) {
  const workerTypes = new Map<string, any>();
  for (const basis of ['Bille', 'Maalinle']) {
    const name = `Siiv ${basis}`;
    let workerType = await db.workerType.findFirst({ where: { deletedAt: null, name: { equals: name, mode: 'insensitive' } } });
    if (!workerType) {
      workerType = await construction.createWorkerType(db, { name, description: `${basis} workers ${sourceMarker(`worker-type:${basis}`)}` });
      record('staff', 'Staff', 'success', `Worker type ${name} created`, basis);
    }
    workerTypes.set(basis, workerType);
  }

  const bySourceId = new Map<string, any>();
  for (const row of workbook.sheets.Staff) {
    const employeeId = sourceText(row['Employee ID']);
    const marker = sourceMarker(employeeId);
    let staff = await db.staff.findFirst({ where: { deletedAt: null, notes: { contains: marker } } });
    if (staff) record('staff', 'Staff', 'skipped', 'Existing source staff reused', employeeId);
    else {
      const basis = sourceText(row.Nooca);
      const names = splitName(sourceText(row.Magaca));
      staff = await staffService.createStaff(db, companyId, validateDto(CreateStaffDto, {
        ...names,
        position: sourceText(row.Doorka),
        department: 'CONSTRUCTION',
        salary: sourceNumber(row.Qiimaha),
        hireDate: sourceDate(workbook.overview['Start Date']),
        status: 'ACTIVE',
        workerTypeId: workerTypes.get(basis)?.id,
        assignedProjectId: project.id,
        notes: `${marker} Pay basis: ${basis}; source unit: ${sourceText(row.Unit)}`,
        createAccount: false,
      }, `Staff ${employeeId}`));
      record('staff', 'Staff', 'success', 'Staff registered through StaffService without a login account', employeeId);
    }
    bySourceId.set(employeeId, staff);
  }
  return bySourceId;
}

async function ensureFunding(workbook: SiivWorkbook, db: any, financials: FinancialsService, owner: any, company: any, project: any) {
  let category = await db.category.findFirst({ where: { deletedAt: null, name: { equals: 'Project Funding', mode: 'insensitive' } } });
  if (!category) category = await financials.createCategory(db, { name: 'Project Funding', code: 'SIIV-FUND', description: sourceMarker('funding-category') });
  for (const row of workbook.sheets['Cash Ledger'].slice(0, 4)) {
    const id = sourceText(row['Transaction ID']);
    const ref = `siiv:cash:${id}`;
    const dto = validateDto(CreateTransactionDto, {
      type: 'INCOME', status: 'CLEARED', amount: sourceNumber(row.Income), description: sourceText(row.Faahfaahin),
      categoryId: category.id, projectId: project.id, date: sourceDate(row.Date),
      notes: `${sourceMarker(id)} Payment method: ${sourceText(row['Payment Method'])}; destination: ${sourceText(row['Money Destination'])}`,
      debitAccountCode: '1120', creditAccountCode: id === 'TXN-004' ? '2300' : '3100',
    }, `Cash Ledger ${id}`);
    const existing = await db.transaction.findUnique({ where: { referenceId: ref } });
    await financials.createTransaction(db, { ...dto, idempotencyKey: ref, userId: owner.id, tenantId: company.id });
    record('funding', 'Cash Ledger', existing ? 'skipped' : 'success', existing ? 'Existing funding transaction reused' : 'Funding posted to cash and equity/liability through FinancialsService', id);
  }
  for (const row of workbook.sheets['Cash Ledger'].slice(4)) {
    record('funding', 'Cash Ledger', 'skipped', 'Verification-only derived or duplicate row; source detail is imported through its owning workflow', sourceText(row['Transaction ID']));
  }
}

async function ensureOverdraft(workbook: SiivWorkbook, db: any, financials: FinancialsService, accounting: AccountingService, owner: any, company: any) {
  const sourceRef = 'siiv:reconciliation:overdraft';
  const existing = await db.journalBatch.findFirst({ where: { deletedAt: null, sourceType: 'IMPORT_FINANCING_GAP', sourceRef } });
  if (existing) {
    record('funding', 'Cash Ledger', 'skipped', 'Existing source-derived overdraft journal reused', 'OVERDRAFT');
    return existing;
  }
  const gap = cents(workbook.validation.totals.detailedExpenses - workbook.validation.totals.funding);
  if (gap <= 0) return null;
  let account = await db.account.findUnique({ where: { code: '2150' } });
  if (!account) {
    account = await financials.createAccount(db, company.id, validateDto(AccountDto, {
      code: '2150', name: 'Bank Overdraft', parentCode: '2000', type: 'LIABILITY',
    }, 'Bank overdraft account'));
    record('funding', 'Cash Ledger', 'success', 'Bank Overdraft liability account created through FinancialsService', '2150');
  }
  const batch = await accounting.postJournalBatch(db, {
    tenantId: company.id,
    userId: owner.id,
    dto: {
      date: new Date('2026-06-30T00:00:00.000Z'),
      memo: `Source-derived financing gap ${sourceMarker('overdraft')}`,
      sourceType: 'IMPORT_FINANCING_GAP',
      sourceRef,
      lines: [
        { accountCode: '1120', debit: gap, credit: 0 },
        { accountCode: '2150', debit: 0, credit: gap },
      ],
    },
  });
  record('funding', 'Cash Ledger', 'warning', `Recorded ${gap.toFixed(2)} as an explicit bank-overdraft liability because detailed paid costs exceed recorded funding; no workbook row was changed`, 'OVERDRAFT');
  return batch;
}

async function ensureMaterials(workbook: SiivWorkbook, db: any, construction: ConstructionService, materialsService: MaterialManagementService, owner: any, project: any) {
  const suppliers = new Map<string, any>();
  for (const name of new Set(workbook.sheets.Materials.map((row) => sourceText(row.Supplier)))) {
    const marker = sourceMarker(`supplier:${name}`);
    let supplier = await db.supplier.findFirst({ where: { deletedAt: null, notes: { contains: marker } } });
    if (!supplier) {
      supplier = await materialsService.createSupplier(db, { name, balance: 0, notes: marker });
      record('suppliers', 'Materials', 'success', 'Supplier created through MaterialManagementService', name);
    } else record('suppliers', 'Materials', 'skipped', 'Existing source supplier reused', name);
    suppliers.set(name, supplier);
  }

  const masters = new Map<string, any>();
  for (const row of workbook.sheets.Materials) {
    const sourceId = sourceText(row['Material ID']);
    const unit = UNIT_MAP[sourceText(row.Unit)];
    const masterKey = `${sourceText(row.Alaabta)}|${unit}`;
    let material = masters.get(masterKey);
    if (!material) {
      const marker = sourceMarker(`material-master:${masterKey}`);
      material = await db.constructionMaterial.findFirst({ where: { deletedAt: null, materialType: marker } });
      if (!material) {
        material = await construction.createMaterial(db, validateDto(ConstructionMaterialDto, {
          name: sourceText(row.Alaabta), category: 'Construction Procurement', materialType: marker,
          unit, unitCost: 0, quantity: 0, warehouse: 'Siiv Apartments Site', lowStockThreshold: 0, status: 'ACTIVE',
        }, `Materials ${sourceId}`));
        record('materials', 'Materials', 'success', 'Construction material master created', sourceText(row.Alaabta));
      }
      masters.set(masterKey, material);
    }
    const ref = `siiv:material:${sourceId}`;
    const existing = await db.constructionInventoryTransaction.findUnique({ where: { sourceRef: ref } });
    await construction.createInventoryMovement(db, owner.id, validateDto(InventoryMovementDto, {
      materialId: material.id, projectId: project.id, type: 'RESTOCK', quantity: sourceNumber(row.Qty),
      date: sourceDate(row.Date), unitCost: sourceNumber(row['Unit Price']), totalCost: sourceNumber(row.Total),
      supplierId: suppliers.get(sourceText(row.Supplier))?.id, paymentMethod: sourceText(row['Payment Method']), sourceRef: ref,
      warehouse: 'Siiv Apartments Site',
      notes: `${sourceText(row.Alaabta)} purchase ${sourceMarker(sourceId)}; stated total preserved independently from quantity x unit price`,
    }, `Materials ${sourceId}`));
    record('materials', 'Materials', existing ? 'skipped' : 'success', existing ? 'Existing procurement movement reused' : 'Procurement restock and financial event recorded through ConstructionService', sourceId);
  }
}

async function ensureSiteExpenses(workbook: SiivWorkbook, db: any, construction: ConstructionService, owner: any, project: any) {
  for (const row of workbook.sheets['Site Expenses']) {
    const id = sourceText(row['Expense ID']);
    const marker = sourceMarker(id);
    const existing = await db.dailyOperationalExpense.findFirst({ where: { deletedAt: null, description: { contains: marker } } });
    if (existing) record('site-expenses', 'Site Expenses', 'skipped', 'Existing source expense reused', id);
    else {
      await construction.createDailyExpense(db, owner.id, validateDto(DailyExpenseDto, {
        amount: sourceNumber(row.Amount), description: `${sourceText(row.Faahfaahin)} ${marker}; payment method: ${sourceText(row['Payment Method'])}`,
        category: sourceText(row.Category), date: sourceDate(row.Date), projectId: project.id,
      }, `Site Expenses ${id}`));
      record('site-expenses', 'Site Expenses', 'success', 'Expense recorded through ConstructionService', id);
    }
  }
}

async function ensureDailyLabor(workbook: SiivWorkbook, db: any, construction: ConstructionService, owner: any, project: any, staffById: Map<string, any>) {
  const marker = sourceMarker('daily-labor-contract');
  let contract = await db.workforceContract.findFirst({ where: { deletedAt: null, notes: { contains: marker } } });
  if (!contract) {
    contract = await construction.createWorkforceContract(db, validateDto(WorkforceContractDto, {
      projectId: project.id, title: 'Daily Labor - January to June 2026', description: 'Attendance-backed daily wage contract',
      originalBudget: workbook.validation.totals.dailyLabor, status: 'DRAFT',
      startDate: new Date(Date.UTC(2026, 0, 1)), endDate: new Date(Date.UTC(2026, 5, 30)), notes: marker,
    }, 'Daily labor contract'));
    contract = await construction.transitionWorkforceContract(db, contract.id, 'ACTIVE');
    record('daily-labor', 'Daily Attendance', 'success', 'Daily labor contract created and activated', 'daily-labor-contract');
  }
  for (const employeeId of new Set(workbook.sheets['Daily Attendance'].map((row) => sourceText(row['Employee ID'])))) {
    const staff = staffById.get(employeeId);
    const assignment = await db.workforceContractWorker.findUnique({ where: { contractId_staffId: { contractId: contract.id, staffId: staff.id } } });
    if (!assignment || assignment.removedAt) await construction.assignContractWorker(db, contract.id, { staffId: staff.id, role: staff.position, notes: sourceMarker(`daily-assignment:${employeeId}`) });
  }
  for (const row of workbook.sheets['Daily Attendance']) {
    const employeeId = sourceText(row['Employee ID']);
    const period = parseSomaliMonth(row.Bisha);
    const id = `${employeeId}:${period.key}`;
    const markerForRow = sourceMarker(`attendance:${id}`);
    const existing = await db.workforceContractPayment.findFirst({ where: { contractId: contract.id, notes: { contains: markerForRow } } });
    if (existing) record('daily-labor', 'Daily Attendance', 'skipped', 'Existing attendance-backed payment reused', id);
    else {
      await construction.recordContractPayment(db, contract.id, owner.id, validateDto(ContractPaymentDto, {
        staffId: staffById.get(employeeId).id, amount: sourceNumber(row.Wadarta), date: monthEnd(period.year, period.month),
        description: `${sourceText(row.Magaca)} - ${sourceText(row.Bisha)} daily labor`,
        notes: `${markerForRow} Inferred payment date: month end; ${sourceNumber(row['Maalmo Shaqeeyay'])} days x ${sourceNumber(row['Qiimaha/Day'])}`,
      }, `Daily Attendance ${id}`));
      record('daily-labor', 'Daily Attendance', 'success', 'Attendance-backed payment recorded through workforce contract workflow; date inferred as month end', id);
    }
  }
}

async function ensureSubcontractors(workbook: SiivWorkbook, db: any, construction: ConstructionService, owner: any, project: any) {
  const milestoneColumns = [
    { column: 'Advance 30%', label: 'Advance 30%', fraction: 0 },
    { column: 'Progress 30%', label: 'Progress 30%', fraction: 1 / 3 },
    { column: 'Progress 20%', label: 'Progress 20%', fraction: 2 / 3 },
    { column: 'Final 20%', label: 'Final 20%', fraction: 1 },
  ];
  for (const row of workbook.sheets.Subcontractors) {
    const id = sourceText(row['Contract ID']);
    const marker = sourceMarker(id);
    let contract = await db.workforceContract.findFirst({ where: { deletedAt: null, notes: { contains: marker } } });
    if (!contract) {
      contract = await construction.createWorkforceContract(db, validateDto(WorkforceContractDto, {
        projectId: project.id, title: sourceText(row.Shaqada), contractorName: sourceText(row.Qandaraasle),
        description: `External subcontract: ${sourceText(row.Shaqada)}`, originalBudget: sourceNumber(row['Contract Value']),
        status: 'DRAFT', startDate: sourceDate(row.Start), endDate: sourceDate(row.End), notes: marker,
      }, `Subcontractors ${id}`));
      contract = await construction.transitionWorkforceContract(db, contract.id, 'ACTIVE');
      record('subcontractors', 'Subcontractors', 'success', 'External workforce contract created and activated', id);
    }
    let remaining = sourceNumber(row['Paid To Date']);
    const start = sourceDate(row.Start);
    const end = sourceDate(row.End);
    for (const milestone of milestoneColumns) {
      const stated = sourceNumber(row[milestone.column]);
      const amount = Math.min(Math.max(stated, 0), Math.max(remaining, 0));
      if (amount <= 0) continue;
      const paymentId = `${id}:${milestone.label}`;
      const paymentMarker = sourceMarker(`subcontract-payment:${paymentId}`);
      const existing = await db.workforceContractPayment.findFirst({ where: { contractId: contract.id, notes: { contains: paymentMarker } } });
      if (existing) record('subcontractors', 'Subcontractors', 'skipped', 'Existing subcontract milestone payment reused', paymentId);
      else {
        await construction.recordContractPayment(db, contract.id, owner.id, validateDto(ContractPaymentDto, {
          payeeName: sourceText(row.Qandaraasle), amount, date: inferredMilestoneDate(start, end, milestone.fraction),
          description: `${sourceText(row.Shaqada)} - ${milestone.label}`,
          notes: `${paymentMarker} Inferred milestone date from contract interval; source paid-to-date: ${sourceNumber(row['Paid To Date'])}`,
        }, `Subcontractors ${paymentId}`));
        record('subcontractors', 'Subcontractors', 'success', 'Milestone paid through external workforce contract workflow; date inferred from contract interval', paymentId);
      }
      remaining = cents(remaining - amount);
    }
    if (remaining !== 0) throw new Error(`${id}: milestone amounts cannot reproduce Paid To Date; unmatched ${remaining.toFixed(2)}`);
    const refreshed = await db.workforceContract.findUnique({ where: { id: contract.id } });
    if (sourceText(row.Status) === 'Dhammaystiran' && refreshed.status === 'ACTIVE') {
      await construction.transitionWorkforceContract(db, contract.id, 'COMPLETED');
    }
  }
}

async function ensurePayroll(workbook: SiivWorkbook, db: any, payrollService: PayrollService, owner: any, project: any, staffById: Map<string, any>) {
  const groups = new Map<string, WorkbookRow[]>();
  for (const row of workbook.sheets['Monthly Payroll']) {
    const period = parseSomaliMonth(row.Bisha);
    groups.set(period.key, [...(groups.get(period.key) || []), row]);
  }
  for (const [periodKey, rows] of [...groups.entries()].sort()) {
    const period = parseSomaliMonth(rows[0].Bisha);
    let payroll = await db.payroll.findFirst({ where: { year: period.year, month: period.month, deletedAt: null }, include: { items: true } });
    if (!payroll) {
      payroll = await payrollService.createPayroll(db, validateDto(SavePayrollDto, {
        name: `Siiv Apartments Payroll - ${periodKey}`, year: period.year, month: period.month, payPeriod: periodKey,
        paymentDate: monthEnd(period.year, period.month), projectId: project.id, expenseAccountCode: '5100',
        items: rows.map((row) => ({
          staffId: staffById.get(sourceText(row['Employee ID'])).id, employeeName: sourceText(row.Magaca),
          employeePosition: sourceText(row.Doorka), employeeDepartment: 'CONSTRUCTION',
          baseSalary: sourceNumber(row['Gross Salary']), bonuses: 0, deductions: sourceNumber(row.Deduction), tax: 0,
          notes: `${sourceMarker(`payroll:${sourceText(row['Employee ID'])}:${periodKey}`)} Source net: ${sourceNumber(row['Net Salary'])}`,
        })),
      }, `Monthly Payroll ${periodKey}`), owner.id);
      record('payroll', 'Monthly Payroll', 'success', 'Payroll draft created through PayrollService; payment date inferred as month end', periodKey);
    } else record('payroll', 'Monthly Payroll', 'skipped', 'Existing payroll period reused', periodKey);
    if (payroll.status === 'DRAFT') payroll = await payrollService.transition(db, payroll.id, { action: 'submit' }, owner.id);
    if (payroll.status === 'PENDING_APPROVAL') payroll = await payrollService.transition(db, payroll.id, { action: 'approve' }, owner.id);
    if (payroll.status === 'APPROVED') payroll = await payrollService.transition(db, payroll.id, { action: 'pay', accountId: '1120' }, owner.id);
    if (payroll.status !== 'PAID') throw new Error(`Payroll ${periodKey} did not reach PAID status`);
    record('payroll', 'Monthly Payroll', 'verified', 'Payroll is PAID through submit, approve, and pay transitions', periodKey);
  }
}

async function reconcile(workbook: SiivWorkbook, db: any, project: any, accounting: AccountingService, reports: ReportsService) {
  const sourceExpenses = await db.transaction.aggregate({
    where: { deletedAt: null, status: 'CLEARED', type: 'EXPENSE', projectId: project.id },
    _sum: { amount: true }, _count: { _all: true },
  });
  const expenseTotal = cents(Number(sourceExpenses._sum.amount || 0));
  const overview = await reports.getProjectOverview(db, project.id, { startDate: '2026-01-01', endDate: '2026-06-30' });
  const projectReports = await reports.listProjectReports(db);
  const projectReport = projectReports.find((row: any) => row.id === project.id);
  const trialBalance = await accounting.getTrialBalance(db, { asOf: new Date('2026-06-30T23:59:59.999Z') });
  const incomeStatement = await accounting.getIncomeStatement(db, { startDate: new Date('2026-01-01T00:00:00.000Z'), endDate: new Date('2026-06-30T23:59:59.999Z') });
  const counts = {
    staff: await db.staff.count({ where: { deletedAt: null, notes: { contains: `[source:${SOURCE}:EMP-` } } }),
    tasks: await db.projectTask.count({ where: { projectId: project.id, deletedAt: null, description: { contains: `[source:${SOURCE}:task:` } } }),
    materialMovements: await db.constructionInventoryTransaction.count({ where: { deletedAt: null, sourceRef: { startsWith: 'siiv:material:' } } }),
    siteExpenses: await db.dailyOperationalExpense.count({ where: { projectId: project.id, deletedAt: null, description: { contains: `[source:${SOURCE}:EXP-` } } }),
    payrolls: await db.payroll.count({ where: { projectId: project.id, deletedAt: null, year: 2026, month: { gte: 1, lte: 6 } } }),
    payrollItems: await db.payrollItem.count({ where: { payroll: { projectId: project.id, deletedAt: null, year: 2026, month: { gte: 1, lte: 6 } } } }),
    funding: await db.transaction.count({ where: { deletedAt: null, referenceId: { startsWith: 'siiv:cash:' } } }),
  };
  const expectedCounts = { staff: 13, tasks: 11, materialMovements: 23, siteExpenses: 7, payrolls: 6, payrollItems: 30, funding: 4 };
  const failures: string[] = [];
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if ((counts as any)[key] !== expected) failures.push(`${key}: expected ${expected}, found ${(counts as any)[key]}`);
  }
  if (expenseTotal !== workbook.validation.totals.detailedExpenses) failures.push(`project expenses: expected ${workbook.validation.totals.detailedExpenses}, found ${expenseTotal}`);
  if (cents(Number(overview.totalExpense)) !== workbook.validation.totals.detailedExpenses) failures.push(`project overview: expected ${workbook.validation.totals.detailedExpenses}, found ${overview.totalExpense}`);
  if (cents(Number(projectReport?.spentToDate)) !== workbook.validation.totals.detailedExpenses) failures.push(`project report: expected ${workbook.validation.totals.detailedExpenses}, found ${projectReport?.spentToDate}`);
  if (!trialBalance.balanced) failures.push(`trial balance is not balanced (${trialBalance.totalDebit} debit vs ${trialBalance.totalCredit} credit)`);
  const unposted = await db.transaction.findMany({ where: { deletedAt: null, projectId: project.id, status: 'CLEARED', postingStatus: { not: 'POSTED' } }, select: { referenceId: true, postingStatus: true } });
  if (unposted.length) failures.push(`${unposted.length} cleared project transactions are not linked as POSTED`);
  const result = { expectedDetailedTotal: workbook.validation.totals.detailedExpenses, actualProjectExpenseTotal: expenseTotal, counts, expectedCounts, projectOverview: overview, projectReport, trialBalance, incomeStatement, unposted, failures };
  if (failures.length) throw Object.assign(new Error(`Reconciliation failed: ${failures.join('; ')}`), { reconciliation: result });
  record('reconciliation', 'All sheets', 'verified', `Counts, project spend ${expenseTotal.toFixed(2)}, project report, and balanced accounting trial balance reconcile`);
  return result;
}

async function main() {
  const workbook = await readSiivWorkbook(sourcePath);
  for (const warning of workbook.validation.warnings) record('validation', 'Workbook', 'warning', warning);
  if (workbook.validation.errors.length) throw new Error(`Workbook validation failed:\n${workbook.validation.errors.join('\n')}`);
  record('validation', 'Workbook', 'verified', `All 11 sheets validated; SHA-256 ${workbook.sourceSha256}`);
  if (validateOnly) {
    const paths = await writeResult({ mode: 'validate-only', databaseName, source: { path: sourcePath, sha256: workbook.sourceSha256 }, validation: workbook.validation, events });
    console.log(JSON.stringify({ complete: true, ...paths }));
    return;
  }
  if (!execute && !preflightOnly) throw new Error('Refusing to mutate data without --execute (use --preflight-only for a database check)');

  const central = new CentralPrismaService() as any;
  const manager = new TenantConnectionManager();
  let reconciliation: any;
  try {
    await central.$connect();
    const { company, databaseUrl } = await locateCompany(central);
    if (applySchema) {
      await new TenantProvisioningService(manager).provision(databaseUrl);
      record('schema', 'Application', 'success', 'Tenant schema and RBAC synchronized through TenantProvisioningService');
    }
    const db = manager.getTenantDb(databaseUrl) as any;
    const owner = await preflightDb(db, company);
    record('preflight', 'Application', 'verified', `Target ${databaseName} is active, construction-enabled, and has the required owner and accounts`);
    if (preflightOnly) {
      const paths = await writeResult({ mode: 'preflight-only', databaseName, source: { path: sourcePath, sha256: workbook.sourceSha256 }, validation: workbook.validation, events });
      console.log(JSON.stringify({ complete: true, ...paths }));
      return;
    }

    const mappings = new AccountMappingsService();
    const accounting = new AccountingService(mappings);
    const entitlements = new SubscriptionEntitlementService(central);
    const construction = new ConstructionService(entitlements, accounting);
    const staffService = new StaffService(central, entitlements);
    const financials = new FinancialsService(accounting, mappings);
    const materialsService = new MaterialManagementService(accounting);
    const payrollService = new PayrollService(accounting, mappings);
    const reports = new ReportsService();

    const project = await ensureProject(workbook, db, construction, company.id);
    const staffById = await ensureStaff(workbook, db, construction, staffService, company.id, project);
    await ensureFunding(workbook, db, financials, owner, company, project);
    await ensureOverdraft(workbook, db, financials, accounting, owner, company);
    await ensureMaterials(workbook, db, construction, materialsService, owner, project);
    await ensureSiteExpenses(workbook, db, construction, owner, project);
    await ensureDailyLabor(workbook, db, construction, owner, project, staffById);
    await ensureSubcontractors(workbook, db, construction, owner, project);
    await ensurePayroll(workbook, db, payrollService, owner, project, staffById);
    reconciliation = await reconcile(workbook, db, project, accounting, reports);

    const paths = await writeResult({ mode: 'execute', databaseName, company: { id: company.id, name: company.name, subdomain: company.subdomain }, source: { path: sourcePath, sha256: workbook.sourceSha256 }, validation: workbook.validation, reconciliation, events });
    console.log(JSON.stringify({ complete: true, ...paths }));
  } finally {
    await manager.onModuleDestroy();
    await central.onModuleDestroy();
  }
}

main().catch(async (error: any) => {
  record('fatal', 'Import', 'failed', error instanceof Error ? error.message : String(error));
  const paths = await writeResult({ mode: validateOnly ? 'validate-only' : preflightOnly ? 'preflight-only' : 'execute', databaseName, sourcePath, error: error instanceof Error ? error.message : String(error), reconciliation: error?.reconciliation, events });
  console.error(JSON.stringify({ complete: false, ...paths }));
  process.exitCode = 1;
});
