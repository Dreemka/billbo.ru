import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { hash } from 'bcrypt'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
      },
    })

    if (!user) throw new NotFoundException('Пользователь не найден')

    return {
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? '',
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
          avatarUrl: true,
          phone: true,
        },
      })
      return {
        fullName: updated.fullName,
        email: updated.email,
        avatarUrl: updated.avatarUrl ?? '',
        phone: updated.phone ?? '',
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Пользователь не найден')
      }
      throw error
    }
  }

  async changePassword(userId: string, newPassword: string, repeatPassword: string) {
    if (newPassword !== repeatPassword) {
      throw new BadRequestException('Пароли не совпадают')
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hash(newPassword, 10),
      },
      select: { id: true },
    })

    if (!updated) throw new NotFoundException('Пользователь не найден')
    return { success: true }
  }
}
