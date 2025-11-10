@echo off
chcp 65001 >nul
echo ========================================
echo 上传文件到Linux服务器
echo ========================================
echo.

set /p SERVER_IP="请输入服务器IP地址: "
set /p USERNAME="请输入用户名 (默认: root): "
if "%USERNAME%"=="" set USERNAME=root

echo.
echo 正在上传文件到服务器...
echo 目标: %USERNAME%@%SERVER_IP%:/var/www/html/
echo.

scp -r * %USERNAME%@%SERVER_IP%:/var/www/html/

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 上传成功！
    echo ========================================
    echo.
    echo 请在浏览器访问: http://%SERVER_IP%
    echo.
) else (
    echo.
    echo ========================================
    echo 上传失败！
    echo ========================================
    echo.
    echo 可能的原因:
    echo 1. 服务器IP地址错误
    echo 2. 用户名或密码错误
    echo 3. 服务器未安装SSH服务
    echo 4. 网络连接问题
    echo.
    echo 建议使用FTP工具（如FileZilla）上传文件
    echo.
)

pause

