import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsString,
  Max,
  Min,
  MinLength,
  IsOptional,
  MaxLength,
} from 'class-validator'

export enum SurfaceTypeDto {
  BILLBOARD = 'billboard',
  CITYBOARD = 'cityboard',
  SUPERSITE = 'supersite',
  DIGITAL = 'digital',
}

export class CreateAdSurfaceDto {
  @IsString()
  @MinLength(3)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsEnum(SurfaceTypeDto)
  type!: SurfaceTypeDto

  @IsString()
  @MinLength(5)
  address!: string

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number

  @IsNumber()
  @Min(1)
  pricePerWeek!: number

  @IsString()
  size!: string

  @IsBoolean()
  available!: boolean

  @IsOptional()
  @IsObject()
  // Prisma ожидает InputJsonValue, поэтому используем максимально общий тип.
  extraFields?: any
}
