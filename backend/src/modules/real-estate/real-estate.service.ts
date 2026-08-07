import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ClientDto,
  DealDto,
  PropertyDto,
  RentalContractDto,
  RentPaymentDto,
  TenantDto,
} from './real-estate.dto';
import { SubscriptionEntitlementService } from '../../common/subscriptions/subscription-entitlement.service';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class RealEstateService {
  private readonly logger = new Logger(RealEstateService.name);
  constructor(
    private readonly entitlements: SubscriptionEntitlementService,
    private readonly accounting: AccountingService,
  ) {}

  // See material-management for the rationale — a ledger post that
  // fails must not block the source-record write, so wrap in try/catch
  // and log. Missing default accounts are the most common cause.
  private async safePost(fn: () => Promise<unknown>) {
    try { await fn(); } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Journal post skipped: ${message}`);
    }
  }
  getProperties(tenantDb: any, query?: { type?: string; status?: string; search?: string }) {
    const where: any = { deletedAt: null };
    if (query?.type) where.type = query.type;
    if (query?.status) where.status = query.status;
    if (query?.search) where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { address: { contains: query.search, mode: 'insensitive' } },
    ];
    return tenantDb.property.findMany({
      where,
      include: {
        _count: { select: { deals: true, rentalContracts: true, tenants: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProperty(tenantDb: any, id: string) {
    const property = await tenantDb.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        deals: { where: { deletedAt: null }, include: { client: true }, orderBy: { createdAt: 'desc' } },
        rentalContracts: { where: { deletedAt: null }, include: { tenant: true, payments: true } },
        tenants: { where: { deletedAt: null } },
        transactions: { where: { deletedAt: null }, orderBy: { date: 'desc' }, take: 50 },
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async createProperty(tenantDb: any, companyId: string, data: PropertyDto) {
    return this.entitlements.withinTenantQuota(
      companyId,
      tenantDb,
      'properties',
      (tx) => tx.property.create({
        data: { ...data, type: data.type as any, status: (data.status as any) || 'AVAILABLE' },
      }),
    );
  }

  async updateProperty(tenantDb: any, id: string, data: PropertyDto) {
    const where: any = { id, deletedAt: null };
    if (data.version !== undefined) where.version = data.version;
    const result = await tenantDb.property.updateMany({
      where,
      data: {
        ...data,
        type: data.type as any,
        status: data.status as any,
        version: { increment: 1 },
      },
    });
    if (!result.count) throw new ConflictException('Property changed or no longer exists; reload and retry');
    return tenantDb.property.findUnique({ where: { id } });
  }

  async deleteProperty(tenantDb: any, id: string) {
    const [deals, contracts] = await Promise.all([
      tenantDb.deal.count({ where: { propertyId: id, deletedAt: null } }),
      tenantDb.rentalContract.count({ where: { propertyId: id, deletedAt: null } }),
    ]);
    if (deals || contracts) throw new ConflictException('Property has active deals or rental contracts');
    const result = await tenantDb.property.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
    if (!result.count) throw new NotFoundException('Property not found');
    return { deleted: true };
  }

  getClients(tenantDb: any, search?: string) {
    const where: any = { deletedAt: null };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
    return tenantDb.client.findMany({
      where,
      include: { _count: { select: { deals: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClient(tenantDb: any, id: string) {
    const client = await tenantDb.client.findFirst({
      where: { id, deletedAt: null },
      include: { deals: { where: { deletedAt: null }, include: { property: true } } },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  createClient(tenantDb: any, data: ClientDto) {
    return tenantDb.client.create({ data });
  }

  async updateClient(tenantDb: any, id: string, data: ClientDto) {
    const result = await tenantDb.client.updateMany({ where: { id, deletedAt: null }, data });
    if (!result.count) throw new NotFoundException('Client not found');
    return tenantDb.client.findUnique({ where: { id } });
  }

  async deleteClient(tenantDb: any, id: string) {
    const deals = await tenantDb.deal.count({ where: { clientId: id, deletedAt: null } });
    if (deals) throw new ConflictException('Client has active deals');
    const result = await tenantDb.client.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Client not found');
    return { deleted: true };
  }

  getDeals(
    tenantDb: any,
    query?: { propertyId?: string; clientId?: string; paymentStatus?: string },
  ) {
    const where: any = { deletedAt: null };
    if (query?.propertyId) where.propertyId = query.propertyId;
    if (query?.clientId) where.clientId = query.clientId;
    if (query?.paymentStatus) where.paymentStatus = query.paymentStatus;
    return tenantDb.deal.findMany({
      where,
      include: { property: true, client: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeal(tenantDb: any, id: string) {
    const deal = await tenantDb.deal.findFirst({
      where: { id, deletedAt: null },
      include: { property: true, client: true, createdBy: true, transactions: { where: { deletedAt: null } } },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async createDeal(tenantDb: any, userId: string, data: DealDto) {
    this.validateDealAmounts(data);
    return tenantDb.$transaction(async (tx: any) => {
      await this.assertPropertyAvailable(tx, data.propertyId);
      const client = await tx.client.findFirst({ where: { id: data.clientId, deletedAt: null } });
      if (!client) throw new NotFoundException('Client not found');
      const paidAmount = Number(data.paidAmount || 0);
      const paymentStatus = this.dealPaymentStatus(Number(data.totalAmount), paidAmount, data.paymentStatus);
      const deal = await tx.deal.create({
        data: {
          ...data,
          type: data.type as any,
          paymentStatus: paymentStatus as any,
          paidAmount,
          createdById: userId,
        },
      });
      await this.syncDealPropertyStatus(tx, data.propertyId);
      await this.syncDealLedger(tx, deal);
      return deal;
    });
  }

  async updateDeal(tenantDb: any, id: string, data: DealDto) {
    this.validateDealAmounts(data);
    return tenantDb.$transaction(async (tx: any) => {
      const existing = await tx.deal.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException('Deal not found');
      if (data.propertyId !== existing.propertyId) await this.assertPropertyAvailable(tx, data.propertyId);
      const where: any = { id, deletedAt: null };
      if (data.version !== undefined) where.version = data.version;
      const paidAmount = Number(data.paidAmount ?? existing.paidAmount ?? 0);
      const totalAmount = Number(data.totalAmount ?? existing.totalAmount);
      const paymentStatus = this.dealPaymentStatus(totalAmount, paidAmount, data.paymentStatus);
      const result = await tx.deal.updateMany({
        where,
        data: {
          ...data,
          type: data.type as any,
          paidAmount,
          totalAmount,
          paymentStatus: paymentStatus as any,
          version: { increment: 1 },
        },
      });
      if (!result.count) throw new ConflictException('Deal changed or no longer exists; reload and retry');
      const deal = await tx.deal.findUnique({ where: { id } });
      await this.syncDealPropertyStatus(tx, deal.propertyId);
      if (existing.propertyId !== deal.propertyId) await this.syncDealPropertyStatus(tx, existing.propertyId);
      await this.syncDealLedger(tx, deal);
      return deal;
    });
  }

  async deleteDeal(tenantDb: any, id: string) {
    return tenantDb.$transaction(async (tx: any) => {
      const deal = await tx.deal.findFirst({ where: { id, deletedAt: null } });
      if (!deal) throw new NotFoundException('Deal not found');
      await tx.deal.update({ where: { id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
      await tx.transaction.updateMany({
        where: { dealId: id, deletedAt: null },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      await this.safePost(() => this.accounting.retractPriorForSource(tx, 'DEAL', id));
      await this.syncDealPropertyStatus(tx, deal.propertyId);
      return { deleted: true };
    });
  }

  getTenants(tenantDb: any) {
    return tenantDb.tenant.findMany({
      where: { deletedAt: null },
      include: { property: true, contracts: { where: { deletedAt: null } }, rentPayments: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createTenant(tenantDb: any, data: TenantDto) {
    return tenantDb.tenant.create({ data });
  }

  async updateTenant(tenantDb: any, id: string, data: TenantDto) {
    const result = await tenantDb.tenant.updateMany({ where: { id, deletedAt: null }, data });
    if (!result.count) throw new NotFoundException('Tenant not found');
    return tenantDb.tenant.findUnique({ where: { id } });
  }

  async deleteTenant(tenantDb: any, id: string) {
    const active = await tenantDb.rentalContract.count({
      where: { tenantId: id, deletedAt: null, status: { in: ['ACTIVE', 'RENEWAL_DUE'] } },
    });
    if (active) throw new ConflictException('Tenant has an active rental contract');
    const result = await tenantDb.tenant.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Tenant not found');
    return { deleted: true };
  }

  getRentalContracts(tenantDb: any) {
    return tenantDb.rentalContract.findMany({
      where: { deletedAt: null },
      include: { tenant: true, property: true, payments: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRentalContract(tenantDb: any, data: RentalContractDto) {
    this.validateDateRange(data.startDate, data.endDate);
    return tenantDb.$transaction(async (tx: any) => {
      const property = await tx.property.findFirst({ where: { id: data.propertyId, deletedAt: null } });
      if (!property) throw new NotFoundException('Property not found');
      if (property.status === 'SOLD') throw new BadRequestException('Sold property cannot be rented');
      const tenant = await tx.tenant.findFirst({ where: { id: data.tenantId, deletedAt: null } });
      if (!tenant) throw new NotFoundException('Tenant not found');
      const contract = await tx.rentalContract.create({
        data: { ...data, status: (data.status as any) || 'ACTIVE' },
      });
      await tx.property.update({
        where: { id: data.propertyId },
        data: { status: 'RENTED', version: { increment: 1 } },
      });
      await tx.tenant.update({ where: { id: data.tenantId }, data: { propertyId: data.propertyId } });
      return contract;
    });
  }

  async updateRentalContract(tenantDb: any, id: string, data: RentalContractDto) {
    this.validateDateRange(data.startDate, data.endDate);
    const existing = await tenantDb.rentalContract.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Rental contract not found');
    const contract = await tenantDb.rentalContract.update({
      where: { id },
      data: { ...data, status: data.status as any },
    });
    await this.syncDealPropertyStatus(tenantDb, contract.propertyId);
    if (existing.propertyId !== contract.propertyId) await this.syncDealPropertyStatus(tenantDb, existing.propertyId);
    return contract;
  }

  async deleteRentalContract(tenantDb: any, id: string) {
    return tenantDb.$transaction(async (tx: any) => {
      const contract = await tx.rentalContract.findFirst({ where: { id, deletedAt: null } });
      if (!contract) throw new NotFoundException('Rental contract not found');
      await tx.rentalContract.update({ where: { id }, data: { deletedAt: new Date(), status: 'TERMINATED' } });
      await this.syncDealPropertyStatus(tx, contract.propertyId);
      return { deleted: true };
    });
  }

  getRentPayments(tenantDb: any, status?: string) {
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    return tenantDb.rentPayment.findMany({
      where,
      include: { tenant: true, contract: { include: { property: true } } },
      orderBy: { dueDate: 'desc' },
    });
  }

  async createRentPayment(tenantDb: any, data: RentPaymentDto) {
    this.validatePayment(data);
    return tenantDb.$transaction(async (tx: any) => {
      const amountPaid = Number(data.amountPaid || 0);
      const amountDue = Number(data.amountDue);
      const status = this.paymentStatus(amountDue, amountPaid, new Date(data.dueDate));
      const payment = await tx.rentPayment.create({
        data: {
          ...data,
          status: status as any,
          amountPaid,
          paidDate: amountPaid > 0 ? (data.paidDate ? new Date(data.paidDate) : new Date()) : null,
        },
      });
      await this.syncRentPaymentLedger(tx, payment);
      return payment;
    });
  }

  async updateRentPayment(tenantDb: any, id: string, data: RentPaymentDto) {
    this.validatePayment(data);
    return tenantDb.$transaction(async (tx: any) => {
      const existing = await tx.rentPayment.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException('Rent payment not found');
      const amountPaid = Number(data.amountPaid ?? existing.amountPaid ?? 0);
      const amountDue = Number(data.amountDue ?? existing.amountDue);
      const dueDate = data.dueDate ? new Date(data.dueDate) : existing.dueDate;
      const status = this.paymentStatus(amountDue, amountPaid, dueDate);
      const payment = await tx.rentPayment.update({
        where: { id },
        data: {
          ...data,
          amountPaid,
          amountDue,
          status: status as any,
          paidDate: amountPaid > 0 ? (data.paidDate ? new Date(data.paidDate) : existing.paidDate || new Date()) : null,
        },
      });
      await this.syncRentPaymentLedger(tx, payment);
      return payment;
    });
  }

  async updateRentPaymentStatus(tenantDb: any, id: string, status: string) {
    return tenantDb.$transaction(async (tx: any) => {
      const existing = await tx.rentPayment.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException('Rent payment not found');
      const amountDue = Number(existing.amountDue);
      let amountPaid = Number(existing.amountPaid);
      let paidDate = existing.paidDate;
      if (status === 'PAID') {
        amountPaid = amountDue;
        paidDate = new Date();
      } else if (status === 'UNPAID' || status === 'LATE') {
        amountPaid = 0;
        paidDate = null;
      } else if (status === 'PARTIAL' && !(amountPaid > 0 && amountPaid < amountDue)) {
        throw new BadRequestException('PARTIAL status requires amountPaid between 0 and amountDue');
      }
      const derived = this.paymentStatus(amountDue, amountPaid, existing.dueDate);
      const payment = await tx.rentPayment.update({
        where: { id },
        data: {
          status: derived as any,
          paidDate,
          amountPaid,
        },
      });
      await this.syncRentPaymentLedger(tx, payment);
      return payment;
    });
  }

  async deleteRentPayment(tenantDb: any, id: string) {
    return tenantDb.$transaction(async (tx: any) => {
      const result = await tx.rentPayment.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (!result.count) throw new NotFoundException('Rent payment not found');
      await tx.transaction.updateMany({
        where: { referenceId: { startsWith: `rentpayment:${id}:` }, deletedAt: null },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      await this.safePost(() => this.accounting.retractPriorForSource(tx, 'RENT_INVOICE', id));
      await this.safePost(() => this.accounting.retractPriorForSource(tx, 'RENT_RECEIPT', id));
      await this.safePost(() => this.accounting.retractPriorForSource(tx, 'RENT_PAYMENT', id));
      return { deleted: true };
    });
  }

  private validateDealAmounts(data: DealDto) {
    if (Number(data.paidAmount || 0) > data.totalAmount) {
      throw new BadRequestException('Paid amount cannot exceed total amount');
    }
  }

  private validatePayment(data: RentPaymentDto) {
    if (Number(data.amountPaid || 0) > data.amountDue) {
      throw new BadRequestException('Paid amount cannot exceed amount due');
    }
  }

  private validateDateRange(start: Date, end: Date) {
    if (new Date(end) < new Date(start)) throw new BadRequestException('End date must be on or after start date');
  }

  private async assertPropertyAvailable(tx: any, propertyId: string) {
    const property = await tx.property.findFirst({ where: { id: propertyId, deletedAt: null } });
    if (!property) throw new NotFoundException('Property not found');
    if (['SOLD', 'RENTED'].includes(property.status)) {
      throw new ConflictException('Property is not available for a new deal');
    }
  }

  private async syncDealPropertyStatus(tx: any, propertyId: string) {
    const activeRental = await tx.rentalContract.findFirst({
      where: { propertyId, deletedAt: null, status: { in: ['ACTIVE', 'RENEWAL_DUE'] } },
    });
    if (activeRental) {
      await tx.property.update({ where: { id: propertyId }, data: { status: 'RENTED', version: { increment: 1 } } });
      return;
    }
    const deal = await tx.deal.findFirst({
      where: { propertyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    let status = 'AVAILABLE';
    if (deal?.type === 'SALE') status = deal.paymentStatus === 'PAID' ? 'SOLD' : 'UNDER_CONTRACT';
    if (deal?.type === 'RENTAL') status = ['PAID', 'PARTIAL', 'OVERDUE'].includes(deal.paymentStatus) ? 'RENTED' : 'UNDER_CONTRACT';
    await tx.property.update({ where: { id: propertyId }, data: { status, version: { increment: 1 } } });
  }

  private async syncDealLedger(tx: any, deal: any) {
    await tx.transaction.updateMany({
      where: { dealId: deal.id, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
    await this.safePost(() => this.accounting.retractPriorForSource(tx, 'DEAL', deal.id));
    if (deal.paymentStatus === 'REFUNDED' || Number(deal.totalAmount) <= 0) return;
    const paid = Number(deal.paidAmount);
    const total = Number(deal.totalAmount);
    const description = deal.type === 'RENTAL' ? 'Rental' : 'Sale';
    const isRental = deal.type === 'RENTAL';
    if (paid > 0) {
      await tx.transaction.create({
        data: {
          referenceId: `deal:${deal.id}:paid:${deal.version}`,
          type: 'INCOME',
          status: 'CLEARED',
          description: `${description} payment received for deal ${deal.id}`,
          amount: paid,
          dealId: deal.id,
          propertyId: deal.propertyId,
        },
      });
      await this.safePost(() =>
        this.accounting.postFinancialEvent(tx, {
          tx, tenantId: 'system',
          sourceType: 'DEAL',
          sourceId: deal.id,
          sourceRef: `deal ${deal.id} · paid`,
          memo: `${description} payment received for deal ${deal.id}`,
          drKey: isRental ? 'RENTAL_RECEIPT_CASH' : 'DEAL_SALE_CASH',
          crKey: isRental ? 'RENTAL_INVOICE_REVENUE' : 'DEAL_SALE_REVENUE',
          amount: paid,
        }),
      );
    }
    if (total - paid > 0) {
      await tx.transaction.create({
        data: {
          referenceId: `deal:${deal.id}:due:${deal.version}`,
          type: 'INCOME',
          status: deal.paymentStatus === 'OVERDUE' ? 'PROCESSING' : 'PENDING',
          description: `Pending balance for ${description.toLowerCase()} deal ${deal.id}`,
          amount: total - paid,
          dealId: deal.id,
          propertyId: deal.propertyId,
        },
      });
      await this.safePost(() =>
        this.accounting.postFinancialEvent(tx, {
          tx, tenantId: 'system',
          sourceType: 'DEAL',
          sourceId: deal.id,
          sourceRef: `deal ${deal.id} · due`,
          memo: `Outstanding balance on ${description.toLowerCase()} deal ${deal.id}`,
          drKey: isRental ? 'RENTAL_INVOICE_AR' : 'SALES_INVOICE_AR',
          crKey: isRental ? 'RENTAL_INVOICE_REVENUE' : 'DEAL_SALE_REVENUE',
          amount: total - paid,
        }),
      );
    }
  }

  private dealPaymentStatus(total: number, paid: number, explicit?: string) {
    if (explicit === 'REFUNDED') return 'REFUNDED';
    if (paid <= 0) return 'PENDING';
    if (paid >= total) return 'PAID';
    return 'PARTIAL';
  }

  private paymentStatus(due: number, paid: number, dueDate: Date) {
    if (paid >= due) return 'PAID';
    if (paid > 0) return 'PARTIAL';
    return new Date(dueDate) < new Date() ? 'LATE' : 'UNPAID';
  }

  private async syncRentPaymentLedger(tx: any, payment: any) {
    const prefix = `rentpayment:${payment.id}:`;
    await tx.transaction.updateMany({
      where: { referenceId: { startsWith: prefix }, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
    // Accrual: keep invoice (AR/Revenue for full due) separate from receipt (Cash/AR for paid)
    await this.safePost(() => this.accounting.retractPriorForSource(tx, 'RENT_INVOICE', payment.id));
    await this.safePost(() => this.accounting.retractPriorForSource(tx, 'RENT_RECEIPT', payment.id));
    // Legacy source key used by older posts
    await this.safePost(() => this.accounting.retractPriorForSource(tx, 'RENT_PAYMENT', payment.id));

    const propertyId = payment.contractId
      ? (await tx.rentalContract.findUnique({ where: { id: payment.contractId } }))?.propertyId
      : null;
    const paid = Number(payment.amountPaid);
    const due = Number(payment.amountDue);

    if (due > 0) {
      await this.safePost(() =>
        this.accounting.postFinancialEvent(tx, {
          tx, tenantId: 'system',
          sourceType: 'RENT_INVOICE',
          sourceId: payment.id,
          sourceRef: `rent ${payment.id} · invoice`,
          date: payment.dueDate,
          memo: `Rent invoice (${payment.id})`,
          drKey: 'RENTAL_INVOICE_AR',
          crKey: 'RENTAL_INVOICE_REVENUE',
          amount: due,
        }),
      );
    }

    if (paid > 0) {
      await tx.transaction.create({
        data: {
          referenceId: `${prefix}paid:${payment.updatedAt.getTime()}`,
          type: 'INCOME',
          status: 'CLEARED',
          description: `Rent payment received (rent payment ${payment.id})`,
          amount: paid,
          date: payment.paidDate || new Date(),
          propertyId,
        },
      });
      await this.safePost(() =>
        this.accounting.postFinancialEvent(tx, {
          tx, tenantId: 'system',
          sourceType: 'RENT_RECEIPT',
          sourceId: payment.id,
          sourceRef: `rent ${payment.id} · paid`,
          date: payment.paidDate || new Date(),
          memo: `Rent payment received (${payment.id})`,
          drKey: 'RENTAL_RECEIPT_CASH',
          crKey: 'RENTAL_RECEIPT_AR',
          amount: paid,
        }),
      );
    }
  }
}
