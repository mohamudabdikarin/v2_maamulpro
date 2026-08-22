import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => {
        // Binary exports must reach the HTTP adapter unchanged. Wrapping a
        // StreamableFile would serialize its metadata instead of its bytes.
        if (data instanceof StreamableFile) return data as any;
        // If response already matches standard structure, pass through
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data: data ?? null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
