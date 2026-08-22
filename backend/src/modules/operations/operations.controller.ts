import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CentralPrismaService } from '../../common/database/central-prisma.service';

@Controller('health')
@Public()
export class OperationsController {
  constructor(private readonly central: CentralPrismaService) {}

  @Get()
  liveness() {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      version: process.env.APP_VERSION || 'development',
    };
  }

  @Get('ready')
  async readiness() {
    const startedAt = Date.now();
    try {
      await this.central.$queryRawUnsafe('SELECT 1');
      return { status: 'ready', database: 'ok', latencyMs: Date.now() - startedAt };
    } catch {
      throw new ServiceUnavailableException('Central database is unavailable');
    }
  }
}
