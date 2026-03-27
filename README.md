# Billbo.ru

Сервис аренды наружной рекламы: **React (Vite)** + **NestJS** + **PostgreSQL** + **Prisma**.

- **`frontend/`** — SPA, MobX, SCSS.
- **`backend/`** — REST API под префиксом `/api`, JWT, роли (в т.ч. суперадмин).

---

## Требования

| Окружение | Нужно |
|-----------|--------|
| Локально без Docker | Node.js **20+**, npm, **PostgreSQL 16** (или совместимая версия) |
| Локально в Docker | **Docker** и **Docker Compose** (v2) |
| Продакшен (VPS) | Docker + Compose; Node на хосте **не обязателен** |

---

## Локальная разработка **без** Docker

### 1. PostgreSQL

Создайте БД и пользователя (пример совпадает с `.env.example` бэкенда):

- база: `billbo`
- пользователь: `postgres` / пароль: `postgres`  
  или пропишите свои учётные данные в `DATABASE_URL`.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Отредактируйте .env: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

API по умолчанию: `http://localhost:4000/api`.

### 3. Frontend

В отдельном терминале:

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:4000/api — для обращения к локальному API
npm run dev
```

Приложение: `http://localhost:5173`.

Опционально в `frontend/.env`:

- **`VITE_YANDEX_MAPS_API_KEY`** — карта и геокодирование в админке.
- **`VITE_ENABLE_DEV_LOGIN=true`** — только для отладки (см. код авторизации).

### 4. Оба сервиса из корня репозитория

```bash
npm install
npm run dev:all
```

Запускает frontend и backend параллельно (нужны настроенные `.env` в `backend/` и `frontend/` и работающий Postgres).

### Полезные команды (локально)

| Команда (из корня) | Назначение |
|--------------------|------------|
| `npm run build:all` | Сборка frontend + backend |
| `npm run lint:all` | Проверка типов / линт |
| `npm run dev:frontend` | Только frontend |
| `npm run dev:backend` | Только backend |

В **`backend/`**: `npm run prisma:studio` — просмотр данных в БД.

---

## Локальная разработка **в** Docker

Файл: **`docker-compose.yml`**. Поднимаются `postgres`, `backend`, `frontend` с монтированием исходников (hot reload).

```bash
# из корня репозитория
docker compose up --build
```

| Сервис | URL / порт |
|--------|------------|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000/api |
| PostgreSQL | `localhost:5432` (логин `postgres`, пароль `postgres`, БД `billbo`) |

Остановка:

```bash
docker compose down
```

Что происходит при старте backend-контейнера: `prisma generate`, **`prisma db push`** (схема без файлов миграций в этом режиме), `start:dev`. Секреты JWT в compose заданы как `replace_me_*` — для серьёзной локальной проверки замените их в `docker-compose.yml`.

Переменные фронта в compose: `VITE_API_BASE_URL=http://localhost:4000/api` — запросы идут на хост с браузера.

---

## Суперадмин (bootstrap)

Скрипт: **`backend/prisma/seed.js`** (CommonJS, без TypeScript) — создаёт или обновляет пользователя с ролью `SUPERADMIN` (`upsert` по email). Команда в **`package.json`**: `node prisma/seed.js` — **не нужен ts-node**, seed стабильно работает в prod Docker.

В **`backend/Dockerfile.prod`** в образ дополнительно ставится только **Prisma CLI** (`npm install prisma@...`), т.к. в `npm ci --omit=dev` devDependencies не попадают.

Предупреждение Prisma про устаревание `package.json#prisma` (миграция на `prisma.config.ts` в Prisma 7) на работу seed не влияет.

### Переменные окружения (рекомендуется)

| Переменная | Назначение |
|------------|------------|
| `SUPERADMIN_BOOTSTRAP_EMAIL` | Email входа |
| `SUPERADMIN_BOOTSTRAP_PASSWORD` | Пароль |
| `SUPERADMIN_BOOTSTRAP_NAME` | Отображаемое имя |

Если переменные **не** заданы, используются значения по умолчанию из `seed.js` — **смените их на проде** и не публикуйте реальные пароли в репозитории.

### Локально (без Docker)

Из каталога `backend`, с настроенным `DATABASE_URL` в `.env`:

```bash
cd backend
export SUPERADMIN_BOOTSTRAP_EMAIL='you@example.com'
export SUPERADMIN_BOOTSTRAP_PASSWORD='надёжный-пароль'
npm run prisma:seed
# то же самое: npx prisma db seed
```

### Локально (Docker Compose)

Когда контейнеры уже запущены:

```bash
docker compose exec backend npx prisma db seed
```

С кастомными переменными:

```bash
docker compose exec \
  -e SUPERADMIN_BOOTSTRAP_EMAIL='you@example.com' \
  -e SUPERADMIN_BOOTSTRAP_PASSWORD='надёжный-пароль' \
  backend npx prisma db seed
```

