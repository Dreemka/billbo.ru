import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, UnauthorizedException } from '@nestjs/common'
import { Role } from '@prisma/client'
import { CreateAdSurfaceDto } from './dto/create-ad-surface.dto'
import { CreateAdSurfacesBulkDto } from './dto/create-ad-surfaces-bulk.dto'
import { AdSurfacesService } from './ad-surfaces.service'
import { CurrentUser, type JwtUserPayload } from '../../common/auth/current-user.decorator'
import { Public } from '../../common/auth/public.decorator'

@Controller('billboards')
export class AdSurfacesController {
  constructor(private readonly adSurfacesService: AdSurfacesService) {}

  /** Полный каталог (маркетплейс). У клиента с привязкой — только выбранные компании. */
  @Public()
  @Get()
  listPublicCatalog(@CurrentUser() user: JwtUserPayload | undefined) {
    return this.adSurfacesService.listPublicForViewer(user)
  }

  /**
   * Кабинет компании: только свои конструкции.
   * SUPERADMIN — полный список (модерация).
   */
  @Get('mine')
  listMine(@CurrentUser() user: JwtUserPayload | undefined) {
    if (!user?.sub) throw new UnauthorizedException()
    if (user.role === Role.SUPERADMIN) {
      return this.adSurfacesService.listAllForModeration()
    }
    if (user.role !== Role.COMPANY) {
      throw new ForbiddenException('Список своих конструкций доступен только аккаунту компании')
    }
    return this.adSurfacesService.listForCompanyOwner(user.sub)
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
