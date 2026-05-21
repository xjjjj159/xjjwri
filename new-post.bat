@echo off
REM 新建日记脚本 — 用法: new-post.bat "日记标题"

if "%~1"=="" (
  echo 用法: new-post.bat "日记标题"
  exit /b 1
)

for /f "tokens=1-3 delims=/- " %%a in ('date /t') do set YYYY=%%a&set MM=%%b&set DD=%%c
set DATE=%YYYY%-%MM%-%DD%
set TITLE=%~1
set SLUG=%TITLE: =-%

set FILE=_posts\%DATE%-%SLUG%.md

(
echo ---
echo title: "%TITLE%"
echo date: %DATE% 12:00:00
echo ---
echo.
) > "%FILE%"

echo 已创建: %FILE%
echo 用文本编辑器打开写完内容后保存，然后双击 push.bat 即可发布
