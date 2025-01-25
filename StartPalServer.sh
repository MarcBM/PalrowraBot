#!/bin/bash

steamcmd +login anonymous +app_update 2394010 +quit

gnome-terminal -- bash /home/marc/.steam/steam/steamapps/common/PalServer/PalServer.sh -players=8 -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS -NumberOfWorkerThreads=16 &

curl -X POST -d "token=$1&message=Server is up!" http://localhost:3000/startUpdate