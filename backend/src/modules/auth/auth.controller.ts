import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(['auth/login', 'sign-in'])
  @Public()
  @HttpCode(HttpStatus.OK)
  async loginCompanyUser(
    @Body() body: { email?: string; userName?: string; password?: string; tenantId?: string },
  ) {
    const userEmail = body.email || body.userName || '';
    const userPassword = body.password || '';
    return this.authService.loginCompanyUser(userEmail, userPassword, body.tenantId);
  }

  @Post(['auth/superadmin/login', 'superadmin/login'])
  @Public()
  @HttpCode(HttpStatus.OK)
  async loginSuperAdmin(
    @Body() body: { email?: string; userName?: string; password?: string },
  ) {
    const userEmail = body.email || body.userName || '';
    const userPassword = body.password || '';
    return this.authService.loginSuperAdmin(userEmail, userPassword);
  }

  @Post('auth/impersonation/exchange')
  @Public()
  @HttpCode(HttpStatus.OK)
  exchangeImpersonation(@Body() body: { token?: string }) {
    return this.authService.exchangeImpersonation(body.token || '');
  }

  @Post('auth/password/forgot')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  requestPasswordReset(@Body() body: { email?: string }) {
    return this.authService.requestPasswordReset(body.email || '');
  }

  @Post('auth/password/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: { email?: string; code?: string; newPassword?: string }) {
    return this.authService.resetPassword(
      body.email || '',
      body.code || '',
      body.newPassword || '',
    );
  }

  @Get('auth/session')
  currentSession(@CurrentUser() user: any) {
    return this.authService.currentSession(user);
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user);
  }
}
