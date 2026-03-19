import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UserProfileController } from './user-profile.controller'
import { WalletController } from './wallet.controller'

@Module({
  controllers: [UsersController, UserProfileController, WalletController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
