/**
 * Bootstrap суперадмина. Запуск: `npx prisma db seed` (без ts-node — работает в prod Docker).
 * Переменные: SUPERADMIN_BOOTSTRAP_EMAIL, SUPERADMIN_BOOTSTRAP_PASSWORD, SUPERADMIN_BOOTSTRAP_NAME
 */
const { PrismaClient, Role } = require('@prisma/client')
const { hash } = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SUPERADMIN_BOOTSTRAP_EMAIL ?? 'lordrema@yandex.ru'
  const password = process.env.SUPERADMIN_BOOTSTRAP_PASSWORD ?? 'Gerda22722'
  const fullName = process.env.SUPERADMIN_BOOTSTRAP_NAME ?? 'Дементий'

  const passwordHash = await hash(password, 10)

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      fullName,
      phone: '+70000000000',
      role: Role.SUPERADMIN,
    },
    update: {
      passwordHash,
      fullName,
      role: Role.SUPERADMIN,
    },
  })

  console.log(`Superadmin upserted: ${email}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    void prisma.$disconnect()
    process.exit(1)
  })
