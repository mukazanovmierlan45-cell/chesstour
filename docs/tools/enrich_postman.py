"""Дополняет коллекцию Postman описаниями и примерами ответов для каждого запроса.
Запуск: python docs/tools/enrich_postman.py (из корня репозитория)."""
import copy, json, pathlib

PATH = pathlib.Path(__file__).resolve().parents[1] / 'chess_tournaments.postman_collection.json'
c = json.loads(PATH.read_text(encoding='utf-8'))

# ---------- образцы данных (совпадают со структурой API Resources) ----------
TC_BLITZ = {"id": 2, "name": "Блиц 3+2", "type": "blitz", "type_label": "Блиц", "base_minutes": 3, "increment_seconds": 2, "short": "3+2"}
ORG = {"id": 2, "name": "Ержан Сапаров", "rating": 1850}
PLAYER = {"id": 4, "name": "Данияр Сейткали", "rating": 1620}
def tournament(i=3, title="Классический чемпионат города", status="registration", label="Регистрация", **kw):
    t = {"id": i, "title": title, "description": "Открытый турнир клуба для игроков с рейтингом от 1500.",
         "format": "swiss", "format_label": "Швейцарская", "status": status, "status_label": label,
         "location": "Астана, шахматный клуб «Гамбит»", "start_date": "2026-12-05", "end_date": "2026-12-07",
         "registration_deadline": "2026-12-04T18:00:00+05:00", "is_registration_open": status == "registration",
         "max_participants": 24, "rounds_count": 7, "min_rating": 1500, "poster_url": None, "organizer_id": 2,
         "organizer": ORG, "time_control": TC_BLITZ, "participants_count": 12, "rounds_created": 0,
         "created_at": "2026-11-19T10:00:00+05:00", "updated_at": "2026-11-19T10:00:00+05:00"}
    t.update(kw)
    return t
def page(items, total=None, per_page=5):
    total = total or len(items)
    return {"data": items, "links": {"first": "{{base_url}}/tournaments?page=1", "last": "{{base_url}}/tournaments?page=1", "prev": None, "next": None},
            "meta": {"current_page": 1, "from": 1, "last_page": 1, "per_page": per_page, "to": len(items), "total": total}}
USER_PLAYER = {"id": 4, "name": "Данияр Сейткали", "email": "player@chess.test", "role": "player", "role_label": "Игрок", "rating": 1620, "created_at": "2026-11-19T10:00:00+05:00"}
NEW_USER = {"id": 11, "name": "Новый Игрок", "email": "new@chess.test", "role": "player", "role_label": "Игрок", "rating": 1200, "created_at": "2026-11-19T12:30:00+05:00"}
TOKEN = "12|kq7Hn3VvW2xYb8Zp4LmN0aBcDeFgHiJkLmNoPqRs"
GAME = {"id": 10, "round_id": 5, "board_number": 1, "white": PLAYER, "black": {"id": 5, "name": "Алия Касымова", "rating": 1820},
        "is_bye": False, "result": "white_win", "result_label": "Победа белых", "result_notation": "1-0", "pgn": "1. e4 e5 2. Nf3 1-0"}
ROUND = {"id": 5, "tournament_id": 2, "number": 3, "starts_at": "2026-11-20T19:00:00+05:00", "status": "ongoing", "status_label": "Идёт", "games": [GAME]}
PARTICIPANT = {"user": PLAYER, "start_number": None, "rating_at_start": 1620, "status": "pending", "status_label": "Заявка подана", "registered_at": "2026-11-19T12:40:00+05:00"}
STANDING = {"place": 1, "user": {"id": 5, "name": "Алия Касымова", "rating": 1820}, "rating_at_start": 1820, "points": 3.0, "buchholz": 5.5, "games_played": 3}

E401 = {"message": "Требуется авторизация"}
E403 = {"message": "Недостаточно прав для выполнения действия"}
def e404(what): return {"message": what}
def e409(msg): return {"message": msg}
def e422(**errors): return {"message": "Ошибка валидации", "errors": {k: [v] for k, v in errors.items()}}

R = lambda name, code, body: (name, code, body)
ROLE = {"all": "без авторизации", "auth": "любой авторизованный пользователь", "player": "игрок (player)",
        "staff": "организатор турнира или администратор", "admin": "администратор"}

