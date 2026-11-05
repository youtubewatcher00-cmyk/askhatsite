@echo off
chcp 65001 >nul
title IT Инфрақұрылым — сайтты іске қосу
cd /d "%~dp0"

echo ==========================================
echo   IT ИНФРАҚҰРЫЛЫМ САБАҒЫ — ТАПСЫРМАСЫ
echo ==========================================

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js табылмады!
  echo https://nodejs.org сайтынан Node.js LTS орнатыңыз.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo .env файлы автоматты түрде жасалды.
)

if not exist "node_modules" (
  echo Қажетті пакеттер орнатылуда...
  call npm install
  if errorlevel 1 (
    echo npm install кезінде қате шықты.
    pause
    exit /b 1
  )
)

start "" http://localhost:3000
call npm start
pause