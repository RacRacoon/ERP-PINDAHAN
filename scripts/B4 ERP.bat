@echo off
title B4 ERP
cd /d "%~dp0.."

netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if %errorlevel%==0 (
  echo Server B4 ERP sudah berjalan. Membuka browser...
  start "" http://localhost:3000
  timeout /t 3 >nul
  exit /b
)

echo ============================================
echo   B4 ERP - menyalakan server...
echo   Biarkan jendela ini terbuka selama dipakai.
echo   Tutup jendela ini untuk mematikan server.
echo ============================================
echo.

rem Bangun ulang hanya kalau kode lebih baru dari build terakhir.
powershell -NoProfile -Command "$b = Get-Item '.next\BUILD_ID' -ErrorAction SilentlyContinue; if (-not $b) { exit 1 }; $n = Get-ChildItem src, prisma, package.json, next.config.ts -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt $b.LastWriteTime } | Select-Object -First 1; if ($n) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo Membangun versi terbaru, tunggu sebentar...
  call npm run build
  if errorlevel 1 (
    echo.
    echo Build gagal. Lihat pesan di atas.
    pause
    exit /b 1
  )
)

start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"
call npm run start
echo.
echo Server berhenti. Tekan tombol apa saja untuk menutup.
pause >nul