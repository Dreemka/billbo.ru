# API Contract for Frontend

Этот контракт синхронизирован с текущим фронтендом (`src/shared/api/services.ts`).

## Auth

### `POST /auth/login`
Request:

```json
{ "email": "user@example.com", "password": "secret12" }
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "role": "USER"
}
```

`role` — значение Prisma enum: `USER`, `COMPANY`, `SUPERADMIN`.

### `POST /auth/register`
Request:

```json
{
  "email": "company@example.com",
  "password": "secret12",
  "fullName": "ООО Реклама",
  "phone": "+79001234567",
  "role": "COMPANY"
}
```

`role`: `USER` (клиент) или `COMPANY` (кабинет компании). Ответ как у `login`.

### `POST /auth/login-as` (dev)
Request:

```json
{ "role": "admin" }
```

Response:

```json
{ "token": "jwt", "role": "admin" }
```

## Company

### `PUT /company/profile`
Request:

```json
{
  "name": "Billbo Media",
  "city": "Moscow",
  "description": "Аренда наружной рекламы"
}
```

Response: same object.

## Billboards

### `GET /billboards`
Response:

```json
[
  {
    "id": "bb-1",
    "title": "Ленинградский пр-т, 20",
    "type": "billboard",
    "address": "Москва, Ленинградский проспект, 20",
    "lat": 55.794,
    "lng": 37.545,
    "pricePerWeek": 65000,
    "size": "3x6 м",
    "available": true
  }
]
```

### `POST /billboards`
Body: `Omit<Billboard, id>`
Response: `Billboard`

### `POST /billboards/bulk`
Body:

```json
{
  "surfaces": [
    {
      "title": "Ленинградский пр-т, 20",
      "type": "billboard",
      "address": "Москва, Ленинградский проспект, 20",
      "lat": 55.794,
      "lng": 37.545,
      "pricePerWeek": 65000,
      "size": "3x6 м",
      "available": true
    }
  ]
}
```

Response:

```json
{ "success": true, "created": 1 }
```

### `PUT /billboards/:id`
Body: `Omit<Billboard, id>`
Response: `Billboard`

### `DELETE /billboards/:id`
Response: `204 No Content`

## User

### `PUT /user/profile`
Request:

```json
{
  "fullName": "Иван Петров",
  "email": "ivan@example.com",
  "phone": "+79991234567"
}
```

Response: same object.

## Wallet

### `POST /wallet/top-up`
Request:

```json
{ "amount": 50000 }
```

Response:

```json
{ "balance": 200000 }
```

## Bookings

### `POST /bookings`
Request:

```json
{ "billboardId": "bb-1" }
```

Response:

```json
{ "success": true }
```
