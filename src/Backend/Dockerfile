# syntax=docker/dockerfile:1
# Faction Bikeworks API (Express 5 + Sequelize/MySQL).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Production deps only. Puppeteer is a devDependency (test report PDF), so no Chromium is pulled.
# Optional extra CA bundle for networks with TLS inspection (build secret, never stored in a layer).
RUN --mount=type=secret,id=npm_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT_SERVER=8000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .
# Uploaded product/banner/brand images are written here at runtime; compose mounts a volume
# on it (seeded from the image's bundled images on first start).
RUN mkdir -p images && chown -R node:node images
USER node
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT_SERVER}/api/health" >/dev/null || exit 1
CMD ["node", "server.js"]
