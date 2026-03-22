import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateCompanyDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsString()
  @MinLength(2)
  city!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string
}
