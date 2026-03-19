import { IsIn } from 'class-validator'

export class LoginAsDto {
  @IsIn(['admin', 'user'])
  role!: 'admin' | 'user'
}
