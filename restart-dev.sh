#!/bin/bash

# Kill all running dev servers
echo "Killing all Vite dev servers..."
pkill -f "vite"

# Clear Vite cache
echo "Clearing Vite cache..."
rm -rf node_modules/.vite

# Start fresh dev server
echo "Starting fresh dev server on default port..."
npm run dev
