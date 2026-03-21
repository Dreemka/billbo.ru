# Billbo.ru Workspace

Проект разделен на две независимые части:

- `frontend/` - React + Vite + TypeScript приложение
- `backend/` - NestJS + Prisma + PostgreSQL API

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

## Workspace команды (из корня)

```bash
npm install
npm run dev:all
```

Дополнительно:

- `npm run build:all` - сборка frontend + backend
- `npm run lint:all` - проверка типов/линт обеих частей
- `npm run dev:frontend` - запустить только frontend
- `npm run dev:backend` - запустить только backend

## Docker Compose

Поднимает `postgres`, `backend`, `frontend`:

```bash
docker compose up --build
```

Сервисы:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- Postgres: `localhost:5432`

Остановить и удалить контейнеры:

```bash
docker compose down
```

## Деплой на VPS (production, HTTPS)

Стек: PostgreSQL + Nest (миграции при старте) + статика фронта в Nginx + [Caddy](https://caddyserver.com/) с автоматическим Let’s Encrypt для **https://billbo.ru**.

### 1. DNS

- Запись **A** для `billbo.ru` → публичный IP VPS (и при необходимости для `www`).
- Пока DNS не указал на сервер, Caddy не сможет выдать сертификат.

### 2. Файлы на сервере

Скопируйте репозиторий в каталог, например `/opt/billbo.ru` (`git clone` или `rsync`).

Создайте секреты (файл **не коммитится**):

```bash
cp deploy.env.example .env.deploy
nano .env.deploy   # POSTGRES_PASSWORD, JWT_*
```

### 3. Запуск

Из корня репозитория на сервере:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml up -d --build
```

Проверка: `https://billbo.ru` и `https://billbo.ru/api` (API отвечает под префиксом `/api`).

Остановка:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml down
```

### 4. Обновление после правок в коде

Снова доставьте код на сервер и выполните ту же команду `up -d --build`.

### Скрипт с вашего компьютера

Если SSH-ключ уже настроен для `root@ВАШ_IP`:

```bash
chmod +x deploy/sync-and-up.sh
./deploy/sync-and-up.sh root@ВАШ_IP /opt/billbo.ru
```

Перед первым запуском на сервере один раз создайте там `.env.deploy` (см. шаг 2).

### Замечания по безопасности

- Не публикуйте пароли и JWT в репозиторий.
- Предпочтительно вход по **SSH-ключу**, отключить парольный вход для `root` после настройки.
- IP и логин сервера не стоит светить в публичных чатах.

# Billbo.ru Frontend

Каркас веб-сервиса аренды наружной рекламы для двух ролей:
- компания (админ): управление профилем и рекламными конструкциями;
- клиент (пользователь): профиль, кошелек, просмотр и бронирование.

## Stack

- React + Vite + TypeScript
- SCSS
- React Router
- MobX + mobx-react-lite
- Axios

## Быстрый старт

```bash
npm install
npm run dev
```

## Что уже реализовано

- Роутинг для двух кабинетов:
  - `/admin/company`
  - `/admin/billboards`
  - `/user/profile`
  - `/user/wallet`
  - `/user/marketplace`
- MobX-сторы:
  - сессия и роль;
  - профиль компании;
  - список рекламных элементов (CRUD);
  - профиль пользователя и баланс кошелька.
- Пользовательский сценарий:
  - просмотр доступных конструкций;
  - бронирование и списание из кошелька.

## Дальше (рекомендуется)

- Подключить backend и заменить mock-данные на реальные API-запросы.
- Добавить карту (Yandex Maps/Google Maps/Mapbox) и отрисовку точек из `lat/lng`.
- Добавить полноценную авторизацию и разграничение доступа к роутам.
