$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$mysqlRoot = Join-Path $projectRoot '.mysql'
$mysql = Join-Path $mysqlRoot 'mysql-8.4.9-winx64\bin\mysql.exe'
$schema = Join-Path $projectRoot 'backend\src\database\schema.sql'
$seed = Join-Path $projectRoot 'backend\src\database\seed.sql'

if (!(Test-Path $mysql)) {
  throw "Cliente mysql nao encontrado em $mysql"
}

& $mysql --protocol=tcp -h 127.0.0.1 -P 3306 -u root -e "DROP DATABASE IF EXISTS dm_pdv;"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Get-Content -Raw $schema | & $mysql --protocol=tcp -h 127.0.0.1 -P 3306 -u root
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Get-Content -Raw $seed | & $mysql --protocol=tcp -h 127.0.0.1 -P 3306 -u root
exit $LASTEXITCODE
