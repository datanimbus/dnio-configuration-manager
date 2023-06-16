#!/bin/bash

pm2 stop 06-cm || true
pm2 start build/pm2_local.yaml
