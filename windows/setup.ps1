# Установка и запуск проекта «Шахматные турниры» (PHP и Composer ставятся в папку tools, систему не трогают)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root  = Split-Path -Parent $MyInvocation.MyCommand.Path
$tools = Join-Path $root 'tools'
$phpDir = Join-Path $tools 'php'
$php   = Join-Path $phpDir 'php.exe'
$composerPhar = Join-Path $tools 'composer.phar'
$app   = Join-Path $root 'chess-tournaments-api'
$src   = Join-Path $root 'src'
Start-Transcript -Path (Join-Path $root 'setup.log') -Force | Out-Null

function Step($t) { Write-Host ''; Write-Host "=== $t" -ForegroundColor Cyan }
function Run([string]$exe, [string[]]$a) {
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $exe @a 2>&1 | ForEach-Object { "$_" } | Out-Host
    $ErrorActionPreference = $old
    if ($LASTEXITCODE -ne 0) { throw "Команда завершилась с ошибкой ($LASTEXITCODE): $exe $($a -join ' ')" }
}
function Php([string[]]$a) { Run $php $a }
function Composer([string[]]$a) { Run $php (@($composerPhar) + $a) }

try {
    New-Item -ItemType Directory -Force $phpDir | Out-Null

    Step '1/8 PHP 8.3'
    if (-not (Test-Path $php)) {
        $zip = Join-Path $tools 'php.zip'
        Invoke-WebRequest 'https://windows.php.net/downloads/releases/latest/php-8.3-nts-Win32-vs16-x64-latest.zip' -OutFile $zip -UseBasicParsing
        Expand-Archive $zip $phpDir -Force
        Remove-Item $zip
    }
    $ini = Get-Content (Join-Path $phpDir 'php.ini-development')
    $ini = $ini -replace '^;\s*extension_dir = "ext"', 'extension_dir = "ext"'
    foreach ($ext in 'curl','fileinfo','mbstring','openssl','pdo_mysql','pdo_sqlite','sqlite3','zip') {
        $ini = $ini -replace "^;extension=$ext$", "extension=$ext"
    }
    $ini += 'memory_limit = 512M'
    Set-Content (Join-Path $phpDir 'php.ini') $ini -Encoding ASCII
    $ErrorActionPreference = 'Continue'
    & $php -v 2>&1 | ForEach-Object { "$_" } | Out-Host
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'PHP не запускается: ставлю Microsoft Visual C++ Redistributable' -ForegroundColor Yellow
        winget install --id Microsoft.VCRedist.2015+.x64 -e --accept-source-agreements --accept-package-agreements
        Php @('-v')
    }

    Step '2/8 Composer'
    if (-not (Test-Path $composerPhar)) {
        Invoke-WebRequest 'https://getcomposer.org/download/latest-stable/composer.phar' -OutFile $composerPhar -UseBasicParsing
    }
    $env:PATH = "$phpDir;$env:PATH"
    Composer @('--version')

    Step '3/8 Файлы проекта из архива'
    if (Test-Path $src) { Remove-Item $src -Recurse -Force }
    Expand-Archive (Join-Path $root 'chess-tournaments.zip') $src -Force
    $backend = Join-Path $src 'chess-tournaments\backend'

    Step '4/8 Laravel 12 (composer create-project, несколько минут)'
    if (-not (Test-Path (Join-Path $app 'artisan'))) {
        Composer @('create-project', 'laravel/laravel:^12.0', $app, '--no-interaction', '--prefer-dist')
    }
    Set-Location $app

    Step '5/8 API и Sanctum'
    if (-not (Test-Path (Join-Path $app 'routes\api.php'))) {
        Php @('artisan', 'install:api', '--no-interaction')
    }
    if (-not (Test-Path (Join-Path $app 'vendor\laravel\sanctum'))) {
        Composer @('require', 'laravel/sanctum:^4.0', '--no-interaction')
    }
    $tokensMigration = Get-ChildItem (Join-Path $app 'database\migrations') -Filter '*personal_access_tokens*' -ErrorAction SilentlyContinue
    if (-not $tokensMigration) {
        Php @('artisan', 'vendor:publish', '--provider=Laravel\Sanctum\SanctumServiceProvider', '--no-interaction')
    }
    if (-not (Test-Path (Join-Path $app 'config\cors.php'))) {
        Php @('artisan', 'config:publish', 'cors', '--no-interaction')
    }

    Step '6/8 Копирование кода проекта'
    Get-ChildItem $backend -Force | ForEach-Object { Copy-Item $_.FullName $app -Recurse -Force }
    $envText = Get-Content (Join-Path $app '.env.example') -Encoding UTF8
    # Для быстрого запуска — SQLite (файл database\database.sqlite). Переход на MySQL описан в README.
    $envText = $envText -replace '^DB_CONNECTION=.*', 'DB_CONNECTION=sqlite'
    $envText = $envText | Where-Object { $_ -notmatch '^DB_(HOST|PORT|DATABASE|USERNAME|PASSWORD)=' }
    [IO.File]::WriteAllLines((Join-Path $app '.env'), [string[]]$envText, (New-Object Text.UTF8Encoding($false)))
    $db = Join-Path $app 'database\database.sqlite'
    if (-not (Test-Path $db)) { New-Item -ItemType File $db | Out-Null }
    Php @('artisan', 'key:generate', '--force')
    Php @('artisan', 'config:clear')

    Step '7/8 База данных и тестовые данные'
    Php @('artisan', 'migrate:fresh', '--seed', '--force')
    Php @('artisan', 'storage:link', '--force')
    Php @('artisan', 'route:list', '--path=api')

    Step '8/8 Автотесты (через диск без кириллицы в пути)'
    $ErrorActionPreference = 'Continue'
    & (Join-Path $root 'tests.ps1') 2>&1 | ForEach-Object { "$_" } | Out-Host
    $ErrorActionPreference = 'Stop'

    Step 'Сборка React-клиента'
    & (Join-Path $root 'build-client.ps1')

    Write-Host ''
    Write-Host 'ГОТОВО. Запускаю сервер API (8000) и клиент (5500).' -ForegroundColor Green
    & (Join-Path $root 'run.ps1')
    Write-Host 'Вход: organizer@chess.test / player@chess.test / admin@chess.test, пароль password'
}
catch {
    Write-Host ''
    Write-Host "ОШИБКА: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace
}
finally {
    Stop-Transcript | Out-Null
}
