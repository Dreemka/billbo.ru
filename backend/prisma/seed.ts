import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcrypt'

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

  // eslint-disable-next-line no-console
  console.log(`Superadmin upserted: ${email}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    void prisma.$disconnect()
    process.exit(1)
  })
