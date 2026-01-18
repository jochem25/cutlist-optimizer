@echo off
set "PYTHON=C:\Users\Joche\AppData\Local\Programs\Python\Python312\python.exe"
set "PIP=C:\Users\Joche\AppData\Local\Programs\Python\Python312\Scripts\pip.exe"
cd /d C:\DATA\3BM_administratie\10_3BM_bouwkunde\50_Claude-Code-Projects\CutListOptimizer\backend
echo Installing dependencies...
"%PIP%" install -r requirements.txt
echo.
echo Starting backend server...
"%PYTHON%" main.py
pause
