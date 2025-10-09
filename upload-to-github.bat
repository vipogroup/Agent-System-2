@echo off
echo Starting Git upload process...
echo.

cd /d "C:\Users\ALFA DPM\Downloads\vipo grop\ניסוי חדש נשלח ליניב\1"

echo Initializing Git repository...
git init

echo Adding all files...
git add .

echo Creating commit...
git commit -m "Security improvements: removed hardcoded credentials, enhanced JWT security, and verified SQL injection protection"

echo Setting main branch...
git branch -M main

echo Adding remote origin...
git remote add origin https://github.com/vipogroup/Agent-System-2.git

echo Pushing to GitHub...
git push -u origin main

echo.
echo Upload completed!
pause
