param(
  [switch]$SqlOnly
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$migrationsPath = Join-Path $root "supabase\migrations"
$seedPath = Join-Path $root "supabase\seed.sql"
$setupPath = Join-Path $root "supabase\setup.sql"
$upgradePath = Join-Path $root "supabase\apply-transactions.sql"

if (-not (Test-Path $migrationsPath -PathType Container)) {
  throw "Direktori migrasi SQL tidak ditemukan: $migrationsPath"
}
if (-not (Test-Path $seedPath -PathType Leaf)) {
  throw "File SQL sumber tidak ditemukan: $seedPath"
}

$migrationFiles = @(Get-ChildItem $migrationsPath -Filter "*.sql" -File | Sort-Object Name)
if ($migrationFiles.Count -eq 0) {
  throw "Tidak ada file migrasi SQL pada: $migrationsPath"
}
$foundation = $migrationFiles | Where-Object { $_.Name -eq "202611050001_foundation.sql" }
if (-not $foundation) {
  throw "Migrasi pondasi 202611050001_foundation.sql tidak ditemukan."
}
$incrementalMigrations = @($migrationFiles | Where-Object { $_.Name -ne $foundation.Name })

$setupSql = @(
  "-- GENERATED FILE: run only once in a new Supabase development project."
  "-- Source files: all ordered migrations and seed.sql."
  "-- Do not run this setup on a production or non-empty database."
  ""
)
foreach ($migration in $migrationFiles) {
  $migrationSql = [System.IO.File]::ReadAllText($migration.FullName, [System.Text.Encoding]::UTF8)
  $setupSql += @("-- MIGRATION: $($migration.Name)", $migrationSql, "")
}
$seedSql = [System.IO.File]::ReadAllText($seedPath, [System.Text.Encoding]::UTF8)
$setupSql += @("-- DATASET SEED", $seedSql)
[System.IO.File]::WriteAllText($setupPath, ($setupSql -join "`r`n"), (New-Object System.Text.UTF8Encoding($false)))

if ($incrementalMigrations.Count -gt 0) {
  $upgradeSql = @(
    "-- GENERATED FILE: apply pending transactions migrations to a database that already ran the foundation setup."
    "-- Verify that each included migration has not already been applied."
    "begin;"
    ""
  )
  foreach ($migration in $incrementalMigrations) {
    $migrationSql = [System.IO.File]::ReadAllText($migration.FullName, [System.Text.Encoding]::UTF8)
    $upgradeSql += @("-- MIGRATION: $($migration.Name)", $migrationSql, "")
  }
  $upgradeSql += @("commit;")
  [System.IO.File]::WriteAllText($upgradePath, ($upgradeSql -join "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
}
Write-Output "SQL Editor bundle created: $setupPath"
if ($incrementalMigrations.Count -gt 0) {
  Write-Output "Incremental migrations bundle created: $upgradePath"
}

if ($SqlOnly) {
  exit 0
}

$envPath = Join-Path $root ".env.local"
$envValues = @{}
$otherLines = @()
if (Test-Path $envPath -PathType Leaf) {
  foreach ($line in Get-Content $envPath) {
    if ($line -match "^\s*(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)\s*=(.*)$") {
      $envValues[$Matches[1]] = $Matches[2].Trim()
    } else {
      $otherLines += $line
    }
  }
}

foreach ($key in @("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
  if (-not $envValues.ContainsKey($key) -or -not $envValues[$key]) {
    $prompt = if ($key -eq "NEXT_PUBLIC_SUPABASE_URL") {
      "Masukkan Project URL dari Supabase"
    } else {
      "Masukkan publishable key atau legacy anon key dari Supabase"
    }
    $envValues[$key] = (Read-Host $prompt).Trim()
  }
  if (-not $envValues[$key]) {
    throw "$key wajib diisi; environment lokal tidak ditulis."
  }
}

try {
  $projectUri = [Uri]$envValues["NEXT_PUBLIC_SUPABASE_URL"]
  if ($projectUri.Scheme -notin @("https", "http") -or -not $projectUri.Host) {
    throw "URL harus berupa URL HTTP/HTTPS yang valid."
  }
} catch {
  throw "NEXT_PUBLIC_SUPABASE_URL tidak valid. Environment lokal tidak ditulis."
}

$lines = @(
  "# Local development only. Never commit this file."
  "NEXT_PUBLIC_SUPABASE_URL=$($envValues['NEXT_PUBLIC_SUPABASE_URL'])"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$($envValues['NEXT_PUBLIC_SUPABASE_ANON_KEY'])"
)
$lines += $otherLines
Set-Content -Path $envPath -Value $lines -Encoding UTF8
Write-Output "Local configuration saved: $envPath"
Write-Output "Next: run supabase/setup.sql once in the new project's Supabase SQL Editor."
Write-Output "Create an Auth user and assign its owner profile using docs/supabase-setup.md."
