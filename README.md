# Films Catalog

Каталог фільмів із деталями та персональним списком обраного. Проєкт побудований на Next.js App Router, Better Auth, Supabase Postgres і Drizzle ORM.

## Можливості

- Публічний каталог: `/items`.
- Деталі фільму: `/items/[id]`.
- Створення фільму через `POST /api/items` для авторизованого користувача.
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

3. Застосуй закомічені міграції та заповни каталог:

   ```bash
   npm run db:migrate
   npm run db:security
   npm run db:seed
   ```

   `npm run db:generate` потрібна лише тоді, коли ти змінив Drizzle schema і хочеш створити **нову** migration. `npm run db:push` не використовуй для production або для цього контрольованого локального сценарію.

4. Запусти застосунок і воркер у різних терміналах:

   **Термінал 1 — Next.js UI та API:**

   ```bash
   npm run dev
   ```

   **Термінал 2 — Redis** (лише якщо не використовуєш віддалений Upstash):

   ```bash
   npm run docker:dev-redis:up
   ```

   **Термінал 3 — BullMQ worker:**

   ```bash
   npm run worker
   ```

   Ця окрема development Compose-конфігурація публікує Redis на host-порті
   `6379` і не читає `.env`, тому не потребує database або auth secrets. Вона
   запускається в окремому Compose project `filmscatalog-dev-redis`, не є
   production Compose stack і не відкриває production Redis назовні.
   Зупинити її можна командою `npm run docker:dev-redis:down`. Якщо
   використовується Upstash через `REDIS_URL`, термінал 2 не потрібен. `npm run
   worker` explicitly завантажує `.env.local` до старту standalone
   Node-процесу. У production ті самі змінні передаються середовищем платформи,
   а не файлом.

### Redis: локально або Upstash

Застосунок використовує `ioredis` і BullMQ, тому змінна `REDIS_URL` завжди має містити **TCP Redis URL**.

Локальний Redis (Docker або Redis-сумісний сервер для Windows):

```env
REDIS_URL="redis://localhost:6379"
```

`redis://localhost:6379` застосовується лише до host development у
`.env.local`. У Docker Compose `.env` за замовчуванням містить
`redis://redis:6379`, тобто приватне ім'я сервісу всередині Compose network.

Upstash Redis через TLS:

```env
REDIS_URL="rediss://default:<UPSTASH_PASSWORD>@<UPSTASH_HOST>:6379"
```

Зберігайте це значення лише в `.env.local`. `UPSTASH_REDIS_REST_URL` і `UPSTASH_REDIS_REST_TOKEN` не підходять для BullMQ: це REST credentials, а worker потребує TCP Redis-з'єднання.

Після зміни `REDIS_URL` або Redis-конфігурації **обов'язково перезапусти і Next.js, і worker**. У development клієнт Redis зберігається в `globalThis`, тому HMR не створює нове з'єднання автоматично:

```bash
# у кожному з терміналів з Next.js / worker
Ctrl + C
npm run dev       # термінал 1
npm run worker    # термінал 3
```

