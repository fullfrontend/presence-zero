@echo off
REM Stage is assumed done. Creates HEAD with message arg, no Co-authored-by.
REM Usage: scripts\commit-clean.bat "feat: message"
if "%~1"=="" (
  echo Usage: scripts\commit-clean.bat "feat: message"
  exit /b 1
)
for /f %%t in ('git write-tree') do set TREE=%%t
for /f %%p in ('git rev-parse HEAD') do set PARENT=%%p
echo %~1> %TEMP%\pz-commit-msg.txt
for /f %%i in ('git commit-tree %TREE% -p %PARENT% ^< %TEMP%\pz-commit-msg.txt') do set NEW=%%i
if "%NEW%"=="" (
  echo commit-tree failed
  exit /b 1
)
git reset --soft %NEW%
git log -1 --format=%%B
git status -sb
