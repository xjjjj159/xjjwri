@echo off
REM 一键发布脚本
cd /d C:\Users\27314\diary-blog
git add -A
git commit -m "发布新日记"
git push
echo 已发布！等一分钟后刷新站点即可看到新日记。
pause
