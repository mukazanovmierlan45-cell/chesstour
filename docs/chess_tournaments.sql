-- =====================================================================
-- ПР3. Физическая модель БД
-- Система организации и проведения шахматных турниров
-- СУБД: MySQL 8.0+ (кодировка utf8mb4)
-- Скрипт нужен для проверки проекта БД. В приложении таблицы
-- создаются миграциями Laravel (ПР5).
-- =====================================================================

DROP DATABASE IF EXISTS chess_tournaments_check;
CREATE DATABASE chess_tournaments_check
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE chess_tournaments_check;

-- ---------------------------------------------------------------------
-- 1. users — пользователи (игроки, организаторы, администраторы)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name              VARCHAR(255)    NOT NULL,
    email             VARCHAR(255)    NOT NULL,
    email_verified_at TIMESTAMP       NULL,
    password          VARCHAR(255)    NOT NULL,           -- только хеш bcrypt
    role              VARCHAR(20)     NOT NULL DEFAULT 'player', -- player | organizer | admin
    rating            SMALLINT UNSIGNED NOT NULL DEFAULT 1200,
    remember_token    VARCHAR(100)    NULL,
    created_at        TIMESTAMP       NULL,
    updated_at        TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY users_email_unique (email),
    KEY users_role_index (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. time_controls — справочник контролей времени
-- ---------------------------------------------------------------------
CREATE TABLE time_controls (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name              VARCHAR(100)    NOT NULL,
    type              VARCHAR(20)     NOT NULL,           -- classical | rapid | blitz | bullet
    base_minutes      SMALLINT UNSIGNED NOT NULL,
    increment_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at        TIMESTAMP       NULL,
    updated_at        TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY time_controls_name_unique (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. tournaments — турниры
-- ---------------------------------------------------------------------
CREATE TABLE tournaments (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id               BIGINT UNSIGNED NOT NULL,       -- организатор
    time_control_id       BIGINT UNSIGNED NOT NULL,
    title                 VARCHAR(255)    NOT NULL,
    description           TEXT            NULL,
    format                VARCHAR(20)     NOT NULL,       -- swiss | round_robin
    location              VARCHAR(255)    NOT NULL,
    start_date            DATE            NOT NULL,
    end_date              DATE            NOT NULL,
    registration_deadline DATETIME        NOT NULL,
    max_participants      SMALLINT UNSIGNED NOT NULL,
    rounds_count          TINYINT UNSIGNED  NOT NULL,
    min_rating            SMALLINT UNSIGNED NULL,
    poster_path           VARCHAR(255)    NULL,
    status                VARCHAR(20)     NOT NULL DEFAULT 'draft',
                          -- draft | registration | ongoing | finished | cancelled
    created_at            TIMESTAMP       NULL,
    updated_at            TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY tournaments_status_index (status),
    KEY tournaments_start_date_index (start_date),
    KEY tournaments_title_index (title),
    CONSTRAINT tournaments_user_id_foreign
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT tournaments_time_control_id_foreign
        FOREIGN KEY (time_control_id) REFERENCES time_controls (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. tournament_user — участие игрока в турнире (связь M:N)
-- ---------------------------------------------------------------------
CREATE TABLE tournament_user (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    tournament_id   BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    start_number    SMALLINT UNSIGNED NULL,
    rating_at_start SMALLINT UNSIGNED NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending', -- pending | confirmed | withdrawn
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY tournament_user_tournament_id_user_id_unique (tournament_id, user_id),
    UNIQUE KEY tournament_user_tournament_id_start_number_unique (tournament_id, start_number),
    KEY tournament_user_user_id_index (user_id),
    CONSTRAINT tournament_user_tournament_id_foreign
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
    CONSTRAINT tournament_user_user_id_foreign
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. rounds — туры
-- ---------------------------------------------------------------------
CREATE TABLE rounds (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    tournament_id BIGINT UNSIGNED NOT NULL,
    number        TINYINT UNSIGNED NOT NULL,
    starts_at     DATETIME        NULL,
    status        VARCHAR(20)     NOT NULL DEFAULT 'pending', -- pending | ongoing | completed
    created_at    TIMESTAMP       NULL,
    updated_at    TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY rounds_tournament_id_number_unique (tournament_id, number),
    CONSTRAINT rounds_tournament_id_foreign
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. games — партии
-- ---------------------------------------------------------------------
CREATE TABLE games (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    round_id        BIGINT UNSIGNED NOT NULL,
    white_player_id BIGINT UNSIGNED NOT NULL,
    black_player_id BIGINT UNSIGNED NULL,               -- NULL = bye (игрок без пары)
    board_number    SMALLINT UNSIGNED NOT NULL,
    result          VARCHAR(20)     NOT NULL DEFAULT 'pending',
                    -- pending | white_win | black_win | draw | bye
    pgn             TEXT            NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY games_round_id_board_number_unique (round_id, board_number),
    KEY games_white_player_id_index (white_player_id),
    KEY games_black_player_id_index (black_player_id),
    KEY games_result_index (result),
    CONSTRAINT games_round_id_foreign
        FOREIGN KEY (round_id) REFERENCES rounds (id) ON DELETE CASCADE,
    CONSTRAINT games_white_player_id_foreign
        FOREIGN KEY (white_player_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT games_black_player_id_foreign
        FOREIGN KEY (black_player_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- ТЕСТОВЫЕ ДАННЫЕ
-- Пароль у всех пользователей: password
-- =====================================================================

INSERT INTO users (id, name, email, email_verified_at, password, role, rating, created_at, updated_at) VALUES
(1, 'Администратор Системы', 'admin@chess.test',     NOW(), '$2y$12$gYDjKB6qKJTGCLVzl3LeHexYIAnytKVJGXmCeRRsZhHm5YjiWgSPG', 'admin',     1200, NOW(), NOW()),
(2, 'Ержан Сапаров',         'organizer@chess.test', NOW(), '$2y$12$gYDjKB6qKJTGCLVzl3LeHexYIAnytKVJGXmCeRRsZhHm5YjiWgSPG', 'organizer', 2010, NOW(), NOW()),
(3, 'Айгерим Нурланова',     'aigerim@chess.test',   NOW(), '$2y$12$gYDjKB6qKJTGCLVzl3LeHexYIAnytKVJGXmCeRRsZhHm5YjiWgSPG', 'organizer', 1900, NOW(), NOW()),
(4, 'Данияр Ахметов',        'player@chess.test',    NOW(), '$2y$12$gYDjKB6qKJTGCLVzl3LeHexYIAnytKVJGXmCeRRsZhHm5YjiWgSPG', 'player',    1850, NOW(), NOW()),
(5, 'Алия Касымова',         'aliya@chess.test',     NOW(), '$2y$12$gYDjKB6qKJTGCLVzl3LeHexYIAnytKVJGXmCeRRsZhHm5YjiWgSPG', 'player',    1720, NOW(), NOW()),
(6, 'Тимур Беков',           'timur@chess.test',     NOW(), '$2y$12$gYDjKB6qKJTGCLVzl3LeHexYIAnytKVJGXmCeRRsZhHm5YjiWgSPG', 'player',    1640, NOW(), NOW()),
(7, 'Мадина Оразбаева',      'madina@chess.test',    NOW(), '$2y$12$gYDjKB6qKJTGCLVzl3LeHexYIAnytKVJGXmCeRRsZhHm5YjiWgSPG', 'player',    1580, NOW(), NOW()),
(8, 'Руслан Жумабаев',       'ruslan@chess.test',    NOW(), '$2y$12$gYDjKB6qKJTGCLVzl3LeHexYIAnytKVJGXmCeRRsZhHm5YjiWgSPG', 'player',    1450, NOW(), NOW()),
(9, 'Асель Тулегенова',      'asel@chess.test',      NOW(), '$2y$12$gYDjKB6qKJTGCLVzl3LeHexYIAnytKVJGXmCeRRsZhHm5YjiWgSPG', 'player',    1390, NOW(), NOW());

INSERT INTO time_controls (id, name, type, base_minutes, increment_seconds, created_at, updated_at) VALUES
(1, 'Классика 90+30', 'classical', 90, 30, NOW(), NOW()),
(2, 'Рапид 15+10',    'rapid',     15, 10, NOW(), NOW()),
(3, 'Рапид 10+5',     'rapid',     10,  5, NOW(), NOW()),
(4, 'Блиц 3+2',       'blitz',      3,  2, NOW(), NOW()),
(5, 'Пуля 1+0',       'bullet',     1,  0, NOW(), NOW());

INSERT INTO tournaments (id, user_id, time_control_id, title, description, format, location,
                         start_date, end_date, registration_deadline, max_participants,
                         rounds_count, min_rating, poster_path, status, created_at, updated_at) VALUES
(1, 2, 2, 'Осенний кубок',                 'Круговой турнир по рапиду для 4 сильнейших игроков клуба.', 'round_robin', 'Шахматный клуб, ул. Абая 10', '2026-10-10', '2026-10-11', '2026-10-05 23:59:00',  4, 3, NULL, NULL, 'finished',     NOW(), NOW()),
(2, 3, 4, 'Блиц-арена',                    'Еженедельный турнир по блицу, швейцарская система.',       'swiss',       'Онлайн',                      '2026-11-18', '2026-11-20', '2026-11-17 18:00:00', 16, 5, NULL, NULL, 'ongoing',      NOW(), NOW()),
(3, 2, 1, 'Классический чемпионат города', 'Отборочный турнир, допуск с рейтингом от 1500.',          'swiss',       'Дворец школьников',           '2026-12-12', '2026-12-20', '2026-12-05 23:59:00', 32, 9, 1500, NULL, 'registration', NOW(), NOW()),
(4, 3, 3, 'Турнир выходного дня',          NULL,                                                   'swiss',       'Шахматный клуб, ул. Абая 10', '2027-01-16', '2027-01-17', '2027-01-14 23:59:00', 24, 7, NULL, NULL, 'draft',        NOW(), NOW()),
(5, 2, 4, 'Новогодний блиц',               'Праздничный блиц-турнир.',                             'swiss',       'Онлайн',                      '2026-12-28', '2026-12-28', '2026-12-27 20:00:00', 20, 7, NULL, NULL, 'registration', NOW(), NOW());

INSERT INTO tournament_user (tournament_id, user_id, start_number, rating_at_start, status, created_at, updated_at) VALUES
(1, 4, 1, 1830, 'confirmed', NOW(), NOW()),
(1, 5, 2, 1710, 'confirmed', NOW(), NOW()),
(1, 6, 3, 1650, 'confirmed', NOW(), NOW()),
(1, 7, 4, 1575, 'confirmed', NOW(), NOW()),
(2, 4, 1, 1850, 'confirmed', NOW(), NOW()),
(2, 5, 2, 1720, 'confirmed', NOW(), NOW()),
(2, 6, 3, 1640, 'confirmed', NOW(), NOW()),
(2, 8, 4, 1450, 'confirmed', NOW(), NOW()),
(2, 9, 5, 1390, 'confirmed', NOW(), NOW()),
(3, 4, 1,    1850, 'confirmed', NOW(), NOW()),
(3, 5, NULL, 1720, 'pending',   NOW(), NOW()),
(3, 7, NULL, 1580, 'pending',   NOW(), NOW()),
(5, 8, NULL, 1450, 'pending',   NOW(), NOW()),
(5, 9, NULL, 1390, 'withdrawn', NOW(), NOW());

INSERT INTO rounds (id, tournament_id, number, starts_at, status, created_at, updated_at) VALUES
(1, 1, 1, '2026-10-10 10:00:00', 'completed', NOW(), NOW()),
(2, 1, 2, '2026-10-10 15:00:00', 'completed', NOW(), NOW()),
(3, 1, 3, '2026-10-11 10:00:00', 'completed', NOW(), NOW()),
(4, 2, 1, '2026-11-18 19:00:00', 'completed', NOW(), NOW()),
(5, 2, 2, '2026-11-19 19:00:00', 'ongoing',   NOW(), NOW());

INSERT INTO games (round_id, white_player_id, black_player_id, board_number, result, pgn, created_at, updated_at) VALUES
-- Осенний кубок, тур 1
(1, 4, 7,    1, 'white_win', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0', NOW(), NOW()),
(1, 5, 6,    2, 'draw',      NULL, NOW(), NOW()),
-- тур 2
(2, 6, 4,    1, 'black_win', NULL, NOW(), NOW()),
(2, 7, 5,    2, 'black_win', NULL, NOW(), NOW()),
-- тур 3
(3, 4, 5,    1, 'draw',      NULL, NOW(), NOW()),
(3, 6, 7,    2, 'white_win', NULL, NOW(), NOW()),
-- Блиц-арена, тур 1 (5 игроков, Тимур получает bye)
(4, 4, 9,    1, 'white_win', NULL, NOW(), NOW()),
(4, 5, 8,    2, 'draw',      NULL, NOW(), NOW()),
(4, 6, NULL, 3, 'bye',       NULL, NOW(), NOW()),
-- Блиц-арена, тур 2 (идёт)
(5, 6, 4,    1, 'pending',   NULL, NOW(), NOW()),
(5, 5, 9,    2, 'pending',   NULL, NOW(), NOW()),
(5, 8, NULL, 3, 'bye',       NULL, NOW(), NOW());

-- =====================================================================
-- ПРОВЕРОЧНЫЕ ЗАПРОСЫ С JOIN
-- =====================================================================

-- Запрос 1. Турниры с организатором и контролем времени
SELECT t.id,
       t.title,
       u.name  AS organizer,
       tc.name AS time_control,
       t.format,
       t.start_date,
       t.status
FROM tournaments t
JOIN users u          ON u.id  = t.user_id
JOIN time_controls tc ON tc.id = t.time_control_id
ORDER BY t.start_date;

-- Запрос 2. Заявки на «Классический чемпионат города» (связь M:N)
SELECT u.name,
       tu.rating_at_start,
       tu.start_number,
       tu.status
FROM tournament_user tu
JOIN users u ON u.id = tu.user_id
WHERE tu.tournament_id = 3
ORDER BY tu.rating_at_start DESC;

-- Запрос 3. Все партии «Осеннего кубка» с именами игроков
SELECT r.number       AS round_no,
       g.board_number AS board,
       w.name         AS white,
       b.name         AS black,
       g.result
FROM games g
JOIN rounds r     ON r.id = g.round_id
JOIN users w      ON w.id = g.white_player_id
LEFT JOIN users b ON b.id = g.black_player_id
WHERE r.tournament_id = 1
ORDER BY r.number, g.board_number;

-- Запрос 4. Турнирная таблица «Осеннего кубка» (очки считаются, а не хранятся)
SELECT u.name,
       SUM(CASE
             WHEN g.white_player_id = u.id AND g.result IN ('white_win', 'bye') THEN 1
             WHEN g.black_player_id = u.id AND g.result = 'black_win'          THEN 1
             WHEN g.result = 'draw'                                            THEN 0.5
             ELSE 0
           END)  AS points,
       COUNT(g.id) AS games_played
FROM tournament_user tu
JOIN users u       ON u.id = tu.user_id
JOIN rounds r      ON r.tournament_id = tu.tournament_id
LEFT JOIN games g  ON g.round_id = r.id
                  AND (g.white_player_id = u.id OR g.black_player_id = u.id)
                  AND g.result <> 'pending'
WHERE tu.tournament_id = 1
  AND tu.status = 'confirmed'
GROUP BY u.id, u.name
ORDER BY points DESC, u.name;

-- Запрос 5. Заполненность турниров: подтверждённые участники и свободные места
SELECT t.title,
       t.status,
       t.max_participants,
       COUNT(tu.id)                      AS confirmed,
       t.max_participants - COUNT(tu.id) AS free_places
FROM tournaments t
LEFT JOIN tournament_user tu ON tu.tournament_id = t.id
                            AND tu.status = 'confirmed'
GROUP BY t.id, t.title, t.status, t.max_participants
ORDER BY confirmed DESC, t.title;
