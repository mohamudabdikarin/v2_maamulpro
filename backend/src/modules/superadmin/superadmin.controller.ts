import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AssignSubscriptionDto,
  AutoRenewDto,
  CreateCompanyDto,
  CreateSubscriptionPlanDto,
  InvoicePaymentDto,
  SubscriptionNotesDto,
  UpdateCompanyDto,
  UpdateSubscriptionPlanDto,
} from './superadmin.dto';

@Controller('api/superadmin')
@RequireRoles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('account')
  getAccount(@CurrentUser('id') adminId: string) {
    return this.superAdminService.getAccount(adminId);
  }

  @Patch('account/email')
  updateAccountEmail(
    @CurrentUser('id') adminId: string,
    @Body() body: { email: string; currentPassword: string },
  ) {
    return this.superAdminService.updateAccountEmail(adminId, body.email, body.currentPassword);
  }

  @Patch('account/password')
  updateAccountPassword(
    @CurrentUser('id') adminId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.superAdminService.updateAccountPassword(adminId, body.currentPassword, body.newPassword);
  }

  @Get('companies')
  async getAllCompanies(@Query('search') search?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.superAdminService.getAllCompanies({ search, status, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
  }

  @Post('companies')
  async createCompany(@Body() body: CreateCompanyDto, @CurrentUser('id') adminId: string) {
    return this.superAdminService.createCompany(body, adminId);
  }

  @Get('neon/status')
  getNeonStatus() {
    return this.superAdminService.getNeonStatus();
  }

  @Get('companies/:id')
  async getCompanyById(@Param('id') id: string) {
    return this.superAdminService.getCompanyById(id);
  }

  @Patch('companies/:id')
  async updateCompany(@Param('id') id: string, @Body() body: UpdateCompanyDto) {
    return this.superAdminService.updateCompany(id, body);
  }

  @Delete('companies/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCompany(@Param('id') id: string) {
    return this.superAdminService.deleteCompany(id);
  }

  @Patch('companies/:id/status')
  async updateCompanyStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP' },
  ) {
    return this.superAdminService.updateCompanyStatus(id, body.status);
  }

  @Patch('companies/:id/modules')
  async updateCompanyModules(
    @Param('id') id: string,
    @Body()
    body: {
      constructionEnabled?: boolean;
      realEstateEnabled?: boolean;
      materialManagementEnabled?: boolean;
    },
  ) {
    return this.superAdminService.updateCompanyModules(id, body);
  }

  // -----------------------------------------------------------
  // Subscription Plans
  // -----------------------------------------------------------

  @Get('plans')
  async getAllPlans() {
    return this.superAdminService.getAllPlans();
  }

  @Post('plans')
  async createPlan(@Body() body: CreateSubscriptionPlanDto) {
    return this.superAdminService.createPlan(body);
  }

  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() body: UpdateSubscriptionPlanDto) {
    return this.superAdminService.updatePlan(id, body);
  }

  // -----------------------------------------------------------
  // Subscriptions & Invoicing
  // -----------------------------------------------------------

  @Post('subscriptions/assign')
  async assignSubscription(
    @CurrentUser('id') adminId: string,
    @Body() body: AssignSubscriptionDto,
  ) {
    return this.superAdminService.assignSubscription(
      body.companyId,
      body.planId,
      body.billingCycle,
      adminId,
    );
  }

  @Post('invoices/:id/pay')
  @HttpCode(HttpStatus.OK)
  async markInvoicePaid(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: InvoicePaymentDto,
  ) {
    return this.superAdminService.markInvoicePaid(id, body.paymentMethod, adminId);
  }

  @Post('companies/:id/subscription/renew')
  @HttpCode(HttpStatus.OK)
  createRenewalInvoice(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.superAdminService.createRenewalInvoice(id, adminId);
  }

  @Post('companies/:id/subscription/suspend')
  @HttpCode(HttpStatus.OK)
  suspendSubscription(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: SubscriptionNotesDto,
  ) {
    return this.superAdminService.suspendSubscription(id, adminId, body.notes);
  }

  @Post('companies/:id/subscription/resume')
  @HttpCode(HttpStatus.OK)
  resumeSubscription(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: SubscriptionNotesDto,
  ) {
    return this.superAdminService.resumeSubscription(id, adminId, body.notes);
  }

  @Post('companies/:id/subscription/cancel')
  @HttpCode(HttpStatus.OK)
  cancelSubscription(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: SubscriptionNotesDto,
  ) {
    return this.superAdminService.cancelSubscription(id, adminId, body.notes);
  }

  @Patch('companies/:id/subscription/auto-renew')
  setSubscriptionAutoRenew(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: AutoRenewDto,
  ) {
    return this.superAdminService.setSubscriptionAutoRenew(id, body.autoRenew, adminId);
  }

  @Post('invoices/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelInvoice(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: SubscriptionNotesDto,
  ) {
    return this.superAdminService.cancelInvoice(id, adminId, body.notes);
  }

  // -----------------------------------------------------------
  // Financial Overview
  // -----------------------------------------------------------

  @Get('metrics')
  async getPlatformMetrics() {
    return this.superAdminService.getPlatformFinancialSummary();
  }

  @Get('notifications')
  async getPlatformNotifications() {
    return this.superAdminService.getPlatformNotifications();
  }
}
