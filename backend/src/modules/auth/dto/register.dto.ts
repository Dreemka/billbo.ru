import { IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator'
import { Role } from '@prisma/client'

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsString()
  @MinLength(2)
  fullName!: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsEnum(Role)
  role?: Role

  @ValidateIf((o) => (o.role ?? Role.USER) === Role.COMPANY)
  @IsString()
  @MinLength(2)
  companyName?: string

  @ValidateIf((o) => (o.role ?? Role.USER) === Role.COMPANY)
  @IsString()
  @MinLength(2)
  companyCity?: string
}
