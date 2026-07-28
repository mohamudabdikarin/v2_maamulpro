import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    if (request.method === 'GET' || !request.tenantDb || !request.user?.id) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const segments = request.path.split('/').filter(Boolean);
          const entity = segments[segments.length - 2] || segments.at(-1) || 'unknown';
          const entityId = request.params?.id || request.params?.code || null;
          void request.tenantDb.activityLog
            .create({
              data: {
                userId: request.user.id,
                action: request.method,
                entity,
                entityId,
                resource: request.path,
                details: JSON.stringify({
                  params: request.params,
                  query: request.query,
                }),
                ipAddress: request.ip,
                deviceInfo: request.headers['user-agent'],
              },
            })
            .catch((error: Error) =>
              this.logger.warn(`Activity logging failed: ${error.message}`),
            );
        },
      }),
    );
  }
}
