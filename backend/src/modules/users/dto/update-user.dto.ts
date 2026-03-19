import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

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
}
