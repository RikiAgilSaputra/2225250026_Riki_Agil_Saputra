# Menjalankan LangkahKu (Windows PowerShell): build PWA lalu jalankan server di http://localhost:8000
# Pemakaian:  powershell -ExecutionPolicy Bypass -File scripts\start.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path $root 'apps\api'
$web = Join-Path $root 'apps\web'

if (-not (Test-Path (Join-Path $api '.venv'))) {
  Write-Host 'Menyiapkan Python venv...'
  python -m venv (Join-Path $api '.venv')
  & (Join-Path $api '.venv\Scripts\python.exe') -m pip install -r (Join-Path $api 'requirements.txt')
}
if (-not (Test-Path (Join-Path $web 'node_modules'))) {
  Write-Host 'Memasang paket frontend...'
  Push-Location $web; npm install; Pop-Location
}
Write-Host 'Membangun PWA...'
Push-Location $web; npm run build; Pop-Location

Write-Host ''
Write-Host 'LangkahKu berjalan di http://localhost:8000  (akun demo: siswa/siswa123, guru/guru123)'
Write-Host 'Tekan Ctrl+C untuk berhenti.'
Push-Location $api
& (Join-Path $api '.venv\Scripts\python.exe') -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Pop-Location
