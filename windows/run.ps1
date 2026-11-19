# Запуск: сервер API (8000) и собранный React-клиент (5500)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$php = Join-Path $root 'tools\php\php.exe'
$app = Join-Path $root 'chess-tournaments-api'
$dist = Join-Path $root 'src\chess-tournaments\client\dist'
if (-not (Test-Path (Join-Path $dist 'index.html'))) {
    Write-Host 'Клиент ещё не собран — запускаю сборку (СОБРАТЬ_КЛИЕНТ.bat)...' -ForegroundColor Yellow
    & (Join-Path $root 'build-client.ps1')
}
# останавливаем серверы проекта от прошлого запуска: все PHP из папки tools
# (в том числе php artisan serve, который сам перезапускает дочерний сервер), затем — занявших порты
$phpDir = Join-Path $root 'tools\php'
Get-CimInstance Win32_Process -Filter "Name='php.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($phpDir, [StringComparison]::OrdinalIgnoreCase) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
foreach ($port in 8000, 5500) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -eq 'php') { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    }
}
Start-Sleep -Milliseconds 500
# API: то же, что php artisan serve, но с относительным путём к роутеру Laravel —
# artisan serve на Windows не открывает server.php, если в пути есть кириллица (C:\Users\Элит)
$public = Join-Path $app 'public'
Start-Process $php -ArgumentList '-S','127.0.0.1:8000','../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php' -WorkingDirectory $public
Start-Process $php -ArgumentList '-S','127.0.0.1:5500','-t',"`"$dist`"" -WorkingDirectory $dist
Start-Sleep -Seconds 3
Start-Process 'http://127.0.0.1:5500'
