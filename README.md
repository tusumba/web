# Tusumba Web — каркас и вход (#19064)

Веб-клиент Tusumba на Vite, React, TypeScript. Дизайн формы входа следует цветам Tusumba / Material 3. В текущую задачу входят вход, маршрутизация, OpenAPI-клиент, ротация сессии и выход. Каталог, заявки и модерация — следующие задачи.

## Запуск

Нужен Node.js 22 или выше (подойдёт также поддерживаемая версия >=20.19).

1. `npm install`
2. `npm run dev` — открой http://localhost:5173
3. `npm run lint && npm run test && npm run build`

Для локального API-шлюза можно создать `.env.local` с `VITE_DEV_API_ORIGIN=http://localhost:8000` (домен подставить реальный). На стенде при маршрутизации `/v1` через gateway оставь `VITE_API_BASE_URL` пустым. Переменные `VITE_*` публичны — **не кладите в них секреты**.

## Структура

- `src/pages/LoginPage.tsx` — вход по email ИЛИ нику (Identity #18990).
- `src/pages/AccountPage.tsx` — защищённая заглушка, подтверждение входа и кнопка выхода.
- `src/auth/sessionManager.ts` — access в памяти, refresh в sessionStorage текущей вкладки, один refresh-запрос за раз и повтор запроса после 401 `token_expired`.
- `src/auth/AuthContext.tsx` — состояние входа и восстановление сессии после перезагрузки страницы.
- `src/api/client.ts` — типизированные publicApi и api (openapi-fetch + типы, автоматически генерируемые из OpenAPI).
- `openapi/identity.yaml` — срез auth-контракта Identity из `tusumba/identity-service/docs/openapi.yaml`; исходный репозиторий — источник истины.
- `src/auth/sessionManager.test.ts` — проверки single-flight refresh, ротации, повторов, ошибок и выхода.
- `Dockerfile`, `nginx.conf` — образ веб-статики и SPA fallback; gateway API должен конфигурироваться на стороне deploy.

## Контракт и безопасность

- POST `/v1/auth/login`: `{ login, password }`, ответ `{ access_token, refresh_token, expires_in, user }`.
- POST `/v1/auth/refresh`: `{ refresh_token }`, ответ с новой парой; **старый refresh после обмена недействителен**.
- POST `/v1/auth/logout`: `{ refresh_token }`, успешный статус `204`; даже при сетевой ошибке локальные токены удаляются.
- Access-токен только в памяти JS, refresh — только в `sessionStorage`. На загрузке вкладки выполняется refresh. Все защищённые запросы используют общий промис обновления и ретраятся только после кода `token_expired`, один раз. Некорректный refresh очищает сессию.
- `sessionStorage` не защищает от XSS. Более безопасный вариант с HttpOnly cookie/BFF требует изменения контрактов и инфраструктуры, не входит в #19064.
- Не логировать JWT, никогда не передавать refresh-токен в заголовке Authorization, не записывать в git `.env` или реальные токены.

## Примечания команде

- Текущий CI устанавливает зависимости через `npm install`, потому что в архиве нет готового lock-файла: без доступа к npm-реестру `npm ci` не выполнить. После первого запуска **обязательно закоммитить `package-lock.json`** и вернуть `npm ci` (рекомендуется до слияния).
- Создание ZIP не означает зелёный CI: локальная установка зависимостей и сборка без доступа в интернет не выполнялись. Проверяйте PR Actions.
- Для приёмки нужен реальный API на стенде, привязка через gateway и согласование с командой deploy. Работа над конфигурацией deploy в другой репозиторий не включена.
- Автоматизированные тесты в Node 22 используют встроенные Request/Response через Vitest.

## Как подготовить PR

В проекте `tusumba/web` используйте ветку `feature/19064-web-auth` от `main` (см. общий `CONTRIBUTING.md`). Загрузите файлы архива в корень ветки, а не в отдельную подкаталожную папку. Название PR начните с `#19064`, добавьте ссылку на задачу https://ai.nsu.ru/issues/19064 и результаты проверки. Ревью и одобрение обязательны.