# ---------- описание каждого запроса: назначение, роль, параметры, коды и примеры ----------
DOCS = {
 "GET /api/health": ("Проверка, что API запущен и отвечает. Используется клиентом для индикатора «Сервер работает».", "all", "",
   [R("200 OK", 200, {"app": "Шахматные турниры", "time": "2026-11-19T12:00:00+05:00", "database": "ok"}), R("503 нет базы данных", 503, {"app": "Шахматные турниры", "time": "2026-11-19T12:00:00+05:00", "database": "unavailable"})]),
 "Регистрация": ("Создаёт аккаунт игрока (роль player) и сразу возвращает токен Sanctum. Скрипт во вкладке Scripts сохраняет токен в переменную `{{token}}`.", "all",
   "Тело: `name`, `email` (уникальный), `password` (не менее 8 символов), `password_confirmation`.",
   [R("201 Created", 201, {"data": NEW_USER, "token": TOKEN}), R("422 email занят", 422, e422(email="Пользователь с таким email уже зарегистрирован"))]),
 "Регистрация — ошибка валидации (422)": ("Демонстрация единого формата ошибок валидации: `message` + `errors` по полям.", "all", "",
   [R("422 Unprocessable Entity", 422, {"message": "Ошибка валидации", "errors": {"name": ["Поле имя обязательно для заполнения."], "email": ["Поле email должно быть корректным email-адресом."], "password": ["Поле пароль должно содержать не менее 8 символов."]}})]),
 "Вход: администратор": ("Вход администратора. Токен сохраняется в `{{token}}` автоматически — следующие запросы выполняются от имени администратора.", "all", "Тело: `email`, `password`.",
   [R("200 OK", 200, {"data": {**USER_PLAYER, "id": 1, "name": "Администратор клуба", "email": "admin@chess.test", "role": "admin", "role_label": "Администратор", "rating": 1700}, "token": TOKEN})]),
 "Вход: организатор": ("Вход организатора турниров; токен сохраняется в `{{token}}`.", "all", "Тело: `email`, `password`.",
   [R("200 OK", 200, {"data": {**USER_PLAYER, "id": 2, "name": "Ержан Сапаров", "email": "organizer@chess.test", "role": "organizer", "role_label": "Организатор", "rating": 1850}, "token": TOKEN})]),
 "Вход: игрок": ("Вход игрока; токен сохраняется в `{{token}}`.", "all", "Тело: `email`, `password`.",
   [R("200 OK", 200, {"data": USER_PLAYER, "token": TOKEN})]),
 "Вход — неверный пароль (401)": ("Неверная пара email/пароль — 401 с понятным сообщением.", "all", "",
   [R("401 Unauthorized", 401, {"message": "Неверный email или пароль"})]),
 "Текущий пользователь": ("Профиль владельца токена. Клиент вызывает его при открытии сайта, чтобы восстановить сессию.", "auth", "",
   [R("200 OK", 200, {"data": USER_PLAYER}), R("401 без токена", 401, E401)]),
 "Без токена (401)": ("Запрос к защищённому маршруту без заголовка Authorization — демонстрация ответа 401.", "auth", "", [R("401 Unauthorized", 401, E401)]),
 "Выход": ("Отзывает текущий токен (удаляет его из personal_access_tokens).", "auth", "", [R("204 No Content", 204, None), R("401 без токена", 401, E401)]),
 "Список с фильтрами и пагинацией": ("Каталог турниров с пагинацией, поиском, фильтрами и сортировкой.", "all",
   "Query: `status` (draft, registration, ongoing, finished, cancelled), `search` (название или место), `format`, `time_control_id`, `date_from`, `date_to`, `sort` (start_date, title, created_at, max_participants), `order` (asc, desc), `page`, `per_page` (1–50).",
   [R("200 OK", 200, page([tournament(), tournament(5, "Новогодний блиц", start_date="2026-12-28", end_date="2026-12-28", min_rating=None, participants_count=30, max_participants=32)], total=3))]),
 "Фильтр по формату и датам": ("Пример фильтрации по системе проведения и диапазону дат начала.", "all", "Query: `format`, `date_from`, `date_to`.",
   [R("200 OK", 200, page([tournament()]))]),
 "Недопустимая сортировка (422)": ("Сортировка разрешена только по белому списку полей — иначе 422.", "all", "", [R("422 Unprocessable Entity", 422, e422(sort="Выбрано недопустимое значение поля sort."))]),
 "Карточка турнира": ("Полная информация о турнире: организатор, контроль времени, число участников и созданных туров.", "all", "Путь: `{{tournament_id}}`.",
   [R("200 OK", 200, {"data": tournament()}), R("404 не найден", 404, e404("Турнир не найден"))]),
 "Несуществующий турнир (404)": ("Запись не найдена — понятное сообщение по типу модели.", "all", "", [R("404 Not Found", 404, e404("Турнир не найден"))]),
 "Создать (организатор)": ("Создание турнира в статусе «Черновик». Организатором становится текущий пользователь. Скрипт сохраняет id в `{{tournament_id}}`.", "staff",
   "Тело: `title`, `description`, `time_control_id`, `format` (swiss | round_robin), `location`, `start_date`, `end_date`, `registration_deadline` (до начала турнира), `max_participants` (2–500), `rounds_count`, `min_rating` (необязательно).",
   [R("201 Created", 201, {"data": tournament(9, "Кубок весны", "draft", "Черновик", participants_count=0, start_date="2027-03-10", end_date="2027-03-12", registration_deadline="2027-03-09T18:00:00+05:00", is_registration_open=False)}),
    R("403 игрок", 403, E403)]),
 "Создать — даты с ошибкой (422)": ("Проверка согласованности дат: окончание раньше начала, приём заявок после старта.", "staff", "",
   [R("422 Unprocessable Entity", 422, {"message": "Ошибка валидации", "errors": {"end_date": ["Дата окончания должна быть не раньше даты начала"], "registration_deadline": ["Приём заявок должен закончиться не позже даты начала"]}})]),
 "Изменить": ("Частичное изменение турнира (PATCH). Завершённый или отменённый турнир изменять нельзя.", "staff", "Тело: любые поля турнира.",
   [R("200 OK", 200, {"data": tournament(9, "Кубок весны 2027", "draft", "Черновик", max_participants=20)}), R("403 чужой турнир", 403, E403),
    R("409 турнир завершён", 409, e409("Завершённый или отменённый турнир изменять нельзя"))]),
 "Сменить статус": ("Переход статуса по жизненному циклу: draft → registration → ongoing → finished (или cancelled). Недопустимый переход — 409.", "staff", "Тело: `status`.",
   [R("200 OK", 200, {"data": tournament(9, "Кубок весны 2027", "registration", "Регистрация")}),
    R("409 мало участников", 409, e409("Для старта нужно минимум 2 допущенных участника"))]),
 "Загрузить афишу": ("Загрузка изображения афиши (multipart/form-data, поле `poster`). Файл сохраняется в Storage (диск public), в ответе — `poster_url`.", "staff",
   "Тело form-data: `poster` — jpg, jpeg, png или webp, до 2 МБ.",
   [R("200 OK", 200, {"data": tournament(9, "Кубок весны 2027", "registration", "Регистрация", poster_url="http://127.0.0.1:8000/storage/posters/kubok-vesny.jpg")}),
    R("422 не изображение", 422, e422(poster="Файл афиша должен быть изображением."))]),
 "Удалить": ("Удаление турнира. Если в турнире уже есть партии — 409 (такой турнир нужно отменить).", "staff", "",
   [R("204 No Content", 204, None), R("409 есть партии", 409, e409("Нельзя удалить турнир, в котором уже есть партии. Отмените его"))]),
 "Турнирная таблица": ("Таблица с местами, очками и коэффициентом Бухгольца; считается по результатам партий.", "all", "",
   [R("200 OK", 200, {"data": [STANDING, {**STANDING, "place": 2, "user": {"id": 6, "name": "Тимур Ахметов", "rating": 1760}, "rating_at_start": 1760, "points": 2.5, "buchholz": 6.0}]})]),
 "Участники турнира": ("Список заявок со статусами и стартовыми номерами.", "all", "",
   [R("200 OK", 200, {"data": [{**PARTICIPANT, "status": "confirmed", "status_label": "Допущен", "start_number": 1}]})]),
 "Подать заявку (игрок)": ("Ключевой сценарий. В транзакции с блокировкой строки турнира проверяются: открыта ли регистрация, срок, рейтинг, повторная заявка, свободные места.", "player", "",
   [R("201 Created", 201, {"data": PARTICIPANT}), R("409 повторная заявка", 409, e409("Вы уже подали заявку на этот турнир")),
    R("409 нет мест", 409, e409("Свободных мест на турнире нет")), R("409 рейтинг", 409, e409("Для участия нужен рейтинг не ниже 1500")),
    R("403 не игрок", 403, E403)]),
 "Отозвать заявку (игрок)": ("Отзыв своей заявки до начала турнира.", "player", "",
   [R("200 OK", 200, {"data": {**PARTICIPANT, "status": "withdrawn", "status_label": "Отозвана"}}),
    R("409 турнир начался", 409, e409("Отозвать заявку можно только до начала турнира")), R("404 нет заявки", 404, e404("Вы не зарегистрированы на этот турнир"))]),
 "Допустить игрока (организатор)": ("Организатор подтверждает или отклоняет заявку и задаёт стартовый номер.", "staff", "Тело: `status` (confirmed | withdrawn | pending), `start_number`.",
   [R("200 OK", 200, {"data": {**PARTICIPANT, "status": "confirmed", "status_label": "Допущен", "start_number": 2}}),
    R("409 лимит", 409, e409("Достигнут лимит допущенных участников"))]),
 "Мои турниры": ("Турниры, на которые текущий пользователь подавал заявки, со статусом его заявки (`my_registration`).", "auth", "",
   [R("200 OK", 200, {"data": [tournament(my_registration={"status": "pending", "start_number": None})]})]),
 "Мои партии": ("Все партии текущего игрока с туром и турниром.", "auth", "",
   [R("200 OK", 200, {"data": [{**GAME, "round": {"id": 5, "number": 3, "tournament": {"id": 2, "title": "Блиц-арена"}}}]})]),
 "Туры турнира": ("Туры с парами и результатами.", "all", "", [R("200 OK", 200, {"data": [ROUND]})]),
 "Создать тур (автожеребьёвка)": ("Новый тур с автоматической жеребьёвкой (швейцарская или круговая система). Только для турнира в статусе «Идёт» и после завершения предыдущего тура.", "staff",
   "Тело: `auto_pairing: true`, `starts_at` (необязательно).",
   [R("201 Created", 201, {"data": {**ROUND, "games": [{**GAME, "result": "pending", "result_label": "Не сыграна", "result_notation": "*", "pgn": None}]}}),
    R("409 предыдущий тур", 409, e409("Сначала завершите тур №2")), R("409 турнир не идёт", 409, e409("Туры можно создавать только в турнире со статусом «Идёт»"))]),
 "Создать тур (ручная жеребьёвка)": ("Тур с парами, заданными судьёй вручную. Каждый игрок должен быть допущенным участником и встречаться в туре один раз.", "staff",
   "Тело: `auto_pairing: false`, `pairings[]` — `white_player_id`, `black_player_id` (null — игрок без пары).",
   [R("201 Created", 201, {"data": ROUND}), R("409 игрок дважды", 409, e409("Игрок #4 указан в туре дважды"))]),
 "Внести результат партии": ("Судья вносит результат и (необязательно) запись PGN. Таблица пересчитывается.", "staff", "Тело: `result` (white_win | black_win | draw | pending), `pgn`.",
   [R("200 OK", 200, {"data": GAME}), R("409 тур завершён", 409, e409("Тур не идёт — результат партии изменить нельзя"))]),
 "Завершить тур": ("Закрывает тур, если внесены все результаты.", "staff", "",
   [R("200 OK", 200, {"data": {**ROUND, "status": "completed", "status_label": "Завершён"}}), R("409 есть несыгранные", 409, e409("Нельзя завершить тур: не внесено результатов — 2"))]),
 "Удалить последний тур": ("Удаление тура: только последнего и только без результатов.", "staff", "",
   [R("204 No Content", 204, None), R("409 есть результаты", 409, e409("В туре уже есть результаты, удалить его нельзя"))]),
 "Контроли времени": ("Справочник контролей времени с числом турниров.", "all", "", [R("200 OK", 200, {"data": [{**TC_BLITZ, "tournaments_count": 3}]})]),
 "Создать контроль времени": ("Добавление контроля времени в справочник.", "admin", "Тело: `name`, `type` (classical | rapid | blitz | bullet), `base_minutes`, `increment_seconds`.",
   [R("201 Created", 201, {"data": {"id": 6, "name": "Рапид 25+10", "type": "rapid", "type_label": "Рапид", "base_minutes": 25, "increment_seconds": 10, "short": "25+10"}}),
    R("403 не администратор", 403, E403)]),
 "Изменить контроль времени": ("Частичное изменение контроля времени.", "admin", "", [R("200 OK", 200, {"data": {**TC_BLITZ, "increment_seconds": 1, "short": "3+1"}})]),
 "Удалить используемый контроль (409)": ("Контроль, который используют турниры, удалить нельзя — 409 (внешний ключ restrictOnDelete).", "admin", "",
   [R("409 Conflict", 409, e409("Контроль времени используется в турнирах, удалить его нельзя"))]),
 "Пользователи": ("Список пользователей с фильтром по роли и поиском.", "admin", "Query: `role`, `search`, `per_page`.",
   [R("200 OK", 200, {"data": [USER_PLAYER], "meta": {"current_page": 1, "last_page": 1, "per_page": 20, "total": 1}})]),
 "Изменить роль/рейтинг": ("Изменение роли и рейтинга пользователя. Свою роль администратор изменить не может.", "admin", "Тело: `role`, `rating`.",
   [R("200 OK", 200, {"data": {**USER_PLAYER, "id": 9, "name": "Асель Ермекова", "email": "asel@chess.test", "rating": 1420}})]),
 "Удалить игрока с партиями (409)": ("Пользователя, у которого есть сыгранные партии, удалить нельзя.", "admin", "",
   [R("409 Conflict", 409, e409("У пользователя есть сыгранные партии, удалить его нельзя"))]),
 "Статистика": ("Сводка для администратора: турниры по статусам, партии по результатам, самые активные игроки.", "admin", "",
   [R("200 OK", 200, {"data": {"tournaments": {"total": 8, "by_status": {"draft": 1, "registration": 3, "ongoing": 1, "finished": 2, "cancelled": 1}},
      "games": {"total": 42, "by_result": {"white_win": 17, "black_win": 12, "draw": 9, "pending": 4}},
      "most_active_players": [{"id": 5, "name": "Алия Касымова", "games_played": 12}]}})]),
}

