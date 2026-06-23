@echo off
chcp 65001 >nul
title 中睿智能商机管理系统 - 局域网模式
echo.
echo ============================================
echo    中睿智能商机管理系统
echo ============================================
echo.
echo 启动中...
cd /d "F:\AI工作站\商机管理系统\server"
npx tsx src/index.ts
echo.
pause
