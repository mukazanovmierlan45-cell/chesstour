# Автотесты API. PHPUnit не читает phpunit.xml из пути с кириллицей (C:\Users\Элит),
# поэтому проект временно подключается как диск без кириллицы (команда subst).
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$php = Join-Path $root 'tools\php\php.exe'
$app = Join-Path $root 'chess-tournaments-api'
Start-Transcript -Path (Join-Path $root 'tests.log') -Force | Out-Null
$used = (Get-PSDrive -PSProvider FileSystem).Name
$letter = @('T','R','Q','P','O','N') | Where-Object { $used -notcontains $_ } | Select-Object -First 1
subst "${letter}:" "$app"
try {
    Set-Location "${letter}:\"
    & $php artisan test 2>&1 | ForEach-Object { "$_" } | Out-Host
    Write-Host ''
    if ($LASTEXITCODE -eq 0) { Write-Host 'Все тесты пройдены.' -ForegroundColor Green }
    else { Write-Host "Есть упавшие тесты (код $LASTEXITCODE)." -ForegroundColor Red }
}
finally {
    Set-Location $root
    subst "${letter}:" /d
    Stop-Transcript | Out-Null
}
