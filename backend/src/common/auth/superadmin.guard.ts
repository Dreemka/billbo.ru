import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Role } from '@prisma/client'
import type { JwtUserPayload } from './current-user.decorator'

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user as JwtUserPayload | undefined
    if (!user?.sub) throw new UnauthorizedException()
    if (user.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Доступ только для супер-администратора')
    }
    return true
  }
}
