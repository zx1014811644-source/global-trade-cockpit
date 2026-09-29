#!/bin/zsh
cd "${0:A:h}"
if ! command -v npm >/dev/null 2>&1; then
  export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
fi
npm run dev -- --port 5173 --strictPort
