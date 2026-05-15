#!/bin/bash
export AGENT_BROWSER_SOCKET_DIR=/tmp/ab-sockets
exec node /opt/homebrew/Cellar/node/26.0.0/lib/node_modules/agent-browser/bin/agent-browser.js --session logistics-df "$@"