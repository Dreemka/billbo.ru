import { Injectable } from '@nestjs/common'
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
      },
    })
  }
}
