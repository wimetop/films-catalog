# Films Catalog

Каталог фільмів із деталями та персональним списком обраного. Проєкт побудований на Next.js App Router, Better Auth, Supabase Postgres і Drizzle ORM.

## Можливості

- Публічний каталог: `/items`.
- Деталі фільму: `/items/[id]`.
- Реєстрація та вхід за email і паролем: `/register`, `/login`.
- Захищене обране: `/favorites`.
- Додавання й видалення обраного без повного перезавантаження сторінки.
- Ізоляція обраного за `userId` на рівнях БД, API та ключів TanStack Query.

## Технології

- Next.js 16, App Router, Server Components і `proxy.ts`.
- TypeScript.
- Supabase Postgres.
- Drizzle ORM + Drizzle Kit.
- Better Auth з `drizzleAdapter`.
- TanStack Query для клієнтського кешу та optimistic updates.
- react-hook-form для форм входу й реєстрації.

## Запуск

1. Встанови залежності:

   ```bash
   npm install
   ```

2. Створи `.env.local` на основі `.env.example`:

   ```env
   DATABASE_URL="postgresql://..."
   DIRECT_URL="postgresql://..."
   BETTER_AUTH_SECRET="мінімум-32-символи"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

   - `DATABASE_URL` — transaction pooler Supabase для runtime-запитів.
   - `DIRECT_URL` — session pooler / пряме підключення для Drizzle Kit.
   - Не коміть `.env.local` і реальні секрети.

3. Створи таблиці та заповни каталог:

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:security
   npm run db:seed
   ```

4. Запусти застосунок:

   ```bash
   npm run dev
   ```

   Відкрий [http://localhost:3000/items](http://localhost:3000/items).

## Команди

| Команда | Призначення |
| --- | --- |
| `npm run dev` | локальний Next.js сервер |
| `npm run build` | production-збірка |
| `npm run lint` | ESLint |
| `npm test` | Vitest-тести |
| `npm run db:generate` | створити SQL-міграцію Drizzle |
| `npm run db:push` | застосувати схему до БД |
| `npm run db:security` | увімкнути RLS і закрити Data API доступ до таблиць |
| `npm run db:security:verify` | перевірити RLS і відсутність Data API `SELECT` доступу |
| `npm run db:seed` | додати 10 тестових фільмів |
| `npm run test:e2e:local` | перевірити register/login/favorites через локальний dev server |

## Архітектура

```text
src/
├── app/              # маршрути Next.js: (web), (api), providers
├── config/           # routes, публічні та server env-конфіги
├── db/               # Drizzle client і schema
├── entities/         # item, favorite, session
├── features/         # auth-by-email, toggle-favorite
├── shared/           # auth client, утиліти, базові типи
├── views/            # композиція сторінок FSD
└── widgets/          # header, catalog, favorites list
```

`src/views` використовується замість FSD-папки `src/pages`, оскільки `src/pages` є зарезервованою директорією Next.js для Pages Router.

### Дані та кеш

- Початкові списки і деталі читаються серверними компонентами через Drizzle.
- Публічний список `items` має Next Data Cache з revalidation раз на 60 секунд; персональні favorites не кешуються на сервері між користувачами.
- Клієнтські компоненти отримують ці дані як `initialData` у TanStack Query.
- Ключ обраного має форму `['favorites', userId]`; це не дозволяє кешу одного користувача потрапити до іншого.
- Мутації обраного оптимістично оновлюють UI, виконують rollback при помилці та інвалідують відповідний ключ.

### Безпека

- `/favorites` захищено в `src/proxy.ts` і повторно перевіряє сесію на сервері.
- API favorites також визначає користувача лише з Better Auth session, не з клієнтського `userId`.
- У БД є унікальний індекс `(user_id, item_id)`, який забороняє дублікати.
- RLS увімкнено для всіх таблиць, а ролі Supabase Data API `anon` та `authenticated` не мають `SELECT` доступу. Застосунок працює через серверне Drizzle-підключення.
- `.env.local` не потрапляє у Git; `.env.example` навмисно є винятком і має бути закомічений.

## Перевірка сценаріїв

За запущеного `npm run dev` можна виконати повний smoke-flow без залишкових даних:

```bash
npm run test:e2e:local
```

Скрипт створює унікальний тимчасовий акаунт, перевіряє register → sign out → login → add/remove favorite та видаляє акаунт у `finally`.

1. Відкрий `/items` — має бути 10 seeded-фільмів.
2. Відкрий картку фільму — URL має бути `/items/[id]`.
3. Як гість відкрий `/favorites` — має бути редірект на `/login?next=/favorites`.
4. Зареєструйся або увійди, додай фільм в обране, онови сторінку.
5. Перевір `/favorites`, видали фільм і переконайся, що UI оновився без page reload.
6. Увійди іншим акаунтом — обране першого акаунта не повинно відображатися.
