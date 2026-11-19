# syntax=docker/dockerfile:1
# Faction Bikeworks storefront: Vite build served by nginx, which also proxies the API.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Optional extra CA bundle for networks with TLS inspection (build secret, never stored in a layer).
RUN --mount=type=secret,id=npm_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca npm ci --no-audit --no-fund
COPY . .
# Empty = same origin (/api, /images proxied by nginx below). Override only for a split-origin deploy.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.29-alpine
# Templates in /etc/nginx/templates are rendered with envsubst at start (BACKEND_URL below).
ENV BACKEND_URL=http://backend:8000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
