@echo off
echo ========================================
echo    Agent System - Deploy to GitHub
echo ========================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo Initializing Git repository...
    git init
    git remote add origin https://github.com/vipogroup/Agent-System-2.git
)

echo Adding files to Git...

REM Add essential files
git add simple-server.js
git add package.json
git add package-lock.json
git add .env.example
git add .gitignore
git add render.yaml
git add README.md

REM Add HTML files
git add github-system.html
git add admin-login.html
git add agent-login.html
git add agent-dashboard.html
git add tracking-code.js

REM Add public directory
git add public/

REM Add vc directory (sales site)
git add vc/

echo.
echo Files added to Git staging area.
echo.

REM Commit changes
set /p commit_message="Enter commit message (or press Enter for default): "
if "%commit_message%"=="" set commit_message="Updated Agent System - Production Ready"

git commit -m "%commit_message%"

echo.
echo Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
echo    Deployment completed!
echo    Check: https://github.com/vipogroup/Agent-System-2
echo ========================================
pause
