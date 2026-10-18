import { Controller, Post, Body, Res, Get, Query, HttpCode, HttpStatus, Patch, Delete, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { WebAuthnService } from './webauthn.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  WebAuthnLoginVerifyDto,
  WebAuthnRegisterVerifyDto,
} from './dto/webauthn.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserData } from './decorators/current-user.decorator';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly webAuthnService: WebAuthnService,
  ) {}

  /**
   * Login endpoint with strict rate limiting to prevent brute force attacks
   * Limit: 5 attempts per 15 minutes per IP
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, user } = await this.authService.login(loginDto);

    // Set JWT in HTTP-only cookie
    response.cookie('access_token', accessToken, COOKIE_OPTIONS);

    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    // Clear the access token cookie
    response.cookie('access_token', '', {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    });

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: CurrentUserData) {
    return { user };
  }

  /**
   * Forgot password endpoint with rate limiting to prevent abuse/enumeration
   * Limit: 3 attempts per 15 minutes per IP
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 attempts per 15 minutes
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Get('reset-password/validate')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  async validateResetToken(@Query('token') token: string) {
    return this.authService.validateResetToken(token);
  }

  /**
   * Reset password endpoint with rate limiting
   * Limit: 5 attempts per 15 minutes per IP
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * Change password endpoint with rate limiting
   * Limit: 5 attempts per 15 minutes per user
   */
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  // ===== Passkey (WebAuthn) =====

  @Get('webauthn/register/options')
  async webAuthnRegisterOptions(@CurrentUser() user: CurrentUserData) {
    return this.webAuthnService.getRegistrationOptions(user);
  }

  @Post('webauthn/register/verify')
  @HttpCode(HttpStatus.OK)
  async webAuthnRegisterVerify(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: WebAuthnRegisterVerifyDto,
  ) {
    return this.webAuthnService.verifyRegistration(user, dto);
  }

  @Public()
  @Post('webauthn/login/options')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10 attempts per 15 minutes
  async webAuthnLoginOptions() {
    return this.webAuthnService.getLoginOptions();
  }

  @Public()
  @Post('webauthn/login/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes
  async webAuthnLoginVerify(
    @Body() dto: WebAuthnLoginVerifyDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, user } = await this.webAuthnService.verifyLogin(dto);
    response.cookie('access_token', accessToken, COOKIE_OPTIONS);
    return { user };
  }

  @Get('webauthn/credentials')
  async webAuthnListCredentials(@CurrentUser() user: CurrentUserData) {
    return this.webAuthnService.listCredentials(user.id);
  }

  @Delete('webauthn/credentials/:id')
  @HttpCode(HttpStatus.OK)
  async webAuthnDeleteCredential(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.webAuthnService.deleteCredential(user.id, id);
  }
}
