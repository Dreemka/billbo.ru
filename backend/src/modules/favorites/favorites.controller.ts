import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common'
import { CurrentUser, type JwtUserPayload } from '../../common/auth/current-user.decorator'
import { ToggleFavoriteDto } from './dto/toggle-favorite.dto'
import { FavoritesService } from './favorites.service'

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: JwtUserPayload | undefined) {
    if (!user?.sub) throw new UnauthorizedException()
    return this.favoritesService.listIds(user.sub)
  }

  @Post('toggle')
  toggle(@CurrentUser() user: JwtUserPayload | undefined, @Body() dto: ToggleFavoriteDto) {
    if (!user?.sub) throw new UnauthorizedException()
    return this.favoritesService.toggle(user.sub, dto.billboardId)
  }
}

