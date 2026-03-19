import { Body, Controller, Post } from '@nestjs/common'
import { IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../../common/auth/current-user.decorator'
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
  async create(@CurrentUser() user: { sub: string } | undefined, @Body() dto: CreateBookingDto) {
    const userId = user?.sub ?? 'local-dev'
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@local.dev`,
        fullName: 'Local Dev User',
        passwordHash: 'local-dev-hash',
        role: 'USER',
      },
    })

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
