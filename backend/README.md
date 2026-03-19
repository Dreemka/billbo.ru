# Billbo Backend Blueprint (NestJS + Prisma)

Этот каталог содержит стартовый каркас backend-части для сервиса аренды наружной рекламы.

## Рекомендуемый стек

- NestJS
- PostgreSQL
- Prisma ORM
- JWT (access + refresh)
- Redis (locks/cache)
- Swagger

## Структура

- `prisma/schema.prisma` - модели БД
- `src/modules/auth` - auth DTO + controller skeleton
- `src/modules/users` - профиль пользователя
- `src/modules/companies` - профиль компании
- `src/modules/ad-surfaces` - рекламные поверхности
- `API_CONTRACT.md` - контракты API для фронтенда

## Как использовать

1. Создайте NestJS проект в `backend/`.
2. Подключите `schema.prisma` и выполните миграции.
3. Реализуйте сервисы в модулях на основе DTO и контрактов.
4. На фронте замените fallback в store на реальные ответы API.
