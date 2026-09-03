import { Body, Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  credential: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.loginWithGoogle(dto.credential);
  }

  @Post('guest')
  async guestAuth() {
    return this.authService.guestLogin();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
