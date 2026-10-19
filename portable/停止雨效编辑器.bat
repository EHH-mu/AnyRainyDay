@echo off
chcp 65001 >nul
set "PORT_FILE=%~dp0.server\port.txt"
if not exist "%PORT_FILE%" (
  echo 没有检测到正在运行的编辑器。
  pause
  exit /b 0
)

for /f "usebackq delims=" %%P in ("%PORT_FILE%") do set "EDITOR_PORT=%%P"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:%EDITOR_PORT%/__stop') | Out-Null; Write-Host '已发送停止命令。' } catch { Write-Host '停止失败，可能服务已经关闭。' }"
pause
