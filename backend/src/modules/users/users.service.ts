import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        fullName: true,
        phone: true,
      },
    })

    if (!user) throw new NotFoundException('Пользователь не найден')

    return {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
    }
  }

  async update(userId: string, dto: UpdateUserDto) {
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: dto,
        select: {
          email: true,
          fullName: true,
          phone: true,
        },
      })
      return {
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone ?? '',
      }
    } catch {
      throw new NotFoundException('Пользователь не найден')
    }
  }
}
