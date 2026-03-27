import { Body, Controller, ForbiddenException, Get, Put, UnauthorizedException } from '@nestjs/common'
import { Role } from '@prisma/client'
import { CurrentUser, type JwtUserPayload } from '../../common/auth/current-user.decorator'
import { UpdateCompanyDto } from './dto/update-company.dto'
import { CompaniesService } from './companies.service'

@Controller('company')
export class CompanyProfileController {
  constructor(private readonly companiesService: CompaniesService) {}

  /** Клиенты, забронировавшие поверхности этой компании (только роль COMPANY). */
  @Get('clients')
  listBookingClients(@CurrentUser() user: JwtUserPayload | undefined) {
    if (!user?.sub) throw new UnauthorizedException()
    if (user.role !== Role.COMPANY) {
      throw new ForbiddenException('Список клиентов доступен только аккаунту компании')
    }
    return this.companiesService.listBookingClients(user.sub)
  }

  @Get('profile')
  get(@CurrentUser() user: JwtUserPayload | undefined) {
    if (!user?.sub) throw new UnauthorizedException()
    return this.companiesService.me(user.sub)
  }

  @Put('profile')
  update(@CurrentUser() user: JwtUserPayload | undefined, @Body() dto: UpdateCompanyDto) {
    if (!user?.sub) throw new UnauthorizedException()
    return this.companiesService.update(user.sub, dto)
  }
}
