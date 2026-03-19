import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Role, SurfaceType } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateAdSurfaceDto } from './dto/create-ad-surface.dto'
import { CreateAdSurfacesBulkDto } from './dto/create-ad-surfaces-bulk.dto'

@Injectable()
export class AdSurfacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic() {
    const rows = await this.prisma.adSurface.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(this.mapRow)
  }

  async createForUser(userId: string, dto: CreateAdSurfaceDto) {
    const owner = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!owner || owner.role !== Role.COMPANY) {
      throw new ForbiddenException('Управлять конструкциями могут только аккаунты компании')
    }
    const company = await this.prisma.company.upsert({
      where: { ownerUserId: userId },
      update: {},
      create: {
        ownerUserId: userId,
        name: 'Local Company',
        city: 'Moscow',
        description: 'Local development company',
      },
    })

    const created = await this.prisma.adSurface.create({
      data: {
        companyId: company.id,
        title: dto.title,
        type: this.toPrismaType(dto.type),
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        pricePerWeek: dto.pricePerWeek,
        size: dto.size,
        isActive: dto.available,
        extraFields: dto.extraFields ?? undefined,
      },
    })
    return this.mapRow(created)
  }

  async createManyForUser(userId: string, dto: CreateAdSurfacesBulkDto) {
    const owner = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!owner || owner.role !== Role.COMPANY) {
      throw new ForbiddenException('Управлять конструкциями могут только аккаунты компании')
    }

    const company = await this.prisma.company.upsert({
      where: { ownerUserId: userId },
      update: {},
      create: {
        ownerUserId: userId,
        name: 'Local Company',
        city: 'Moscow',
        description: 'Local development company',
      },
    })

    await this.prisma.adSurface.createMany({
      data: dto.surfaces.map((surface) => ({
        companyId: company.id,
        title: surface.title,
        type: this.toPrismaType(surface.type),
        address: surface.address,
        lat: surface.lat,
        lng: surface.lng,
        pricePerWeek: surface.pricePerWeek,
        size: surface.size,
        isActive: surface.available,
        extraFields: surface.extraFields ?? undefined,
      })),
    })

    return { success: true, created: dto.surfaces.length }
  }

  async updateForUser(userId: string, id: string, dto: CreateAdSurfaceDto) {
    const owner = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!owner || owner.role !== Role.COMPANY) {
      throw new ForbiddenException('Управлять конструкциями могут только аккаунты компании')
    }
    const company = await this.prisma.company.findUnique({ where: { ownerUserId: userId } })
    if (!company) throw new NotFoundException('Company profile not found')

    const existing = await this.prisma.adSurface.findFirst({
      where: { id, companyId: company.id },
    })
    if (!existing) throw new NotFoundException('Surface not found')

    const updated = await this.prisma.adSurface.update({
      where: { id },
      data: {
        title: dto.title,
        type: this.toPrismaType(dto.type),
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        pricePerWeek: dto.pricePerWeek,
        size: dto.size,
        isActive: dto.available,
        extraFields: dto.extraFields ?? undefined,
      },
    })
    return this.mapRow(updated)
  }

  async removeForUser(userId: string, id: string) {
    const owner = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!owner || owner.role !== Role.COMPANY) {
      throw new ForbiddenException('Управлять конструкциями могут только аккаунты компании')
    }
    const company = await this.prisma.company.findUnique({ where: { ownerUserId: userId } })
    if (!company) throw new NotFoundException('Company profile not found')
    const existing = await this.prisma.adSurface.findFirst({
      where: { id, companyId: company.id },
    })
    if (!existing) throw new NotFoundException('Surface not found')
    await this.prisma.adSurface.delete({ where: { id } })
  }

  private toPrismaType(type: string): SurfaceType {
    switch (type) {
      case 'billboard':
        return SurfaceType.BILLBOARD
      case 'cityboard':
        return SurfaceType.CITYBOARD
      case 'supersite':
        return SurfaceType.SUPERSITE
      default:
        return SurfaceType.DIGITAL
    }
  }

  private mapRow(row: {
    id: string
    title: string
    type: SurfaceType
    address: string
    lat: unknown
    lng: unknown
    pricePerWeek: number
    size: string
    isActive: boolean
    extraFields: unknown
  }) {
    return {
      id: row.id,
      title: row.title,
      type: row.type.toLowerCase(),
      address: row.address,
      lat: Number(row.lat),
      lng: Number(row.lng),
      pricePerWeek: row.pricePerWeek,
      size: row.size,
      available: row.isActive,
      extraFields: (row.extraFields ?? {}) as Record<string, unknown>,
    }
  }
}
