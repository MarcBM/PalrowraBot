@echo off

call H:\steamcmd\steamcmd.exe +login anonymous +app_update 2394010 +quit

start H:\steamcmd\steamapps\common\PalServer\PalServer.exe -players=8 -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS -NumberOfWorkerThreadsServer=16

curl -X POST -d "token=%1&message=Server is up!" http://localhost:3000/startUpdate