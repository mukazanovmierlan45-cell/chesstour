# Запуск: сервер API (8000) и собранный React-клиент (5500)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$php = Join-Path $root 'tools\php\php.exe'
$app = Join-Path $root 'chess-tournaments-api'
$dist = Join-Path $root 'src\chess-tournaments\client\dist'
if (-not (Test-Path (Join-Path $dist 'index.html'))) {
    Write-Host 'Клиент ещё не собран — запускаю сборку (СОБРАТЬ_КЛИЕНТ.bat)...' -ForegroundColor Yellow
    & (Join-Path $root 'build-client.ps1')
}
Start-Process $php -ArgumentList 'artisan','serve','--host=127.0.0.1','--port=8000' -WorkingDirectory $app
Start-Process $php -ArgumentList '-S','127.0.0.1:5500','-t',"`"$dist`"" -WorkingDirectory $dist
Start-Sleep -Seconds 3
Start-Process 'http://127.0.0.1:5500'