Відкрий [http://localhost:3000/items](http://localhost:3000/items).

## Docker Compose

Compose читає файл `.env`, а не `.env.local`. Перед першим запуском скопіюйте
шаблон і замініть **усі** placeholder-значення; не комітьте `.env`.

```powershell
Copy-Item .env.example .env
```

### Зовнішня PostgreSQL (звичайний deployment)

Це стандартний режим. У `.env` вкажіть реальні зовнішні PostgreSQL URL:

- `DATABASE_URL` — runtime URL (за потреби transaction pooler);
- `DIRECT_URL` — прямий або session-pooler URL для Drizzle migrations;
- `POSTGRES_PASSWORD` — заповніть значенням-заглушкою або секретом: Compose
  вимагає його під час інтерполяції, але сервіс `postgres` у цьому режимі не
  запускається. Значення має містити лише URL-safe символи `A-Z`, `a-z`,
  `0-9`, `.`, `_`, `~` або `-`;
- `BETTER_AUTH_SECRET` — випадковий секрет щонайменше з 32 символів;
- `NEXT_PUBLIC_APP_URL` — публічна адреса застосунку; це єдина змінна, що
  передається в Docker build.

Зовнішній користувач БД повинен мати права застосувати вже закомічені
migrations. Після налаштування `.env` виконайте точні lifecycle-команди:

```bash
npm run docker:build
npm run docker:up
```

`migrate` застосовує Drizzle migrations через `DIRECT_URL` і має завершитися
успішно до старту `web` та `worker`. Повторний `up` без нових migrations є
безпечним. `web` — єдиний сервіс, який публікує `http://localhost:3000`; Redis,
worker, migrate та зовнішній database connection не мають host-портів.

`npm run docker:build` і `npm run docker:up` спочатку запускають
`npm run verify:docker-env`, який перевіряє URL-safe `POSTGRES_PASSWORD` без
виведення його значення.

### Повністю локальна PostgreSQL і demo-каталог

Для локальної БД не видаляйте зовнішні URL з `.env`: overlay детерміновано
перевизначає URL усіх database consumers на приватний `postgres:5432`. Він
використовує той самий `POSTGRES_PASSWORD`, що й контейнер Postgres. Встановіть
не закодований пароль лише з `A-Z`, `a-z`, `0-9`, `.`, `_`, `~` і `-`; validator
відхилить інші символи, щоб URL consumers не отримали інший пароль.

```bash
npm run docker:local:up
```

Щоб після migrations один раз додати demo-каталог, додайте профіль `demo`:

```bash
npm run docker:local:demo
```

`seed` очікує успішний `migrate`, додає тестові фільми та завершується; він не є
довготривалим сервісом. Для наступних запусків без повторного seed використовуйте
лише профіль `local-db`. На першій ініціалізації порожнього local Postgres
контейнер виконує idempotent SQL, який створює NOLOGIN ролі `anon` і
`authenticated` до migrations; це необхідно для закомічених `REVOKE` statements
і не впливає на external database deployment.

### Health, logs і завершення

`GET /api/health` перевіряє готовність БД. Якщо БД доступна і Redis доступний,
відповідь — `200` зі статусом `ok`. Якщо Redis тимчасово недоступний, відповідь
залишається `200` зі статусом `degraded`: каталог продовжує працювати через БД.
Лише недоступна БД повертає `503` (`down`). Docker healthcheck web сервісу
використовує саме цей endpoint.

```bash
npm run docker:logs
npm run docker:down
```

`docker:logs` підписується на логи всіх сервісів; `docker:down` коректно зупиняє
стандартний external-DB stack. Web має 30-секундний, а worker — 60-секундний
grace period для завершення роботи. Для local-db передайте той самий overlay під
час shutdown:

```bash
npm run docker:local:down
```

Ця команда зберігає named volumes Redis і Postgres. Додавайте `-v` лише якщо
свідомо хочете незворотно видалити локальні Redis/Postgres дані.

### Типові помилки запуску

| Повідомлення | Причина та дія |
| --- | --- |
| `Stream isn't writeable and enableOfflineQueue options is false` | Запущено застарілий процес Next.js або worker зі старою конфігурацією Redis. Зупини процес через `Ctrl + C` і запусти його знову. Також перевір, що `REDIS_URL` — TCP URL `redis://` або `rediss://`, не Upstash REST URL. |
| `Custom Id cannot contain :` | Працює застарілий worker або в Redis залишилися repeatable jobs зі старим `jobId`. Онови код і перезапусти `npm run worker`; нові jobs не задають custom `jobId`. |
| `relation "outbox_events" does not exist` | Не застосовані outbox migrations. Виконай `npm run db:migrate` з коректним `DIRECT_URL`, потім перезапусти worker. |
| `Invalid server environment: REDIS_URL ...` | У `.env.local` відсутній `REDIS_URL`. Скопіюй значення з прикладу нижче: локально `redis://localhost:6379`, для Upstash — TCP `rediss://...`, не REST URL. |
| `Worker ready { queues: ['catalog', 'favorites'] }` | Це нормальне повідомлення: процес підключився до двох ізольованих BullMQ черг і очікує задачі. |

## Команди

| Команда | Призначення |
| --- | --- |
| `npm run dev` | локальний Next.js сервер |
| `npm run build` | production-збірка |
| `npm run lint` | ESLint |
| `npm test` | Vitest-тести |
| `npm run db:generate` | створити SQL-міграцію Drizzle |
| `npm run db:push` | застосувати схему до БД |
| `npm run db:migrate` | застосувати вже закомічені Drizzle migrations (production) |
| `npm run db:security` | увімкнути RLS і закрити Data API доступ до таблиць |
| `npm run db:security:verify` | перевірити RLS і відсутність Data API `SELECT` доступу |
| `npm run db:seed` | додати 10 тестових фільмів |
| `npm run test:e2e:local` | перевірити register/login/favorites через локальний dev server |
| `npm run worker` | окремий BullMQ-процес: `catalog` worker для scheduler/outbox/cache і `favorites` worker для пакетного recount |
| `npm run docker:dev-redis:up` | запустити лише host-development Redis на `localhost:6379`, без `.env` або application secrets |
| `npm run docker:dev-redis:down` | зупинити host-development Redis |
| `npm run verify:docker-env` | перевірити URL-safe `POSTGRES_PASSWORD` у Docker `.env` |
| `npm run docker:local:up` | перевірити Docker `.env` і запустити local-db overlay |
| `npm run docker:local:demo` | перевірити Docker `.env`, запустити local-db overlay та одноразовий demo seed |
| `npm run docker:local:down` | коректно зупинити local-db overlay |
| `npm run docker:build` | зібрати Docker Compose images для стандартного external-DB stack |
| `npm run docker:up` | запустити стандартний external-DB stack у фоні |
| `npm run docker:logs` | підписатися на логи Docker Compose сервісів |
| `npm run docker:down` | коректно зупинити стандартний external-DB stack, зберігши named volumes |

### Production migrations

Перед deploy нової версії застосунку застосуйте **вже закомічені** SQL migrations до production БД. Виконуйте це один раз у CI/CD або в захищеному terminal, де `DIRECT_URL` вказує на production Supabase direct/session-pooler URL:

```bash
npm ci
npm run db:migrate
```

Для поточного Redis/outbox релізу обов'язкові migrations `drizzle/0002_supreme_giant_man.sql`–`drizzle/0006_favorites_item_id_index.sql`.

Не використовуйте `npm run db:push` у production: ця команда синхронізує schema напряму і не є контрольованим migration rollout. Після успішної міграції deploy API, а worker запускайте окремим процесом:

```bash
npm run build
npm run start
npm run worker
```

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

- Redis використовується як cache-aside зі stale-while-revalidate: після основного TTL список, деталі та trending можуть коротко віддати останнє валідне значення, поки один фоновий refresh оновлює його. Недоступний Redis не ламає каталог, бо є fallback у БД.
- Ключі версіоновані (`cat:v1:*`); список має TTL 60 с, деталі — 300 с, а негативний кеш 404 — 30 с.
- Single-flight Redis lock з TTL захищає гарячі ключі від cache stampede; lock звільняється лише власником token через атомарний Lua script.
- BullMQ має ізольовані черги: `catalog` виконує scheduler/outbox/cache jobs, а `favorites` — тільки recount. Це не дозволяє масовим змінам обраного блокувати delivery outbox або прогрів каталогу.
- Зміна favorite записується разом з `outbox_events` в одній транзакції Postgres. Окремий scheduler опитує pending outbox раз на 2 секунди, групує до 100 подій у **одну** `favorites:recount` задачу з унікальними `itemId` і позначає події delivered лише після успішного enqueue. Після 10 помилок доставка переходить у dead-letter для діагностики, а не ретраїться нескінченно.
- Якщо `favorites:recount` вичерпала 3 BullMQ attempts, outbox-події вже можуть бути delivered. Рейтинг тимчасово буде застарілим, але наступний `trending:rebuild` відновить Redis ZSET із Postgres; failed job потрібно перевірити в BullMQ monitoring/logs.
- Після старту worker створює один `cache:warm` job. Публічні API `items` і `trending` мають distributed Redis rate limit лише за безпечної proxy identity; захист POST `/api/items` і favorites застосовується за `userId` завжди.

- Початкові списки і деталі читаються серверними компонентами через Drizzle.
- Публічний список `items` кешується лише Redis cache-aside з TTL 60 с; персональні favorites не кешуються на сервері між користувачами.
- Сервер попередньо завантажує query-дані, а `HydrationBoundary` передає dehydrated cache у TanStack Query без зайвого клієнтського запиту після першого рендера.
- Ключі обраного мають форми `['favorites', userId, 'ids']` і `['favorites', userId, 'list']`; це не дозволяє кешу одного користувача потрапити до іншого.
- Мутації обраного оптимістично оновлюють UI, виконують rollback при помилці та інвалідують відповідний ключ.
- Після `POST /api/items` Redis version key інкрементується: наступне читання використовує новий cache namespace, а воркер асинхронно прогріває базовий список.

### Безпека

- `/favorites` захищено в `src/proxy.ts` і повторно перевіряє сесію на сервері.
- API favorites також визначає користувача лише з Better Auth session, не з клієнтського `userId`.
- У БД є унікальний індекс `(user_id, item_id)`, який забороняє дублікати.
- RLS увімкнено для всіх таблиць, а ролі Supabase Data API `anon` та `authenticated` не мають `SELECT` доступу. Застосунок працює через серверне Drizzle-підключення.
- `.env.local` не потрапляє у Git; `.env.example` навмисно є винятком і має бути закомічений.

### Rate limiting у production

- Favorites API має distributed Redis rate limit за `userId` незалежно від проксі.
- Публічні `/api/items` та `/api/items/[id]` обмежуються за IP лише коли `TRUST_PROXY_FOR_RATE_LIMIT=true`: у такому разі **лише** ваш reverse proxy/CDN має бути доступним до Next.js і він має коректно встановлювати `X-Forwarded-For`.
- Якщо Next.js доступний напряму, залишайте змінну `false`: застосунок не створює спільний bucket для всіх відвідувачів. Для захисту від bot flood у цій конфігурації потрібен CDN/WAF або reverse proxy перед застосунком.

`/api/cache/stats` доступний лише у development для локальної діагностики. Це process-local counters, тому вони не є production telemetry і навмисно повертають `404` у production.

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
