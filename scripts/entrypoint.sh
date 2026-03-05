#!/bin/sh
set -e
cd /app/scripts
npm ci --silent
exec node server.js
