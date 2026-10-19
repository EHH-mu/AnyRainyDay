@echo off
chcp 65001 >nul
cd /d "%~dp0"

if exist "%~dp0直接打开编辑器.html" (
  start "" "%~dp0直接打开编辑器.html"
  exit /b 0
)

if exist "%~dp0editor-standalone.html" (
  start "" "%~dp0editor-standalone.html"
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
