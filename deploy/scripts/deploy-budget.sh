#!/usr/bin/env bash
# Build the Budget Tool frontend and publish it to /var/www/budget on the droplet.
# Run on the droplet after `git pull`. Assumes PocketBase already runs on :8090.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

info "Building frontend..."
cd "$REPO_ROOT/frontend"
npm ci
npm run build

info "Publishing to /var/www/budget ..."
install -d /var/www/budget
rsync -a --delete "$REPO_ROOT/frontend/dist/" /var/www/budget/

info "Budget Tool deployed. https://budget.${DOMAIN:-<your-domain>}"
