@echo off
cd /d "%~dp0"
node serve.cjs --open
if errorlevel 1 pause
