import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator'
import { Role } from '@prisma/client'

export class CreateUserBySuperadminDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsString()
  @MinLength(2)
  fullName!: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10, { message: 'Телефон не короче 10 символов' })
  phone!: string

  @IsIn([Role.USER, Role.COMPANY, Role.SUPERADMIN])
  role!: Role

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string

  @ValidateIf((o) => o.role === Role.COMPANY)
  @IsString()
  @MinLength(2)
  companyName?: string

  @ValidateIf((o) => o.role === Role.COMPANY)
  @IsString()
  @MinLength(2)
  companyCity?: string

  @IsOptional()
  @ValidateIf((o) => o.role === Role.COMPANY)
  @IsString()
  @MaxLength(2000)
  companyDescription?: string

  @IsOptional()
  @ValidateIf((o) => o.role === Role.COMPANY)
  @IsBoolean()
  companyIsVerified?: boolean
}
