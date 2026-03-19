import { Module } from '@nestjs/common'
import { CompaniesController } from './companies.controller'
import { CompaniesService } from './companies.service'
import { CompanyProfileController } from './company-profile.controller'

@Module({
  controllers: [CompaniesController, CompanyProfileController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
