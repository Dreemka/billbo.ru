import { Body, Controller, Get, Post } from '@nestjs/common'
import { IsInt, Min } from 'class-validator'
import { CurrentUser } from '../../common/auth/current-user.decorator'
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
  async me(@CurrentUser() user: { sub: string } | undefined) {
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

    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
      select: { balance: true },
    })

    return wallet
  }

  @Post('top-up')
  async topUp(@CurrentUser() user: { sub: string } | undefined, @Body() dto: TopUpDto) {
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
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, balance: dto.amount },
      update: {
        balance: { increment: dto.amount },
      },
      select: { balance: true },
    })

    const walletRecord = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } })
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
