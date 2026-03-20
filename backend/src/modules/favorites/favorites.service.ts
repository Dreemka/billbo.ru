import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async listIds(userId: string): Promise<{ ids: string[] }> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { billboardId: true },
    })

    return { ids: favorites.map((f) => f.billboardId) }
  }

  async toggle(userId: string, billboardId: string): Promise<{ favorited: boolean }> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_billboardId: { userId, billboardId } },
      select: { id: true },
    })

    if (existing) {
      await this.prisma.favorite.delete({
        where: { userId_billboardId: { userId, billboardId } },
      })
      return { favorited: false }
    }

    await this.prisma.favorite.create({
      data: { userId, billboardId },
      select: { id: true },
    })

    return { favorited: true }
  }
}

