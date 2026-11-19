# Система организации и проведения шахматных турниров

Курсовой проект по дисциплине «Основы backend-разработки».
REST API на Laravel 12 + клиентское SPA на React 19 (Vite, React Router, Context API).

Возможности: каталог турниров с фильтрами, поиском и пагинацией; заявки игроков (связь «многие ко многим»);
жеребьёвка туров (швейцарская и круговая системы); ввод результатов; турнирная таблица с коэффициентом Бухгольца;
роли «игрок», «организатор», «администратор»; статистика; загрузка афиши.
В клиенте также: 3D-доска с партией против компьютера на главной и тренировка с роботом-тренером,
который разбирает каждый ход (собственный шахматный движок в Web Worker).

## Структура репозитория

```
backend/   полный Laravel-проект (REST API)
client/    клиент: React SPA (Vite)
  src/pages/       страницы (маршруты React Router)
  src/components/  макет, защищённый маршрут, общие компоненты
  src/context/     глобальное состояние: авторизация, уведомления (Context API)
  src/lib/         шахматный движок, фигуры, 3D-доска, тренер, анимации
docs/      SQL-скрипт, ER-диаграммы, коллекция Postman с описаниями и примерами ответов
windows/   скрипты установки и запуска для Windows (PHP и Node.js ставятся в папку tools)
```

## Требования

PHP 8.3+ (pdo_mysql, mbstring, openssl, fileinfo, curl), Composer, MySQL 8, Git.
На Windows удобно взять Laragon — в нём всё это есть.

## Установка backend

Папка `backend/` — полный Laravel-проект (composer.json, composer.lock, artisan).

```bash
cd backend
composer install
cp .env.example .env             # в Windows: copy .env.example .env
php artisan key:generate
# создайте в MySQL базу chess_tournaments и проверьте DB_* в .env
# (для быстрого старта можно DB_CONNECTION=sqlite и пустой файл database/database.sqlite)
php artisan migrate --seed
php artisan storage:link
php artisan serve                # http://127.0.0.1:8000
```

Проверка: http://127.0.0.1:8000/api/health должен вернуть `"database": "ok"`.
Список маршрутов: `php artisan route:list --path=api`.

## ИИ-ассистент (Groq)

`POST /api/v1/ai/chat` — чат с «Гамбит-ботом»: шахматные вопросы, турниры клуба, помощь по сайту.
В клиенте — страница «ИИ-ассистент» (`/#/assistant`, нужен вход).

- Клиент передаёт историю диалога (`messages[]`: `role` user/assistant, `content` до 2000 символов, не более 20 сообщений).
- Сервер (`app/Services/AiChatService.php`) добавляет системную инструкцию с актуальными турнирами клуба из БД
  и вызывает Groq (OpenAI-совместимый `chat/completions`); ответ — `{"data": {"role": "assistant", "content": "..."}}`.
- При перегрузке сервиса (429/503) запрос автоматически повторяется.
- Коды: 401 — нет токена, 422 — ошибки валидации, 429 — больше 10 сообщений в минуту, 503 — ИИ недоступен или не настроен.
- Настройка: получите ключ на https://console.groq.com/keys и впишите в `backend/.env`:
  `AI_PROVIDER=groq`, `GROQ_API_KEY=...` (модель — `GROQ_MODEL`, например `openai/gpt-oss-120b`), затем `php artisan config:clear`.
  Ключ не коммитится и не попадает в клиент.
- Запасной провайдер — Google Gemini: `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL`.
- В тестах (`tests/Feature/AiChatApiTest.php`) внешние API подменяются `Http::fake()` — ключи и интернет не нужны.

### Тестовые учётные записи

Пароль у всех — `password`.

| Роль | Email |
| --- | --- |
| Администратор | admin@chess.test |
| Организатор | organizer@chess.test (ещё aigerim@chess.test) |
| Игрок | player@chess.test (ещё aliya@, timur@, madina@, ruslan@, asel@chess.test) |

## Запуск клиента

Нужен Node.js 20+ (на Windows скрипт `windows/СОБРАТЬ_КЛИЕНТ.bat` скачает переносной Node.js сам).

```bash
cd client
npm install
npm run dev      # режим разработки: http://127.0.0.1:5500
npm run build    # сборка в client/dist (её можно раздавать любым статическим сервером)
```

Адрес API — `client/src/config.js` (по умолчанию `http://127.0.0.1:8000/api/v1`),
переопределяется переменной `VITE_API_URL` в `client/.env` (пример — `client/.env.example`).
Если клиент работает на другом адресе — допишите его в `CORS_ALLOWED_ORIGINS` в `.env` Laravel
и выполните `php artisan config:clear`.

Требования темы к клиенту и где они выполнены:

| Требование | Реализация |
| --- | --- |
| SPA с клиентской маршрутизацией | React Router (`HashRouter`, `src/App.jsx`) |
| Работа с API, хранение токена, защищённые маршруты | `src/api.js` (fetch, Bearer), токен в localStorage, `ProtectedRoute` |
| Управление состоянием | Context API: `AuthContext` (пользователь, вход/выход), `ToastContext` |
| Формы с клиентской валидацией и ошибками сервера | вход, регистрация, форма турнира, контроли времени (ошибки 422 под полями) |
| Адаптивная вёрстка | `src/styles.css`, меню-бургер, раскладки до 390 px |
| Интерфейсы для разных ролей | игрок — заявки и тренировка; организатор — управление турниром; администратор — `/admin` |

## Тесты

```bash
php artisan test
```

Тесты используют SQLite в памяти (`phpunit.xml`), рабочая база не затрагивается.
На Windows, если в пути к проекту есть кириллица (например, `C:\Users\Элит`), PHPUnit не может прочитать
`phpunit.xml` — используйте `windows/ТЕСТЫ.bat`: он временно подключает папку проекта как диск без кириллицы.
Нужно расширение `pdo_sqlite` (в Laragon включено).

## Документация API

Коллекция Postman: `docs/chess_tournaments.postman_collection.json`
(переменные `{{base_url}}` и `{{token}}`; токен сохраняется автоматически после входа).

Базовый адрес: `/api/v1`. Все запросы с заголовком `Accept: application/json`,
защищённые — с `Authorization: Bearer <token>`.

Формат ошибок единый:

```json
{ "message": "Турнир не найден" }
{ "message": "Ошибка валидации", "errors": { "end_date": ["Дата окончания должна быть не раньше даты начала"] } }
```

| Код | Когда |
| --- | --- |
| 401 | нет токена, токен неверный или истёк, неверный пароль при входе |
| 403 | недостаточно прав (роль или чужой турнир) |
| 404 | запись не найдена |
| 409 | нарушено бизнес-правило |
| 422 | ошибка валидации |

## Журнал

Каждый запрос к API пишется в `storage/logs/laravel-ГГГГ-ММ-ДД.log`
(метод, URL, id пользователя, код ответа, время). Тело запроса не пишется,
поэтому пароли и токены в журнал не попадают.


## Сторонние материалы

Рисунок шахматных фигур — набор «cburnett», автор Colin M.L. Burnett, лицензии GPLv2+ / BSD / GFDL (тот же набор используется на Lichess и в Википедии).
