import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Role } from '@prisma/client'
import { hash } from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateUserBySuperadminDto } from './dto/create-user-by-superadmin.dto'
import type { UpdateUserBySuperadminDto } from './dto/update-user-by-superadmin.dto'

@Injectable()
export class SuperadminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  listCompanyAccounts() {
    return this.prisma.user.findMany({
      where: { role: Role.COMPANY },
      orderBy: { createdAt: 'desc' },
      include: { company: true },
    })
  }

  listClientAccounts() {
    return this.prisma.user.findMany({
      where: { role: Role.USER },
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: true,
        _count: { select: { favorites: true, bookings: true } },
      },
    })
  }

  /** Учётки с ролью SUPERADMIN (не попадают в списки компаний и клиентов). */
  listSuperadminAccounts() {
    return this.prisma.user.findMany({
      where: { role: Role.SUPERADMIN },
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: true,
        _count: { select: { favorites: true, bookings: true } },
      },
    })
  }

  async createUser(dto: CreateUserBySuperadminDto) {
    const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (emailTaken) {
      throw new ConflictException('Этот email уже занят')
    }

    const passwordHash = await hash(dto.password, 10)
    const role = dto.role

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            phone: dto.phone,
            role,
            avatarUrl: dto.avatarUrl?.trim() || null,
          },
        })

        if (role === Role.COMPANY) {
          await tx.company.create({
            data: {
              ownerUserId: created.id,
              name: dto.companyName!,
              city: dto.companyCity!,
              description: dto.companyDescription?.trim() || null,
              isVerified: dto.companyIsVerified ?? false,
            },
          })
        }

        return created
      })

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Этот email уже занят')
      }
      throw e
    }
  }

  async updateUser(userId: string, dto: UpdateUserBySuperadminDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    })
    if (!existing) throw new NotFoundException('Пользователь не найден')

    const emailTaken = await this.prisma.user.findFirst({
      where: { email: dto.email, NOT: { id: userId } },
    })
    if (emailTaken) throw new ConflictException('Этот email уже занят')

    await this.prisma.$transaction(async (tx) => {
      const newRole = dto.role

      if (existing.role === Role.COMPANY && newRole !== Role.COMPANY) {
        await tx.company.deleteMany({ where: { ownerUserId: userId } })
      }

      const updateData: Prisma.UserUpdateInput = {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl?.trim() || null,
        role: newRole,
      }
      if (dto.password?.trim()) {
        updateData.passwordHash = await hash(dto.password.trim(), 10)
      }

      await tx.user.update({
        where: { id: userId },
        data: updateData,
      })

      if (newRole === Role.COMPANY) {
        const comp = await tx.company.findUnique({ where: { ownerUserId: userId } })
        if (comp) {
          await tx.company.update({
            where: { id: comp.id },
            data: {
              name: dto.companyName!,
              city: dto.companyCity!,
              description: dto.companyDescription?.trim() || null,
              isVerified: dto.companyIsVerified ?? false,
            },
          })
        } else {
          await tx.company.create({
            data: {
              ownerUserId: userId,
              name: dto.companyName!,
              city: dto.companyCity!,
              description: dto.companyDescription?.trim() || null,
              isVerified: dto.companyIsVerified ?? false,
            },
          })
        }
      }
    })

    return { success: true }
  }

  async grantSuperadmin(userId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!existing) throw new NotFoundException('Пользователь не найден')
    if (existing.role === Role.SUPERADMIN) {
      throw new BadRequestException('У пользователя уже есть супер-права')
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.SUPERADMIN },
    })
    return { success: true }
  }
}
