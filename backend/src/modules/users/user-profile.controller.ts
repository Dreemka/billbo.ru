import { Body, Controller, Get, Put } from '@nestjs/common'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

@Controller('user')
export class UserProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  me(@CurrentUser() user: { sub: string } | undefined) {
    return this.usersService.me(user?.sub ?? 'local-dev')
  }

  @Put('profile')
  update(@CurrentUser() user: { sub: string } | undefined, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user?.sub ?? 'local-dev', dto)
  }
}
