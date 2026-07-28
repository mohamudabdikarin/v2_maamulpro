import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../middleware/tenant-resolver.middleware';

export const GetTenantContext = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenantContext;

    return data ? tenant?.[data] : tenant;
  },
);

export const GetTenantDb = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantDb;
  },
);