### Продакшен (VPS)

На сервере **не нужен** установленный Node/npm на хосте: seed выполняется **внутри** контейнера `backend`, где уже есть `DATABASE_URL` к Postgres.

Из **корня** репозитория на сервере (рядом с `docker-compose.prod.yml` и `.env.deploy`):

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml exec backend npx prisma db seed
```

С явными переменными:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml exec \
  -e SUPERADMIN_BOOTSTRAP_EMAIL='you@example.com' \
  -e SUPERADMIN_BOOTSTRAP_PASSWORD='надёжный-пароль' \
  backend npx prisma db seed
```

После изменений в `Dockerfile.prod`, `package.json` (seed) или `tsconfig.json` пересоберите образ и только потом снова запускайте seed:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.deploy -f docker-compose.prod.yml exec backend npx prisma db seed
```

---

## Деплой на VPS (production, HTTPS)

Стек: **PostgreSQL** + **NestJS** (миграции при старте) + **статика фронта (nginx в образе)** + **[Caddy](https://caddyserver.com/)** с Let’s Encrypt для **https://billbo.ru**.

Маршрутизация задаётся в **`deploy/Caddyfile`**: `/api*` → backend, остальное → frontend.

### 1. DNS

- Запись **A** для `billbo.ru` → публичный IP VPS (при необходимости — и для `www`).
- Пока DNS не указывает на сервер, Caddy не сможет выдать сертификат.

### 2. Секреты на сервере

```bash
cp deploy.env.example .env.deploy
nano .env.deploy
```

Заполните как минимум:

- **`POSTGRES_PASSWORD`** — пароль БД;
- **`JWT_ACCESS_SECRET`**, **`JWT_REFRESH_SECRET`** — длинные случайные строки;
- **`VITE_API_BASE_URL`** — для продакшена обычно **`/api`** (один домен, прокси в Caddy).

Опционально в `.env.deploy`:

```bash
# VITE_YANDEX_MAPS_API_KEY=...   # карты на проде
```

### 3. Запуск

Из корня репозитория на сервере:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml up -d --build
```

Проверка: `https://billbo.ru`, API: `https://billbo.ru/api`.

Остановка:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml down
```

### 4. Обновление после правок в коде

Доставьте новый код на сервер и снова выполните:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml up -d --build
```

### 5. Деплой с вашего компьютера (rsync + перезапуск)

Если настроен SSH-доступ:

```bash
chmod +x deploy/sync-and-up.sh
./deploy/sync-and-up.sh user@ВАШ_IP /opt/billbo.ru
```

Скрипт копирует проект (с исключениями) и на сервере запускает `docker compose ... up -d --build`. Файл **`.env.deploy` на сервере не перезаписывается** — создайте его там один раз вручную.

---

## Кратко: где что запускать

| Сценарий | Команда / место |
|----------|------------------|
| Разработка, свой Postgres | `npm run dev:all` из корня + `.env` в `backend/` и `frontend/` |
| Разработка в Docker | `docker compose up --build` |
| Прод | `docker compose --env-file .env.deploy -f docker-compose.prod.yml up -d --build` |
| Суперадмин локально | `cd backend && npm run prisma:seed` (или `docker compose exec backend npx prisma db seed`) |
| Суперадмин на VPS | `docker compose ... exec backend npx prisma db seed` (см. выше) |

---

## Маршруты приложения (ориентир)

| Путь | Назначение |
|------|------------|
| `/admin/company` | Профиль компании |
| `/admin/billboards` | Конструкции (админ) |
| `/user/profile` | Профиль пользователя |
| `/user/wallet` | Кошелёк |
| `/user/marketplace` | Витрина / карта |

---

## Безопасность

- Не коммитьте **`.env`**, **`.env.deploy`**, пароли и JWT.
- На проде используйте сильные секреты и задавайте суперадмина через **`SUPERADMIN_BOOTSTRAP_*`**, а не дефолты из кода.
- Предпочтительно вход по **SSH-ключу**; отключение парольного входа для `root` после настройки.

---

## Устранение неполадок

| Проблема | Что проверить |
|----------|----------------|
| На VPS `npx: command not found` | Запускайте Prisma **внутри контейнера** (`docker compose ... exec backend ...`), не на голом хосте без Node. |
| `Cannot find module 'ts-node/register'` или `spawn ts-node ENOENT` | Убедитесь, что в репозитории seed — это **`prisma/seed.js`** и `package.json` содержит `"seed": "node prisma/seed.js"`. Пересоберите образ backend. |
| Нет карты / геокодера | Задан ли **`VITE_YANDEX_MAPS_API_KEY`** при сборке фронта (локальный `.env` или `.env.deploy` + пересборка prod). |
| Бэкенд не подключается к БД | `DATABASE_URL`, доступность Postgres, для Docker — имя хоста `postgres`, не `localhost`, из контейнера backend. |
