import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { IsString, MinLength } from 'class-validator'
import { Role } from '@prisma/client'
import { CurrentUser, type JwtUserPayload } from '../../common/auth/current-user.decorator'
import { PrismaService } from '../../prisma/prisma.service'

class CreateBookingDto {
  @IsString()
  @MinLength(2)
  billboardId!: string
}

class CancelBookingDto {
  @IsString()
  @MinLength(2)
  billboardId!: string
}

@Controller('bookings')
export class BookingsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Поверхности с активным бронированием текущего клиента. */
  @Get('mine')
  async listMine(@CurrentUser() user: JwtUserPayload | undefined) {
    if (!user?.sub) throw new UnauthorizedException()
    const u = await this.prisma.user.findUnique({ where: { id: user.sub } })
    if (!u || u.role !== Role.USER) throw new ForbiddenException()

    const rows = await this.prisma.booking.findMany({
      where: {
        userId: user.sub,
        status: { in: ['PENDING', 'PAID'] },
      },
      select: { surfaceId: true },
    })
    const ids = [...new Set(rows.map((r) => r.surfaceId))]
    return { billboardIds: ids }
  }

  /** Отмена бронирования: снова делает поверхность доступной в каталоге. */
  @Post('cancel')
  async cancel(@CurrentUser() user: JwtUserPayload | undefined, @Body() dto: CancelBookingDto) {
    if (!user?.sub) throw new UnauthorizedException()
    const bookingUser = await this.prisma.user.findUnique({ where: { id: user.sub } })
    if (!bookingUser || bookingUser.role !== Role.USER) {
      throw new ForbiddenException('Отмена доступна только клиентским аккаунтам')
    }

    const booking = await this.prisma.booking.findFirst({
      where: {
        userId: user.sub,
        surfaceId: dto.billboardId,
        status: { in: ['PENDING', 'PAID'] },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (!booking) {
      throw new NotFoundException('Активное бронирование не найдено')
    }

    await this.prisma.$transaction(async (tx) => {
      const payments = await tx.payment.count({ where: { bookingId: booking.id } })
      if (payments === 0) {
        await tx.booking.delete({ where: { id: booking.id } })
      } else {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        })
      }
      await tx.adSurface.update({
        where: { id: dto.billboardId },
        data: { isActive: true },
      })
    })
    return { success: true }
  }

  @Post()
  async create(@CurrentUser() user: JwtUserPayload | undefined, @Body() dto: CreateBookingDto) {
    if (!user?.sub) throw new UnauthorizedException()
    const bookingUser = await this.prisma.user.findUnique({ where: { id: user.sub } })
    if (!bookingUser) throw new UnauthorizedException()
    if (bookingUser.role !== Role.USER) {
      throw new ForbiddenException('Бронирование доступно только клиентским аккаунтам')
    }

    const userId = user.sub

    const surface = await this.prisma.adSurface.findUniqueOrThrow({ where: { id: dto.billboardId } })
    if (!surface.isActive) {
      return { success: false }
    }

    await this.prisma.booking.create({
      data: {
        surfaceId: surface.id,
        userId,
        dateFrom: new Date(),
        dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PAID',
        totalPrice: surface.pricePerWeek,
      },
    })
    await this.prisma.adSurface.update({
      where: { id: surface.id },
      data: { isActive: false },
    })
    return { success: true }
  }
}
