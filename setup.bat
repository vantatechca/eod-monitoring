@echo off
echo 🚀 EOD Monitor - Automated Setup
echo ================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i

echo ✅ Node.js version: %NODE_VERSION%
echo ✅ npm version: %NPM_VERSION%
echo.

REM Install server dependencies
echo 📦 Installing server dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install server dependencies
    pause
    exit /b 1
)
echo ✅ Server dependencies installed
echo.

REM Install client dependencies
echo 📦 Installing client dependencies...
cd client
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install client dependencies
    pause
    exit /b 1
)
cd ..
echo ✅ Client dependencies installed
echo.

REM Create .env if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ✅ .env file created
) else (
    echo ✅ .env file already exists
)

echo.
echo ✨ Setup complete!
echo.
echo To start the application:
echo.
echo Development Mode (recommended):
echo   Terminal 1: npm run dev
echo   Terminal 2: npm run client
echo.
echo Production Mode:
echo   npm run build
echo   set NODE_ENV=production
echo   npm start
echo.
echo 📖 Read QUICKSTART.md for detailed instructions
echo.
pause
