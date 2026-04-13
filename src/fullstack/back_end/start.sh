#!/bin/sh
set -eu

echo "Initializing database schema..."
node db/init.js

echo "Starting application server..."
exec node app.js
