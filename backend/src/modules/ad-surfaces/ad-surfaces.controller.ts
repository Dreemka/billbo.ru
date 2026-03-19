import { Body, Controller, Delete, Get, Param, Post, Put, UnauthorizedException } from '@nestjs/common'
import { CreateAdSurfaceDto } from './dto/create-ad-surface.dto'
import { CreateAdSurfacesBulkDto } from './dto/create-ad-surfaces-bulk.dto'
import { AdSurfacesService } from './ad-surfaces.service'
import { CurrentUser, type JwtUserPayload } from '../../common/auth/current-user.decorator'
import { Public } from '../../common/auth/public.decorator'

@Controller('billboards')
export class AdSurfacesController {
  constructor(private readonly adSurfacesService: AdSurfacesService) {}

  @Public()
  @Get()
  listPublic() {
    return this.adSurfacesService.listPublic()
  }

  @Post()
  create(@CurrentUser() user: JwtUserPayload | undefined, @Body() dto: CreateAdSurfaceDto) {
    if (!user?.sub) throw new UnauthorizedException()
    return this.adSurfacesService.createForUser(user.sub, dto)
  }

  @Post('bulk')
  createMany(
    @CurrentUser() user: JwtUserPayload | undefined,
    @Body() dto: CreateAdSurfacesBulkDto,
  ) {
    if (!user?.sub) throw new UnauthorizedException()
    return this.adSurfacesService.createManyForUser(user.sub, dto)
  }

  @Put(':id')
  update(
    @CurrentUser() user: JwtUserPayload | undefined,
    @Param('id') id: string,
    @Body() dto: CreateAdSurfaceDto,
  ) {
    if (!user?.sub) throw new UnauthorizedException()
    return this.adSurfacesService.updateForUser(user.sub, id, dto)
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtUserPayload | undefined, @Param('id') id: string) {
    if (!user?.sub) throw new UnauthorizedException()
    await this.adSurfacesService.removeForUser(user.sub, id)
    return { success: true }
  }
}
