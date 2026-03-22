import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { IS_PUBLIC_KEY } from './public.decorator'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const request = context.switchToHttp().getRequest()

    // На публичных маршрутах токен не обязателен, но если передан валидный Bearer — подставляем user
    // (например GET /billboards: компания видит только свои конструкции).
    if (isPublic) {
      const authHeader = request.headers.authorization as string | undefined
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
      if (token) {
        try {
          const payload = this.jwtService.verify(token)
          request.user = payload
        } catch {
          // игнорируем битый токен на публичном эндпоинте
        }
      }
      return true
    }

    const authHeader = request.headers.authorization as string | undefined
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) throw new UnauthorizedException('Missing access token')

    try {
      const payload = this.jwtService.verify(token)
      request.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid access token')
    }
  }
}
