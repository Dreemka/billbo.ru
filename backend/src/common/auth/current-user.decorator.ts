import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface JwtUserPayload {
  sub: string
  role: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtUserPayload | undefined => {
    const request = context.switchToHttp().getRequest()
    return request.user as JwtUserPayload | undefined
  },
)
