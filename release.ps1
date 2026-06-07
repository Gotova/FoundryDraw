<#
.SYNOPSIS
  Baut ein ZIP-Release fuer FoundryDraw und erhoeht die Versionsnummer automatisch.

.USAGE
  .\release.ps1          # Patch-Version erhoehen (1.0.0 -> 1.0.1)
  .\release.ps1 -Minor   # Minor-Version erhoehen (1.0.0 -> 1.1.0)
  .\release.ps1 -Major   # Major-Version erhoehen (1.0.0 -> 2.0.0)
#>

param(
  [switch]$Minor,
  [switch]$Major
)

$ErrorActionPreference = "Stop"

# --- Version bump ---
$manifest = Get-Content "module.json" -Raw | ConvertFrom-Json
$ver = [version]$manifest.version

if ($Major) {
  $newVer = "$($ver.Major + 1).0.0"
} elseif ($Minor) {
  $newVer = "$($ver.Major).$($ver.Minor + 1).0"
} else {
  $newVer = "$($ver.Major).$($ver.Minor).$($ver.Build + 1)"
}

Write-Host "Bumping version: $($manifest.version) -> $newVer"

# Update module.json in place
$raw = Get-Content "module.json" -Raw
$raw = $raw -replace '"version": "[^"]*"', "`"version`": `"$newVer`""
Set-Content "module.json" $raw -Encoding utf8

# --- Build ZIP ---
$zipName = "foundrydraw.zip"
if (Test-Path $zipName) { Remove-Item $zipName -Force }

$include = @("module.json","CHANGELOG.md","scripts","styles","lang","templates")
$files   = @()
foreach ($item in $include) {
  if (Test-Path $item) { $files += (Get-Item $item).FullName }
}

Compress-Archive -Path $files -DestinationPath $zipName -CompressionLevel Optimal
Write-Host "Created $zipName (v$newVer)"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. git add -A && git commit -m `"Release v$newVer`""
Write-Host "  2. git tag v$newVer && git push origin main --tags"
Write-Host "  3. Create GitHub Release 'v$newVer' and upload $zipName + module.json"
