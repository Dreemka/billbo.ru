import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { JwtUserPayload } from './current-user.decorator'
import { IS_PUBLIC_KEY } from './public.decorator'

/**
 * Для роли COMPANY: доступ в кабинет только если isVerified.
 * Публичные маршруты (@Public) не проверяются — иначе GET /billboards с токеном компании дал бы 403.
 */
@Injectable()
export class CompanyVerifiedGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const req = context.switchToHttp().getRequest<{ user?: JwtUserPayload }>()
    const user = req.user
    if (!user?.sub) return true
    if (user.role !== Role.COMPANY) return true

    const company = await this.prisma.company.findUnique({
      where: { ownerUserId: user.sub },
      select: { isVerified: true },
    })
    if (!company?.isVerified) {
      throw new ForbiddenException(
        'Компания не верифицирована. Вход в кабинет недоступен. Обратитесь к администратору платформы.',
      )
    }
    return true
  }
}
