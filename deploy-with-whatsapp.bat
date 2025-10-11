@echo off
echo 🚀 Agent System 2.0 - Deploy with WhatsApp Support
echo ================================================

echo.
echo 📋 בדיקת קבצים נדרשים...

if not exist "render.yaml" (
    echo ❌ קובץ render.yaml לא נמצא
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ❌ קובץ package.json לא נמצא
    pause
    exit /b 1
)

echo ✅ כל הקבצים הנדרשים קיימים

echo.
echo 📤 מעלה לגיטהאב...

git add .
git status

echo.
set /p commit_msg="הכנס הודעת commit (או לחץ Enter לברירת מחדל): "
if "%commit_msg%"=="" set commit_msg=Update system with WhatsApp support

git commit -m "%commit_msg%"
git push origin main

if %errorlevel% neq 0 (
    echo ❌ שגיאה בהעלאה לגיטהאב
    pause
    exit /b 1
)

echo ✅ הועלה לגיטהאב בהצלחה!

echo.
echo 🌐 פתיחת Render.com לפריסה...
start https://render.com/

echo.
echo 📋 השלבים הבאים:
echo 1. היכנס ל-Render.com
echo 2. צור Web Service חדש מה-GitHub repository
echo 3. הגדר את משתני הסביבה של Twilio:
echo    - TWILIO_ACCOUNT_SID
echo    - TWILIO_AUTH_TOKEN
echo    - TWILIO_WHATSAPP_FROM
echo 4. פרוס את השירות
echo.
echo 📖 מדריך מפורט: DEPLOYMENT_WHATSAPP_GUIDE.md
echo.

pause
