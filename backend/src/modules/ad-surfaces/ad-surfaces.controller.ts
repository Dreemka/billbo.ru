import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { CreateAdSurfaceDto } from './dto/create-ad-surface.dto'
import { AdSurfacesService } from './ad-surfaces.service'
import { CurrentUser } from '../../common/auth/current-user.decorator'
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
  create(@CurrentUser() user: { sub: string } | undefined, @Body() dto: CreateAdSurfaceDto) {
    return this.adSurfacesService.createForUser(user?.sub ?? 'local-dev', dto)
  }

  @Put(':id')
  update(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') id: string,
    @Body() dto: CreateAdSurfaceDto,
  ) {
    return this.adSurfacesService.updateForUser(user?.sub ?? 'local-dev', id, dto)
  }

  @Delete(':id')
  async remove(@CurrentUser() user: { sub: string } | undefined, @Param('id') id: string) {
    await this.adSurfacesService.removeForUser(user?.sub ?? 'local-dev', id)
    return { success: true }
  }
}
