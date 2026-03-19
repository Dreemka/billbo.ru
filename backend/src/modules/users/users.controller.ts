import { Body, Controller, Get, Put } from '@nestjs/common'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'
import { CurrentUser } from '../../common/auth/current-user.decorator'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user?: { sub: string }) {
    return this.usersService.me(user?.sub ?? 'local-dev')
  }

  @Put('me')
  update(@CurrentUser() user: { sub: string } | undefined, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user?.sub ?? 'local-dev', dto)
  }
}
