#!/usr/bin/env bash
# Runs on the VM (called by the CI/CD workflow over SSH):
#   bash deploy.sh <dir> <image-prefix> <tag> <ghcr-user>   (GHCR token on stdin)
# Pulls the tagged app image, restarts the stack, waits for health, and rolls back on failure.
set -euo pipefail

die() { echo "deploy: $*" >&2; exit 1; }

[ $# -eq 4 ] || die "usage: $0 <dir> <image-prefix> <tag> <ghcr-user>"
dir="$1"; prefix="$2"; tag="$3"; user="$4"
[[ "$tag" =~ ^[A-Za-z0-9._-]+$ ]] || die "invalid tag: $tag"
[[ "$prefix" =~ ^[a-z0-9./:_-]+$ ]] || die "invalid image prefix: $prefix"

cd "$dir" || die "cannot cd to $dir"
[ -f .env ] || die "$dir/.env is missing (see docs/deploy-vm-setup.md)"

# Registry login from stdin (token is only valid while the workflow runs). Skip if no token was piped.
if [ ! -t 0 ]; then
  token="$(cat)"
  if [ -n "$token" ]; then
    printf '%s' "$token" | docker login ghcr.io -u "$user" --password-stdin >/dev/null
  fi
fi

compose() { IMAGE_PREFIX="$prefix" IMAGE_TAG="$1" docker compose --env-file .env "${@:2}"; }

previous="$(cat .deployed-tag 2>/dev/null || true)"

echo "Pulling $prefix-backend:$tag"
compose "$tag" pull backend

echo "Starting $tag"
if compose "$tag" up -d --no-build --remove-orphans --wait --wait-timeout 180; then
  echo "$tag" > .deployed-tag
  echo "$(date -u +%FT%TZ) $tag" >> .deploy-history
  docker image prune -f >/dev/null || true
  echo "Deployed $tag"
else
  echo "Health checks failed for $tag" >&2
  if [ -n "$previous" ] && [ "$previous" != "$tag" ]; then
    echo "Rolling back to $previous" >&2
    compose "$previous" up -d --no-build --remove-orphans --wait --wait-timeout 180 || true
  fi
  exit 1
fi
