import { Module } from '@nestjs/common';
import { ExecutiveHubService } from './executive-hub.service';
import { ExecutiveHubController } from './executive-hub.controller';

@Module({
  controllers: [ExecutiveHubController],
  providers: [ExecutiveHubService],
  exports: [ExecutiveHubService],
})
export class ExecutiveHubModule {}
