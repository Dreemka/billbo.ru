import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common'
import { IsInt, Min } from 'class-validator'
import { CurrentUser, type JwtUserPayload } from '../../common/auth/current-user.decorator'
import { PrismaService } from '../../prisma/prisma.service'

class TopUpDto {
  @IsInt()
  @Min(1)
  amount!: number
}

@Controller('wallet')
export class WalletController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() user: JwtUserPayload | undefined) {
    if (!user?.sub) throw new UnauthorizedException()
    const exists = await this.prisma.user.findUnique({ where: { id: user.sub } })
    if (!exists) throw new UnauthorizedException()

    const wallet = await this.prisma.wallet.upsert({
      where: { userId: user.sub },
      create: { userId: user.sub, balance: 0 },
      update: {},
      select: { balance: true },
    })

    return wallet
  }

  @Post('top-up')
  async topUp(@CurrentUser() user: JwtUserPayload | undefined, @Body() dto: TopUpDto) {
    if (!user?.sub) throw new UnauthorizedException()
    const exists = await this.prisma.user.findUnique({ where: { id: user.sub } })
    if (!exists) throw new UnauthorizedException()

    const wallet = await this.prisma.wallet.upsert({
      where: { userId: user.sub },
      create: { userId: user.sub, balance: dto.amount },
      update: {
        balance: { increment: dto.amount },
      },
      select: { balance: true },
    })

    const walletRecord = await this.prisma.wallet.findUniqueOrThrow({ where: { userId: user.sub } })
    await this.prisma.walletTransaction.create({
      data: {
        walletId: walletRecord.id,
        type: 'TOPUP',
        amount: dto.amount,
      },
    })

    return wallet
  }
}
