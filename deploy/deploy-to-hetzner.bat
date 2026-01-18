@echo off
REM =============================================================================
REM CutList Optimizer - Deploy naar Hetzner (zonder lokale Docker)
REM Upload source code, build op server
REM =============================================================================

echo.
echo =========================================
echo    CutList Optimizer - Deploy Script
echo    (Server-side build)
echo =========================================
echo.

REM Configuratie
set SERVER_IP=46.224.215.142
set SERVER_USER=root
set PROJECT_DIR=X:\10_3BM_bouwkunde\50_Claude-Code-Projects\CutListOptimizer

REM Ga naar project directory
cd /d %PROJECT_DIR%

REM 1. Maak deploy package (zonder node_modules en __pycache__)
echo [1/4] Deploy package maken...
if exist deploy-package.tar del deploy-package.tar

tar --exclude="node_modules" --exclude="__pycache__" --exclude=".git" --exclude="dist" --exclude="*.tar" --exclude="*.tar.gz" -cvf deploy-package.tar src backend package.json package-lock.json vite.config.js tailwind.config.js postcss.config.js index.html nginx.conf docker-compose.yml Dockerfile

if errorlevel 1 (
    echo FOUT: Tar maken gefaald!
    pause
    exit /b 1
)

REM 2. Upload naar server
echo [2/4] Uploaden naar server...
scp deploy-package.tar %SERVER_USER%@%SERVER_IP%:/opt/cutlist-optimizer/
if errorlevel 1 (
    echo FOUT: Upload gefaald! Check SSH verbinding.
    pause
    exit /b 1
)

REM 3. Build en start op server
echo [3/4] Building en starten op server...
ssh %SERVER_USER%@%SERVER_IP% "cd /opt/cutlist-optimizer && tar -xvf deploy-package.tar && docker compose down && docker compose build --no-cache && docker compose up -d && docker compose ps"
if errorlevel 1 (
    echo FOUT: Server build gefaald!
    pause
    exit /b 1
)

REM 4. Cleanup
echo [4/4] Opruimen...
del deploy-package.tar

echo.
echo =========================================
echo    DEPLOY COMPLEET!
echo =========================================
echo.
echo App bereikbaar op: http://%SERVER_IP%
echo.
pause
