#!/usr/bin/env bash
# Create/update a Cloudflare A record for a subdomain, pointing at the droplet.
#
# Usage: ./cloudflare-dns.sh <subdomain> [ip] [proxied]
#   <subdomain>  e.g. budget            -> budget.$DOMAIN
#   [ip]         defaults to this droplet's public IP (or pass explicitly off-droplet)
#   [proxied]    true|false  (default: false / DNS-only "grey cloud")
#
# Reads DOMAIN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID from ../../.env
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_domain
require_cf

SUB="${1:?Usage: cloudflare-dns.sh <subdomain> [ip] [proxied]}"
IP="${2:-$(droplet_ip)}"
PROXIED="${3:-false}"
[ -n "$IP" ] || die "Could not determine droplet IP; pass it as the 2nd arg."

FQDN="$SUB.$DOMAIN"
TTL=$([ "$PROXIED" = "true" ] && echo 1 || echo 3600)   # proxied records must use ttl=1 (auto)
BODY="{\"type\":\"A\",\"name\":\"$SUB\",\"content\":\"$IP\",\"ttl\":$TTL,\"proxied\":$PROXIED,\"comment\":\"$SUB app\"}"

info "Ensuring A record: $FQDN -> $IP (proxied=$PROXIED)"
RID=$(cf_api GET "/zones/$CLOUDFLARE_ZONE_ID/dns_records?type=A&name=$FQDN" \
  | python3 -c "import sys,json;r=json.load(sys.stdin).get('result',[]);print(r[0]['id'] if r else '')")

if [ -n "$RID" ]; then
  RESP=$(cf_api PUT "/zones/$CLOUDFLARE_ZONE_ID/dns_records/$RID" "$BODY")
else
  RESP=$(cf_api POST "/zones/$CLOUDFLARE_ZONE_ID/dns_records" "$BODY")
fi

echo "$RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if not d.get('success'):
    print('ERROR:', d.get('errors')); sys.exit(1)
r=d['result']; print('OK:', r['name'],'->',r['content'],'proxied=%s'%r['proxied'])
"
info "Done. $FQDN now points to $IP."