NEW_REQUESTS = {
 "2. Турниры": [{
   "name": "Создать турнир игроком (403)",
   "request": {"method": "POST", "header": [{"key": "Accept", "value": "application/json"}, {"key": "Content-Type", "value": "application/json"}],
               "body": {"mode": "raw", "raw": json.dumps({"time_control_id": 2, "title": "Мой турнир", "format": "swiss", "location": "Астана",
                         "start_date": "2027-03-10", "end_date": "2027-03-12", "registration_deadline": "2027-03-09 18:00:00", "max_participants": 16, "rounds_count": 5}, ensure_ascii=False, indent=2)},
               "url": {"raw": "{{base_url}}/tournaments", "host": ["{{base_url}}"], "path": ["tournaments"]}},
   "_doc": ("Демонстрация разграничения прав: игрок (токен после «Вход: игрок») пытается создать турнир — middleware role:organizer,admin возвращает 403.", "staff", "Выполните сначала «Вход: игрок».", [R("403 Forbidden", 403, E403)])}],
 "1. Аутентификация": [{
   "name": "ИИ-ассистент: сообщение",
   "request": {"method": "POST", "header": [{"key": "Accept", "value": "application/json"}, {"key": "Content-Type", "value": "application/json"}],
               "body": {"mode": "raw", "raw": json.dumps({"messages": [{"role": "user", "content": "Какой дебют выучить новичку?"}]}, ensure_ascii=False, indent=2)},
               "url": {"raw": "{{base_url}}/ai/chat", "host": ["{{base_url}}"], "path": ["ai", "chat"]}},
   "_doc": ("Чат с ИИ-ассистентом клуба «Гамбит-бот» (Google Gemini). Клиент передаёт историю диалога целиком; сервер добавляет системную инструкцию с актуальными турнирами клуба из БД. Ограничение — 10 запросов в минуту. Ключ GEMINI_API_KEY задаётся только в .env.", "auth",
            "Тело: `messages[]` (1–20) — `role` (user | assistant), `content` (до 2000 символов); последнее сообщение — от пользователя.",
            [R("200 OK", 200, {"data": {"role": "assistant", "content": "Начните с Итальянской партии: 1. e4 e5 2. Кf3 Кc6 3. Сc4 — она учит быстро развивать фигуры и бороться за центр."}}),
             R("401 без токена", 401, E401),
             R("422 последнее сообщение не от пользователя", 422, e422(messages="Последнее сообщение должно быть от пользователя")),
             R("429 лимит", 429, {"message": "Too Many Attempts."}),
             R("503 ИИ недоступен", 503, {"message": "ИИ-ассистент временно недоступен, попробуйте позже"})])}],
 "3. Участники (ключевой сценарий)": [{
   "name": "Заявка на закрытую регистрацию (409)",
   "request": {"method": "POST", "header": [{"key": "Accept", "value": "application/json"}],
               "url": {"raw": "{{base_url}}/tournaments/1/registration", "host": ["{{base_url}}"], "path": ["tournaments", "1", "registration"]}},
   "_doc": ("Нарушение бизнес-правила: турнир №1 уже завершён, регистрация закрыта — 409 Conflict.", "player", "Выполните сначала «Вход: игрок».",
            [R("409 Conflict", 409, e409("Регистрация на турнир закрыта"))])}],
}

