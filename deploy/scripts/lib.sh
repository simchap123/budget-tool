#!/usr/bin/env bash
# Shared helpers for deploy scripts. Source this: `. "$(dirname "$0")/lib.sh"`
set -euo pipefail

# Repo root = two levels up from deploy/scripts/
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Load .env (DOMAIN, DIGITALOCEAN_API_TOKEN, ...) if present.
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_ROOT/.env"
  set +a
fi

die() { echo "ERROR: $*" >&2; exit 1; }
info() { echo ">> $*"; }

require_domain() {
  [ -n "${DOMAIN:-}" ] || die "DOMAIN is not set. Add DOMAIN=yourdomain.com to .env"
}

require_do_token() {
  [ -n "${DIGITALOCEAN_API_TOKEN:-}" ] || die "DIGITALOCEAN_API_TOKEN is not set in .env"
}

# Public IPv4 of this droplet (from DO metadata, falls back to icanhazip).
droplet_ip() {
  curl -s --max-time 3 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null \
    || curl -s --max-time 5 https://ipv4.icanhazip.com
}

# do_api METHOD PATH [json-body]  — DigitalOcean API (droplet/compute management)
do_api() {
  local method="$1" path="$2" body="${3:-}"
  require_do_token
  if [ -n "$body" ]; then
    curl -s -X "$method" \
      -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body" "https://api.digitalocean.com/v2$path"
  else
    curl -s -X "$method" \
      -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
      "https://api.digitalocean.com/v2$path"
  fi
}

# --- Cloudflare (DNS for $DOMAIN) --------------------------------------------
require_cf() {
  [ -n "${CLOUDFLARE_API_TOKEN:-}" ] || die "CLOUDFLARE_API_TOKEN not set in .env"
  [ -n "${CLOUDFLARE_ZONE_ID:-}" ]  || die "CLOUDFLARE_ZONE_ID not set in .env"
}

# cf_api METHOD PATH [json-body]  — Cloudflare API v4 (path is appended to /client/v4)
cf_api() {
  local method="$1" path="$2" body="${3:-}"
  require_cf
  if [ -n "$body" ]; then
    curl -s -X "$method" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body" "https://api.cloudflare.com/client/v4$path"
  else
    curl -s -X "$method" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4$path"
  fi
}
