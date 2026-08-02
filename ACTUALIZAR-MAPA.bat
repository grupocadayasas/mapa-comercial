@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================
echo   ACTUALIZAR MAPA COMERCIAL - GRUPO CADAYA
echo ================================================
echo.

if not exist "Mapa-Comercial.csv" (
  echo ERROR: No se encuentra Mapa-Comercial.csv en esta carpeta.
  echo Copia el archivo CSV en la raiz del repositorio y vuelve a ejecutar.
  pause
  exit /b 1
)

git add Mapa-Comercial.csv

git diff --cached --quiet
if %errorlevel%==0 (
  echo No hay cambios nuevos en Mapa-Comercial.csv.
  pause
  exit /b 0
)

git commit -m "Actualizar base del mapa comercial"
if errorlevel 1 (
  echo.
  echo ERROR: No fue posible crear el commit.
  pause
  exit /b 1
)

git push origin main
if errorlevel 1 (
  echo.
  echo ERROR: No fue posible enviar los cambios a GitHub.
  echo Verifica tu conexion o autenticacion de GitHub.
  pause
  exit /b 1
)

echo.
echo ACTUALIZACION ENVIADA CORRECTAMENTE.
echo GitHub Pages puede tardar entre 1 y 3 minutos en reflejarla.
echo Abre: https://grupocadayasas.github.io/mapa-comercial/
pause
