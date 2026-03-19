import { Type } from 'class-transformer'
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator'
import { CreateAdSurfaceDto } from './create-ad-surface.dto'

export class CreateAdSurfacesBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAdSurfaceDto)
  surfaces!: CreateAdSurfaceDto[]
}

