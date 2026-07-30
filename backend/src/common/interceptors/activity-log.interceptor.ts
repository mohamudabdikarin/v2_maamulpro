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
        next: (result: any) => {
          const segments = request.path
            .split('/')
            .filter((segment: string) => segment && segment !== 'api');
          const entityId = request.params?.id || request.params?.code || null;
          const entity = (
            entityId ? segments[segments.length - 2] : segments.at(-1)
          ) || 'unknown';
          const action = ({
            POST: 'CREATE',
            PUT: 'UPDATE',
            PATCH: 'UPDATE',
            DELETE: 'DELETE',
          } as Record<string, string>)[request.method] || request.method;
          const row = result?.data || result;
          const displayName = [
            row?.name,
            row?.title,
            row?.reference,
            request.body?.name,
            request.body?.title,
            request.body?.reference,
          ].find((value) => typeof value === 'string' && value.trim());
          const sensitiveFields = /password|secret|token|code|dburl/i;
          const changedFields = Object.keys(request.body || {})
            .filter((field) => !sensitiveFields.test(field))
            .map((field) => field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());
          const entityLabel = entity
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
          const details = [
            `${action.charAt(0)}${action.slice(1).toLowerCase()} ${entityLabel}`,
            displayName ? `"${displayName}"` : '',
            changedFields.length ? `Fields: ${changedFields.join(', ')}` : '',
          ].filter(Boolean).join(' · ');
          void request.tenantDb.activityLog
            .create({
              data: {
                userId: request.user.id,
                action,
                entity,
                entityId,
                resource: request.path,
                details,
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
