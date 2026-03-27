import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { compare, hash } from 'bcrypt'
import { Role } from '@prisma/client'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await hash(dto.password, 10)
    const role = dto.role ?? Role.USER

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          phone: dto.phone,
          role,
        },
      })

      if (role === Role.COMPANY) {
        await tx.company.create({
          data: {
            ownerUserId: created.id,
            name: dto.companyName!,
            city: dto.companyCity!,
            description: '',
            isVerified: true,
          },
        })
      }

      return created
    })

    return this.issueTokens(user.id, user.role)
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const isValid = await compare(dto.password, user.passwordHash)
    if (!isValid) throw new UnauthorizedException('Invalid credentials')

    if (user.role === Role.COMPANY) {
      const company = await this.prisma.company.findUnique({
        where: { ownerUserId: user.id },
        select: { isVerified: true },
      })
      if (!company?.isVerified) {
        throw new UnauthorizedException(
          'Компания не верифицирована. Вход недоступен. Обратитесь к администратору платформы.',
        )
      }
    }

    return this.issueTokens(user.id, user.role)
  }

  loginAs(role: 'admin' | 'user') {
    const appRole = role === 'admin' ? Role.COMPANY : Role.USER
    const payload = { sub: 'local-dev', role: appRole }
    return {
      token: this.jwtService.sign(payload),
      role,
    }
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      }) as { sub: string; role: Role }

      if (payload.role === Role.COMPANY) {
        const company = await this.prisma.company.findUnique({
          where: { ownerUserId: payload.sub },
          select: { isVerified: true },
        })
        if (!company?.isVerified) {
          throw new UnauthorizedException('Компания не верифицирована')
        }
      }

      return this.issueTokens(payload.sub, payload.role)
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  private issueTokens(userId: string, role: Role) {
    const accessToken = this.jwtService.sign({ sub: userId, role })
    const refreshToken = this.jwtService.sign(
      { sub: userId, role },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
        expiresIn: '1d',
      },
    )
    return { accessToken, refreshToken, role }
  }
}
