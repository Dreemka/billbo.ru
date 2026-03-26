import { Module } from '@nestjs/common'
import { SuperAdminGuard } from '../../common/auth/superadmin.guard'
import { SuperadminUsersController } from './superadmin-users.controller'
import { SuperadminUsersService } from './superadmin-users.service'

@Module({
  controllers: [SuperadminUsersController],
  providers: [SuperadminUsersService, SuperAdminGuard],
})
export class SuperadminModule {}
