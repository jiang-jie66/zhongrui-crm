@echo off
echo ===================================
echo   中睿智能商机管理系统 - 启动脚本
echo ===================================

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
  pause
  exit /b 1
)

REM 安装并启动后端
echo [1/4] 安装后端依赖...
cd /d "%~dp0server"
call npm install
if %errorlevel% neq 0 (
  echo [错误] 后端依赖安装失败，请检查网络或手动安装
  pause
  exit /b 1
)

echo [2/4] 启动后端服务（端口 3001）...
start "CRM后端" cmd /k "npm run dev"

REM 等待后端启动
timeout /t 5 >nul

REM 安装并启动前端
echo [3/4] 安装前端依赖...
cd /d "%~dp0client"
call npm install
if %errorlevel% neq 0 (
  echo [错误] 前端依赖安装失败
  pause
  exit /b 1
)

echo [4/4] 启动前端服务（端口 3000）...
start "CRM前端" cmd /k "npm run dev"

echo.
echo ===================================
echo   ✅ 启动完成！
echo   前端：http://localhost:3000
echo   后端：http://localhost:3001
echo   默认账号：admin / admin123
echo ===================================
echo.
start http://localhost:3000
pause
