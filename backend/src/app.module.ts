import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { CompaniesModule } from './modules/companies/companies.module'
import { AdSurfacesModule } from './modules/ad-surfaces/ad-surfaces.module'
import { PrismaModule } from './prisma/prisma.module'
import { CompanyVerifiedGuard } from './common/auth/company-verified.guard'
import { JwtAuthGuard } from './common/auth/jwt-auth.guard'
import { FavoritesModule } from './modules/favorites/favorites.module'
import { SuperadminModule } from './modules/superadmin/superadmin.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    AdSurfacesModule,
    FavoritesModule,
    SuperadminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CompanyVerifiedGuard,
    },
  ],
})
export class AppModule {}
