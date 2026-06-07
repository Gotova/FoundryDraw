<#
.SYNOPSIS
  Baut ein ZIP-Release fuer FoundryDraw, erhoeht die Versionsnummer automatisch,
  updated README.md und pusht alles als GitHub Release.

.USAGE
  .\release.ps1          # Patch-Version erhoehen (1.0.0 -> 1.0.1)
  .\release.ps1 -Minor   # Minor-Version erhoehen (1.0.0 -> 1.1.0)
  .\release.ps1 -Major   # Major-Version erhoehen (1.0.0 -> 2.0.0)
  .\release.ps1 -DryRun  # Nur anzeigen, was passieren wuerde
#>

param(
  [switch]$Minor,
  [switch]$Major,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ── 1. Version bump ──────────────────────────────────────────────────────────
$manifest = Get-Content "module.json" -Raw | ConvertFrom-Json
$oldVer   = $manifest.version
$ver      = [version]$oldVer

if ($Major) {
  $newVer = "$($ver.Major + 1).0.0"
} elseif ($Minor) {
  $newVer = "$($ver.Major).$($ver.Minor + 1).0"
} else {
  $newVer = "$($ver.Major).$($ver.Minor).$($ver.Build + 1)"
}

Write-Host "Version: $oldVer -> $newVer" -ForegroundColor Cyan
if ($DryRun) { Write-Host "[DryRun] Keine Aenderungen vorgenommen." -ForegroundColor Yellow; exit 0 }

# ── 2. module.json updaten ───────────────────────────────────────────────────
$raw = Get-Content "module.json" -Raw
$raw = $raw -replace '"version": "[^"]*"', "`"version`": `"$newVer`""
Set-Content "module.json" $raw -Encoding utf8
Write-Host "Updated module.json" -ForegroundColor Green

# ── 3. README.md Badge updaten ───────────────────────────────────────────────
if (Test-Path "README.md") {
  $readme = Get-Content "README.md" -Raw
  # Update version badge  ![Version](https://img.shields.io/badge/version-X.Y.Z-...)
  $readme = $readme -replace '(?<=version-)\d+\.\d+\.\d+(?=-)', $newVer
  Set-Content "README.md" $readme -Encoding utf8
  Write-Host "Updated README.md (version badge)" -ForegroundColor Green
}

# ── 4. CHANGELOG.md: neuen Eintrag oben einfuegen ───────────────────────────
$today    = (Get-Date).ToString("yyyy-MM-dd")
$newEntry = "## $newVer – $today`n- (Bitte Aenderungen hier eintragen)`n"

if (Test-Path "CHANGELOG.md") {
  $cl  = Get-Content "CHANGELOG.md" -Raw
  # Insert after the first line (the "# Changelog" heading)
  $cl  = $cl -replace '(# Changelog\r?\n)', "`$1`n$newEntry"
  Set-Content "CHANGELOG.md" $cl -Encoding utf8
  Write-Host "Updated CHANGELOG.md (added placeholder for v$newVer)" -ForegroundColor Green
}

# ── 5. ZIP bauen ─────────────────────────────────────────────────────────────
$zipName = "foundrydraw.zip"
if (Test-Path $zipName) { Remove-Item $zipName -Force }

$include = @("module.json","CHANGELOG.md","README.md","scripts","styles","lang")
$files   = @()
foreach ($item in $include) {
  if (Test-Path $item) { $files += (Get-Item $item).FullName }
}

Compress-Archive -Path $files -DestinationPath $zipName -CompressionLevel Optimal
Write-Host "Built $zipName" -ForegroundColor Green

# ── 6. Git commit + tag + push ───────────────────────────────────────────────
git add module.json README.md CHANGELOG.md foundrydraw.zip
git commit -m "Release v$newVer"
git tag "v$newVer"
git push origin main
git push origin "v$newVer"
Write-Host "Pushed to GitHub" -ForegroundColor Green

# ── 7. GitHub Release erstellen ──────────────────────────────────────────────
$notes = "## v$newVer`n`nSiehe [CHANGELOG.md](https://github.com/Gotova/FoundryDraw/blob/main/CHANGELOG.md) fuer alle Aenderungen."
gh release create "v$newVer" foundrydraw.zip module.json `
  --title "v$newVer" `
  --notes $notes

Write-Host ""
Write-Host "Release v$newVer veroeffentlicht!" -ForegroundColor Magenta
Write-Host "https://github.com/Gotova/FoundryDraw/releases/tag/v$newVer"
Write-Host ""
Write-Host "Vergiss nicht: CHANGELOG.md mit echten Aenderungen befuellen und erneut pushen." -ForegroundColor Yellow
