import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  Max,
  Min,
  MinLength,
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
}
