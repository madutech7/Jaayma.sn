import { Body, Controller, Get, Headers, Inject, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.authService.login(body);
  }

  @Get('me')
  getMe(@Headers('authorization') authHeader?: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Non autorisé');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const userId = this.authService.verifySessionToken(token);
    if (!userId) {
      throw new UnauthorizedException('Token invalide');
    }

    return this.authService.getMe(userId);
  }
}
