import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { SuperAdminGuard } from '../../common/auth/superadmin.guard'
import { CreateUserBySuperadminDto } from './dto/create-user-by-superadmin.dto'
import { UpdateUserBySuperadminDto } from './dto/update-user-by-superadmin.dto'
import { SuperadminUsersService } from './superadmin-users.service'

@Controller('superadmin')
@UseGuards(SuperAdminGuard)
export class SuperadminUsersController {
  constructor(private readonly superadminUsers: SuperadminUsersService) {}

  /** Статические пути `users/...` — до параметризованных `users/:id`. */

  /** Все зарегистрированные аккаунты компаний (роль COMPANY). */
  @Get('users/companies')
  listCompanies() {
    return this.superadminUsers.listCompanyAccounts()
  }

  /** Все зарегистрированные клиенты (роль USER). */
  @Get('users/clients')
  listClients() {
    return this.superadminUsers.listClientAccounts()
  }

  /** Учётки с ролью SUPERADMIN. */
  @Get('users/superadmins')
  listSuperadmins() {
    return this.superadminUsers.listSuperadminAccounts()
  }

  /** Создать пользователя с полным набором полей (как при регистрации + доп. поля). */
  @Post('users')
  createUser(@Body() dto: CreateUserBySuperadminDto) {
    return this.superadminUsers.createUser(dto)
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserBySuperadminDto) {
    return this.superadminUsers.updateUser(id, dto)
  }

  /** Выдать роль SUPERADMIN существующему пользователю. */
  @Post('users/:id/grant-superadmin')
  grantSuperadmin(@Param('id') id: string) {
    return this.superadminUsers.grantSuperadmin(id)
  }
}
