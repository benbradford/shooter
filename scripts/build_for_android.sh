#!/bin/bash
set -e
cd "$(dirname "$0")/.."
npm run build
rm -rf android/app/src/main/assets/public/*
cp -r dist/* android/app/src/main/assets/public/
echo "✅ Android assets updated. Rebuild in Android Studio."
