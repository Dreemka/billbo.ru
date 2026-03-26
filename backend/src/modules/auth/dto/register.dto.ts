import { Transform } from 'class-transformer'
import { IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator'
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

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10, { message: 'Телефон не короче 10 символов' })
  phone!: string

  @IsOptional()
  @IsIn([Role.USER, Role.COMPANY])
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
