import { Body, Controller, ForbiddenException, Post, UnauthorizedException } from '@nestjs/common'
import { IsString, MinLength } from 'class-validator'
import { Role } from '@prisma/client'
import { CurrentUser, type JwtUserPayload } from '../../common/auth/current-user.decorator'
import { PrismaService } from '../../prisma/prisma.service'

class CreateBookingDto {
  @IsString()
  @MinLength(2)
  billboardId!: string
}

@Controller('bookings')
export class BookingsController {
  constructor(private readonly prisma: PrismaService) {}

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
