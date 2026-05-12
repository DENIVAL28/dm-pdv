$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$mysqlRoot = Join-Path $projectRoot '.mysql'
$mysqlBin = Join-Path $mysqlRoot 'mysql-8.4.9-winx64\bin'
$mysqld = Join-Path $mysqlBin 'mysqld.exe'
$config = Join-Path $mysqlRoot 'my.ini'
$stdout = Join-Path $mysqlRoot 'mysqld-runtime.out.log'
$stderr = Join-Path $mysqlRoot 'mysqld-runtime.err.log'

if (!(Test-Path $mysqld)) {
  throw "MySQL local nao encontrado em $mysqld"
}

$running = Get-NetTCPConnection -LocalPort 3306 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq 'Listen' } |
  Select-Object -First 1

if ($running) {
  Write-Output 'MySQL local ja esta rodando na porta 3306.'
  exit 0
}

Start-Process -FilePath $mysqld `
  -ArgumentList "--defaults-file=$config", '--console' `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr

Start-Sleep -Seconds 6

$running = Get-NetTCPConnection -LocalPort 3306 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq 'Listen' } |
  Select-Object -First 1

if (!$running) {
  throw 'MySQL local nao subiu corretamente.'
}

Write-Output 'MySQL local iniciado com sucesso na porta 3306.'
