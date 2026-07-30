import { BadRequestException } from '@nestjs/common';

export const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,200}$/;

export const STRONG_PASSWORD_MESSAGE =
  'Password must be 12-200 characters and include uppercase, lowercase, number, and special character';

export function assertStrongPassword(password: string): void {
  if (!STRONG_PASSWORD_PATTERN.test(String(password || ''))) {
    throw new BadRequestException(STRONG_PASSWORD_MESSAGE);
  }
}
