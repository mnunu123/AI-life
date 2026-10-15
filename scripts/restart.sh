#!/usr/bin/env bash
# 로컬 확인용: 3123 포트의 서버를 내리고 새 빌드로 다시 띄운다
fuser -k 3123/tcp >/dev/null 2>&1 || true
sleep 1
nohup npx next start -p 3123 > "${LOG:-/tmp/next.log}" 2>&1 &
for i in $(seq 1 20); do sleep 1; curl -s -o /dev/null http://localhost:3123/ && echo "up" && exit 0; done
echo "failed to start"; exit 1
