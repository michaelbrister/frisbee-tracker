#!/bin/sh
set -e

# Set default values if not passed in
: "${POCKETBASE_DATA_DIR:=/pb_data}"
: "${BACKEND_PORT:=8090}"

# Launch PocketBase using env vars
./pocketbase serve --http="0.0.0.0:${BACKEND_PORT}" --dir="$POCKETBASE_DATA_DIR"
