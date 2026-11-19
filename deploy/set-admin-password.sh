#!/usr/bin/env bash
# Set a new password for an account (default: the seeded "Admin") on a running stack.
#   cd /opt/faction && bash set-admin-password.sh [username]
# Prompts for the password; it never appears in shell history or process lists.
set -euo pipefail

user="${1:-Admin}"
[[ "$user" =~ ^[A-Za-z0-9._@-]+$ ]] || { echo "invalid username" >&2; exit 1; }

read -rsp "New password for $user: " pw; echo
read -rsp "Repeat: " pw2; echo
[ "$pw" = "$pw2" ] || { echo "passwords don't match" >&2; exit 1; }
[ "${#pw}" -ge 10 ] || { echo "use at least 10 characters" >&2; exit 1; }

compose() { docker compose --env-file .env "$@"; }

# Hash with the API's own bcrypt so the format matches what login checks.
hash="$(compose exec -T -e NEWPW="$pw" backend node -e \
  'import("bcrypt").then((b) => b.default.hash(process.env.NEWPW, 10)).then((h) => process.stdout.write(h))')"
[[ "$hash" == \$2* ]] || { echo "hashing failed" >&2; exit 1; }

# The hash and username go in as environment variables, not into the SQL text.
# shellcheck disable=SC2016 # expanded by the shell inside the db container, on purpose
compose exec -T -e H="$hash" -e U="$user" db sh -c \
  'mysql -N -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "UPDATE account SET password=\"$H\" WHERE username=\"$U\"; SELECT ROW_COUNT();" 2>/dev/null' \
  | grep -qx 1 || { echo "no account named $user" >&2; exit 1; }

echo "Password updated for $user."
