# Сборка React-клиента: переносной Node.js ставится в папку tools, система не меняется
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$tools  = Join-Path $root 'tools'
$nodeDir = Join-Path $tools 'node'
$client = Join-Path $root 'src\chess-tournaments\client'
Start-Transcript -Path (Join-Path $root 'build-client.log') -Force | Out-Null

function Run([string]$exe, [string[]]$a) {
    $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    & $exe @a 2>&1 | ForEach-Object { "$_" } | Out-Host
    $ErrorActionPreference = $old
    if ($LASTEXITCODE -ne 0) { throw "Команда завершилась с ошибкой ($LASTEXITCODE): $exe $($a -join ' ')" }
}

try {
    Write-Host '=== 1/3 Node.js 22 (переносной)' -ForegroundColor Cyan
    if (-not (Test-Path (Join-Path $nodeDir 'node.exe'))) {
        $index = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
        $version = ($index | Where-Object { $_.version -like 'v22.*' -and $_.files -contains 'win-x64-zip' } | Select-Object -First 1).version
        $zip = Join-Path $tools 'node.zip'
        Invoke-WebRequest "https://nodejs.org/dist/$version/node-$version-win-x64.zip" -OutFile $zip -UseBasicParsing
        $tmp = Join-Path $tools 'node-tmp'
        if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
        Expand-Archive $zip $tmp -Force
        Move-Item (Get-ChildItem $tmp | Select-Object -First 1).FullName $nodeDir
        Remove-Item $zip, $tmp -Recurse -Force
    }
    $env:PATH = "$nodeDir;$env:PATH"
    Run (Join-Path $nodeDir 'node.exe') @('-v')
    $npm = Join-Path $nodeDir 'npm.cmd'

    Write-Host '=== 2/3 Зависимости клиента (npm install)' -ForegroundColor Cyan
    Set-Location $client
    Run $npm @('install', '--no-audit', '--no-fund')

    Write-Host '=== 3/3 Сборка (vite build)' -ForegroundColor Cyan
    Run $npm @('run', 'build')
    Write-Host ''
    Write-Host 'ГОТОВО: клиент собран в client\dist. Запуск — ЗАПУСТИТЬ.bat' -ForegroundColor Green
}
catch {
    Write-Host ''
    Write-Host "ОШИБКА: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Stop-Transcript | Out-Null
}
