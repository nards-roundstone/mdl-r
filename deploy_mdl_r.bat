@echo off
echo Deploying MDL-R...
if not exist .git git init
git add .
git commit -m "init" 2>nul
git branch -M main
echo Create repo then: git remote add origin <URL>
echo Then: git push -u origin main
pause