STATUS_TEXT = {429: "Too Many Requests", 503: "Service Unavailable", 200: "OK", 201: "Created", 204: "No Content", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict", 422: "Unprocessable Entity"}

def apply_doc(item, doc):
    text, role, params, examples = doc
    lines = [text, "", f"**Доступ:** {ROLE[role]}."]
    if params: lines += ["", f"**Параметры:** {params}"]
    codes = sorted({code for _, code, _ in examples})
    lines += ["", "**Коды ответов:** " + ", ".join(f"{c} {STATUS_TEXT[c]}" for c in codes) + "."]
    item["request"]["description"] = "\n".join(lines)
    req = copy.deepcopy(item["request"]); req.pop("description", None)
    item["response"] = [{
        "name": name, "originalRequest": req, "status": STATUS_TEXT[code], "code": code,
        "_postman_previewlanguage": "json" if body is not None else "text",
        "header": [{"key": "Content-Type", "value": "application/json"}] if body is not None else [],
        "body": json.dumps(body, ensure_ascii=False, indent=2) if body is not None else "",
    } for name, code, body in examples]

for folder in c["item"]:
    for extra in NEW_REQUESTS.get(folder["name"], []):
        DOCS[extra["name"]] = extra["_doc"]
        if not any(i["name"] == extra["name"] for i in folder["item"]):
            folder["item"].append({k: v for k, v in extra.items() if k != "_doc"})
    for item in folder["item"]:
        if item["name"] not in DOCS:
            raise SystemExit(f"Нет описания для запроса: {item['name']}")
        apply_doc(item, DOCS[item["name"]])

c["info"]["description"] = """REST API системы организации и проведения шахматных турниров «Гамбит» (Laravel 12 + Sanctum).

**Как пользоваться**
1. Запустите API (`php artisan serve` или ЗАПУСТИТЬ.bat) — адрес в переменной `{{base_url}}` (по умолчанию http://127.0.0.1:8000/api/v1).
2. Выполните один из запросов «Вход» — скрипт сохранит токен в переменную `{{token}}`. Авторизация коллекции — Bearer Token `{{token}}`.
3. Во всех запросах передаётся заголовок `Accept: application/json`.

**Формат ответов.** Успех — объект `data` (списки с пагинацией — `data`, `links`, `meta`). Ошибки — `{ "message": "..." }`, для 422 — дополнительно `errors` по полям.

**ИИ-ассистент:** `POST /ai/chat` — чат с Гамбит-ботом (Google Gemini), нужен GEMINI_API_KEY в .env.

**Коды:** 200, 201 (создано), 204 (удалено), 401 (нет токена), 403 (нет прав по роли или не свой турнир), 404 (запись не найдена), 409 (нарушение бизнес-правила), 422 (ошибка валидации).

**Роли:** player — игрок, organizer — организатор, admin — администратор. Тестовые учётные записи: admin@chess.test, organizer@chess.test, player@chess.test, пароль `password`."""

PATH.write_text(json.dumps(c, ensure_ascii=False, indent=2), encoding='utf-8')
total = sum(len(f["item"]) for f in c["item"])
print("запросов:", total, "| примеров ответов:", sum(len(i["response"]) for f in c["item"] for i in f["item"]))
