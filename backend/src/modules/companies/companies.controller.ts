import { Body, Controller, Get, Put } from '@nestjs/common'
import { UpdateCompanyDto } from './dto/update-company.dto'
import { CompaniesService } from './companies.service'
import { CurrentUser } from '../../common/auth/current-user.decorator'

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('me')
  me(@CurrentUser() user?: { sub: string }) {
    return this.companiesService.me(user?.sub ?? 'local-dev')
  }

  @Put('me')
  update(@CurrentUser() user: { sub: string } | undefined, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(user?.sub ?? 'local-dev', dto)
  }
}
