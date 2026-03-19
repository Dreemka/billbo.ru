import { Body, Controller, Post } from '@nestjs/common'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { RefreshDto } from './dto/refresh.dto'
import { LoginAsDto } from './dto/login-as.dto'
import { AuthService } from './auth.service'
import { Public } from '../../common/auth/public.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Public()
  @Post('login-as')
  loginAs(@Body() dto: LoginAsDto) {
    return this.authService.loginAs(dto.role)
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken)
  }

  @Post('logout')
  logout() {
    return { success: true }
  }
}
