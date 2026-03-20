import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string

  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  @MinLength(10)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string
}
