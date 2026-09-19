@echo off
title BuildMate India - Contractor Marketplace Server
echo ===================================================
echo Starting BuildMate Marketplace Server...
echo ===================================================
cd /d "%~dp0"
start http://127.0.0.1:8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
