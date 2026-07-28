import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext, GetTenantDb } from '../../common/decorators/tenant-context.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import {
  ClientDto,
  DealDto,
  PropertyDto,
  RentalContractDto,
  RentPaymentDto,
  RentPaymentStatusDto,
  TenantDto,
} from './real-estate.dto';
import { RealEstateService } from './real-estate.service';

@Controller('api/real-estate')
@UseGuards(TenantAccessGuard)
export class RealEstateController {
  constructor(private readonly service: RealEstateService) {}

  @Get('properties')
  @RequirePermissions('properties.read')
  getProperties(
    @GetTenantDb() db: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getProperties(db, { type, status, search });
  }

  @Post('properties')
  @RequirePermissions('properties.create')
  createProperty(
    @GetTenantDb() db: any,
    @GetTenantContext('companyId') companyId: string,
    @Body() body: PropertyDto,
  ) {
    return this.service.createProperty(db, companyId, body);
  }

  @Get('properties/:id')
  @RequirePermissions('properties.read')
  getProperty(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.service.getProperty(db, id);
  }

  @Patch('properties/:id')
  @RequirePermissions('properties.update')
  updateProperty(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: PropertyDto) {
    return this.service.updateProperty(db, id, body);
  }

  @Delete('properties/:id')
  @RequirePermissions('properties.delete')
  deleteProperty(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.service.deleteProperty(db, id);
  }

  @Get('clients')
  @RequirePermissions('clients.read')
  getClients(@GetTenantDb() db: any, @Query('search') search?: string) {
    return this.service.getClients(db, search);
  }

  @Post('clients')
  @RequirePermissions('clients.create')
  createClient(@GetTenantDb() db: any, @Body() body: ClientDto) {
    return this.service.createClient(db, body);
  }

  @Get('clients/:id')
  @RequirePermissions('clients.read')
  getClient(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.service.getClient(db, id);
  }

  @Patch('clients/:id')
  @RequirePermissions('clients.update')
  updateClient(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: ClientDto) {
    return this.service.updateClient(db, id, body);
  }

  @Delete('clients/:id')
  @RequirePermissions('clients.delete')
  deleteClient(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.service.deleteClient(db, id);
  }

  @Get('deals')
  @RequirePermissions('deals.read')
  getDeals(
    @GetTenantDb() db: any,
    @Query('propertyId') propertyId?: string,
    @Query('clientId') clientId?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.service.getDeals(db, { propertyId, clientId, paymentStatus });
  }

  @Post('deals')
  @RequirePermissions('deals.create')
  createDeal(
    @GetTenantDb() db: any,
    @CurrentUser('id') userId: string,
    @Body() body: DealDto,
  ) {
    return this.service.createDeal(db, userId, body);
  }

  @Get('deals/:id')
  @RequirePermissions('deals.read')
  getDeal(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.service.getDeal(db, id);
  }

  @Patch('deals/:id')
  @RequirePermissions('deals.update')
  updateDeal(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: DealDto) {
    return this.service.updateDeal(db, id, body);
  }

  @Delete('deals/:id')
  @RequirePermissions('deals.delete')
  deleteDeal(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.service.deleteDeal(db, id);
  }

  @Get('tenants')
  @RequirePermissions('rentals.read')
  getTenants(@GetTenantDb() db: any) {
    return this.service.getTenants(db);
  }

  @Post('tenants')
  @RequirePermissions('rentals.create')
  createTenant(@GetTenantDb() db: any, @Body() body: TenantDto) {
    return this.service.createTenant(db, body);
  }

  @Patch('tenants/:id')
  @RequirePermissions('rentals.update')
  updateTenant(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: TenantDto) {
    return this.service.updateTenant(db, id, body);
  }

  @Delete('tenants/:id')
  @RequirePermissions('rentals.delete')
  deleteTenant(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.service.deleteTenant(db, id);
  }

  @Get('rental-contracts')
  @RequirePermissions('rentals.read')
  getRentalContracts(@GetTenantDb() db: any) {
    return this.service.getRentalContracts(db);
  }

  @Post('rental-contracts')
  @RequirePermissions('rentals.create')
  createRentalContract(@GetTenantDb() db: any, @Body() body: RentalContractDto) {
    return this.service.createRentalContract(db, body);
  }

  @Patch('rental-contracts/:id')
  @RequirePermissions('rentals.update')
  updateRentalContract(
    @GetTenantDb() db: any,
    @Param('id') id: string,
    @Body() body: RentalContractDto,
  ) {
    return this.service.updateRentalContract(db, id, body);
  }

  @Delete('rental-contracts/:id')
  @RequirePermissions('rentals.delete')
  deleteRentalContract(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.service.deleteRentalContract(db, id);
  }

  @Get('rent-payments')
  @RequirePermissions('rentals.read')
  getRentPayments(@GetTenantDb() db: any, @Query('status') status?: string) {
    return this.service.getRentPayments(db, status);
  }

  @Post('rent-payments')
  @RequirePermissions('rentals.create')
  createRentPayment(@GetTenantDb() db: any, @Body() body: RentPaymentDto) {
    return this.service.createRentPayment(db, body);
  }

  @Patch('rent-payments/:id')
  @RequirePermissions('rentals.update')
  updateRentPayment(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: RentPaymentDto) {
    return this.service.updateRentPayment(db, id, body);
  }

  @Post('rent-payments/:id/status')
  @RequirePermissions('rentals.update')
  updateRentPaymentStatus(
    @GetTenantDb() db: any,
    @Param('id') id: string,
    @Body() body: RentPaymentStatusDto,
  ) {
    return this.service.updateRentPaymentStatus(db, id, body.status);
  }

  @Delete('rent-payments/:id')
  @RequirePermissions('rentals.delete')
  deleteRentPayment(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.service.deleteRentPayment(db, id);
  }
}
