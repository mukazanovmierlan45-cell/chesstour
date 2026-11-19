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
    # корневые сертификаты: без них PHP не открывает HTTPS (cURL error 60 при запросах к Gemini)
    $cacert = Join-Path $phpDir 'cacert.pem'
    Invoke-WebRequest 'https://curl.se/ca/cacert.pem' -OutFile $cacert -UseBasicParsing
    $ini += "curl.cainfo=`"$cacert`""
    $ini += "openssl.cafile=`"$cacert`""
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

    Step '4/8 Laravel-проект из репозитория (backend)'
    New-Item -ItemType Directory -Force $app | Out-Null
    Copy-Item (Join-Path $backend '*') $app -Recurse -Force
    Set-Location $app

    Step '5/8 Зависимости PHP (composer install, несколько минут)'
    Composer @('install', '--no-interaction', '--prefer-dist')

    Step '6/8 Настройки .env'
    $envPath = Join-Path $app '.env'
    $utf8 = New-Object Text.UTF8Encoding($false)
    if (-not (Test-Path $envPath)) {
        # для быстрого запуска — SQLite (database\database.sqlite); переход на MySQL описан в README
        $envText = [IO.File]::ReadAllLines((Join-Path $app '.env.example'), $utf8)
        $envText = $envText -replace '^DB_CONNECTION=.*', 'DB_CONNECTION=sqlite'
        $envText = $envText | Where-Object { $_ -notmatch '^DB_(HOST|PORT|DATABASE|USERNAME|PASSWORD)=' }
        [IO.File]::WriteAllLines($envPath, [string[]]$envText, $utf8)
        Php @('artisan', 'key:generate', '--force')
    } elseif (-not (Select-String -Path $envPath -Pattern '^GEMINI_API_KEY=' -Quiet)) {
        # существующий .env не перезаписываем (там ключи), только дописываем настройки ИИ
        [IO.File]::AppendAllText($envPath, "`r`n# ИИ-ассистент (Google Gemini)`r`nGEMINI_API_KEY=`r`nGEMINI_MODEL=gemini-2.5-flash`r`n", $utf8)
    }
    $db = Join-Path $app 'database\database.sqlite'
    if (-not (Test-Path $db)) { New-Item -ItemType File $db | Out-Null }
    Php @('artisan', 'config:clear')

    Step '7/8 База данных и тестовые данные'
    Php @('artisan', 'migrate', '--force')
    if (-not (Test-Path (Join-Path $app '.seeded'))) { Php @('artisan', 'db:seed', '--force'); New-Item -ItemType File (Join-Path $app '.seeded') | Out-Null }
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
