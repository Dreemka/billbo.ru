import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
      },
    })

    if (user) return user

    // Create a local dev user record if it doesn't exist yet.
    return this.prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@local.dev`,
        fullName: '',
        phone: null,
        passwordHash: 'local-dev-hash',
        role: 'USER',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
      },
    })
  }

  async update(userId: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return this.prisma.user.create({
        data: {
          id: userId,
          email: dto.email,
          fullName: dto.fullName,
          phone: dto.phone,
          passwordHash: 'local-dev-hash',
          role: 'USER',
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
        },
      })
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
      },
    })
  }
}
