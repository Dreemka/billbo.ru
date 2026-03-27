import { Injectable } from '@nestjs/common'
import { Role } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateCompanyDto } from './dto/update-company.dto'

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { ownerUserId: userId },
    })
    if (!company) {
      return { name: '', city: '', description: '' }
    }
    return {
      name: company.name,
      city: company.city,
      description: company.description ?? '',
    }
  }

  async update(userId: string, dto: UpdateCompanyDto) {
    return this.prisma.company.upsert({
      where: { ownerUserId: userId },
      update: dto,
      create: {
        ownerUserId: userId,
        ...dto,
        isVerified: true,
      },
    })
  }

  /**
   * Клиенты (пользователи), у которых есть бронирования по поверхностям этой компании.
   */
  async listBookingClients(ownerUserId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { role: true },
    })
    if (!owner || owner.role !== Role.COMPANY) {
      return []
    }

    const company = await this.prisma.company.findUnique({
      where: { ownerUserId },
      select: { id: true },
    })
    if (!company) {
      return []
    }

    const stats = await this.prisma.booking.groupBy({
      by: ['userId'],
      where: {
        status: { in: ['PENDING', 'PAID'] },
        surface: { companyId: company.id },
      },
      _count: { id: true },
    })

    if (stats.length === 0) {
      return []
    }

    const userIds = stats.map((s) => s.userId)
    const statByUser = new Map(stats.map((s) => [s.userId, s]))

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
      },
    })

    const rows = users.map((u) => {
      const st = statByUser.get(u.id)!
      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        bookingsWithCompany: st._count.id,
      }
    })

    rows.sort((a, b) => {
      if (b.bookingsWithCompany !== a.bookingsWithCompany) {
        return b.bookingsWithCompany - a.bookingsWithCompany
      }
      return a.fullName.localeCompare(b.fullName, 'ru')
    })

    return rows
  }
}
