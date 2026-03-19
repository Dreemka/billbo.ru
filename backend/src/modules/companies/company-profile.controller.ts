import { Body, Controller, Get, Put, UnauthorizedException } from '@nestjs/common'
import { CurrentUser, type JwtUserPayload } from '../../common/auth/current-user.decorator'
import { UpdateCompanyDto } from './dto/update-company.dto'
import { CompaniesService } from './companies.service'

@Controller('company')
export class CompanyProfileController {
  constructor(private readonly companiesService: CompaniesService) {}

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
