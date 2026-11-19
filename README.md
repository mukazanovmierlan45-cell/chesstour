# Система организации и проведения шахматных турниров

Курсовой проект по дисциплине «Основы backend-разработки».
REST API на Laravel 12 + клиент на HTML/CSS/JavaScript.

Возможности: каталог турниров с фильтрами, поиском и пагинацией; заявки игроков (связь «многие ко многим»);
жеребьёвка туров (швейцарская и круговая системы); ввод результатов; турнирная таблица с коэффициентом Бухгольца;
роли «игрок», «организатор», «администратор»; статистика; загрузка афиши.

## Структура репозитория

```
backend/   файлы Laravel-проекта (накладываются на свежую установку, см. ниже)
client/    клиентское приложение (HTML + JS, без сборки)
docs/      SQL-скрипт ПР3, коллекция Postman
```

## Требования

PHP 8.3+ (pdo_mysql, mbstring, openssl, fileinfo, curl), Composer, MySQL 8, Git.
На Windows удобно взять Laragon — в нём всё это есть.

## Установка backend

В архиве лежат только файлы проекта, без `vendor`. Laravel ставится командой Composer,
затем поверх копируются файлы из папки `backend/`.

```bash
# 1. Свежий Laravel и API-маршруты со Sanctum
composer create-project laravel/laravel:^12.0 chess-tournaments-api
cd chess-tournaments-api
php artisan install:api          # на вопрос о миграциях ответьте "no"
php artisan config:publish cors

# 2. Скопируйте содержимое папки backend/ из архива в chess-tournaments-api/
#    с заменой файлов (app, bootstrap, config, database, lang, routes, tests,
#    .env.example, phpunit.xml)

# 3. Настройка окружения
cp .env.example .env             # в Windows: copy .env.example .env
php artisan key:generate
# создайте в MySQL базу chess_tournaments и проверьте DB_* в .env

# 4. База данных и тестовые данные
php artisan migrate:fresh --seed
php artisan storage:link

# 5. Запуск
php artisan serve                # http://127.0.0.1:8000
```

Проверка: http://127.0.0.1:8000/api/health должен вернуть `"database": "ok"`.
Список маршрутов: `php artisan route:list --path=api`.

### Тестовые учётные записи

Пароль у всех — `password`.

| Роль | Email |
| --- | --- |
| Администратор | admin@chess.test |
| Организатор | organizer@chess.test (ещё aigerim@chess.test) |
| Игрок | player@chess.test (ещё aliya@, timur@, madina@, ruslan@, asel@chess.test) |

## Запуск клиента

1. Откройте папку `client/` в VS Code и запустите расширение Live Server
   (адрес http://127.0.0.1:5500).
2. Адрес API задан в `client/js/config.js` (`http://127.0.0.1:8000/api/v1`).
3. Если клиент работает на другом адресе — допишите его в `CORS_ALLOWED_ORIGINS` в `.env`
   и выполните `php artisan config:clear`.

## Тесты

```bash
php artisan test
```

Тесты используют SQLite в памяти (`phpunit.xml`), рабочая база не затрагивается.
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
