import { IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateCompanyDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsString()
  @MinLength(2)
  city!: string

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string
}
