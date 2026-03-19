import { Body, Controller, Get, Put, UnauthorizedException } from '@nestjs/common'
import { CurrentUser, type JwtUserPayload } from '../../common/auth/current-user.decorator'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

@Controller('user')
export class UserProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  me(@CurrentUser() user: JwtUserPayload | undefined) {
    if (!user?.sub) throw new UnauthorizedException()
    return this.usersService.me(user.sub)
  }

  @Put('profile')
  update(@CurrentUser() user: JwtUserPayload | undefined, @Body() dto: UpdateUserDto) {
    if (!user?.sub) throw new UnauthorizedException()
    return this.usersService.update(user.sub, dto)
  }
}
