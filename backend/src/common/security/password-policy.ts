import { BadRequestException } from '@nestjs/common';

export const STRONG_PASSWORD_PATTERN = /^.{6,200}$/;

export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 6 characters long';

export function assertStrongPassword(password: string): void {
  if (String(password || '').length < 6) {
    throw new BadRequestException(STRONG_PASSWORD_MESSAGE);
  }
}

