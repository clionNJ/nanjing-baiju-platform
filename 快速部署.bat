@echo off
chcp 65001 >nul
echo ========================================
echo 南京白局非遗文化数字平台 - 快速部署脚本
echo ========================================
echo.

:: 检查Git是否安装
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Git，请先安装Git
    echo 下载地址: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/5] 检查Git状态...
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo [信息] 初始化Git仓库...
    git init
)

echo [2/5] 添加文件到Git...
git add .

echo [3/5] 提交更改...
git commit -m "Deploy: 南京白局非遗文化数字平台" >nul 2>&1

echo.
echo ========================================
echo 部署准备完成！
echo ========================================
echo.
echo 接下来的步骤：
echo.
echo 1. 访问 https://github.com 并登录
echo 2. 点击右上角 "+" → "New repository"
echo 3. 输入仓库名称（如：nanjing-baiju-platform）
echo 4. 选择 Public，不要勾选 README
echo 5. 点击 "Create repository"
echo.
echo 然后运行以下命令（替换YOUR_USERNAME为你的GitHub用户名）：
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/nanjing-baiju-platform.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 最后在GitHub仓库设置中启用Pages：
echo Settings → Pages → Source: main branch → Save
echo.
pause

