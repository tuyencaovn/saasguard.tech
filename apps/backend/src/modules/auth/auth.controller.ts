import { Controller, Post, Body, Res, Get, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
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
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
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
}
