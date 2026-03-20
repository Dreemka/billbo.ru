import { IsString, MinLength } from 'class-validator'

export class ToggleFavoriteDto {
  @IsString()
  @MinLength(1)
  billboardId!: string
}

