import { Body, Controller, Get, Put } from '@nestjs/common'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import { UpdateCompanyDto } from './dto/update-company.dto'
import { CompaniesService } from './companies.service'

@Controller('company')
export class CompanyProfileController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('profile')
  get(@CurrentUser() user: { sub: string } | undefined) {
    return this.companiesService.me(user?.sub ?? 'local-dev')
  }

  @Put('profile')
  update(@CurrentUser() user: { sub: string } | undefined, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(user?.sub ?? 'local-dev', dto)
  }
}
